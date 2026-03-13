/**
 * game.js — KS名前空間、GameState、アセットローダー、メインループ
 * 読み込み順: 1番目
 * 責務: グローバル名前空間の定義、ゲーム状態管理、アセット管理、メインループ起動
 * 更新: v1.0.1 — エフェクト画像生成追加
 */
"use strict";

/* ========================================
 * KS 名前空間
 * ======================================== */
window.KS = {
    data: {},
    enemies: {},
    blessings: {},
    systems: {},
    nodemap: {},
    ui: {},
    uiScreens: {},
    updateFn: null,
    renderFn: null,

    state: null,

    canvas: null,
    ctx: null,

    assets: {
        images: {},
        loaded: false,
        progress: 0,
        total: 0
    },

    audio: {
        ctx: null,
        initialized: false
    },

    input: {
        pointerX: 0,
        pointerActive: false,
        lastPointerX: 0
    },

    time: {
        now: 0,
        delta: 0,
        lastFrame: 0,
        elapsed: 0,
        frameCount: 0
    }
};

/* ========================================
 * ゲーム状態 Enum
 * ======================================== */
KS.GameStates = Object.freeze({
    LOADING: 'LOADING',
    TITLE: 'TITLE',
    PLAYING: 'PLAYING',
    GAMEOVER: 'GAMEOVER',
    PAUSED: 'PAUSED'
});

/* ========================================
 * GameState クラス
 * ======================================== */
KS.GameState = class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.current = KS.GameStates.LOADING;

        this.player = {
            x: 0,
            y: 0,
            w: 75,
            h: 75,
            stack: [],
            isHappy: false,
            happyTimer: 0,
            facingRight: false
        };

        this.fallingWigs = [];

        this.score = 0;
        this.highScore = 0;

        this.difficultyLevel = 0;
        this.elapsedPlayTime = 0;

        this.comboCount = 0;
        this.comboTimer = 0;

        this.cutIn = {
            active: false,
            timer: 0,
            wigType: null
        };
        this.effects = [];

        this.spawnTimer = 0;
    }

    startGame() {
        var hs = this.highScore;
        this.reset();
        this.highScore = hs;
        this.current = KS.GameStates.PLAYING;

        var d = KS.data;
        this.player.x = (d.CANVAS_W - this.player.w) / 2;
        this.player.y = d.CANVAS_H - d.PLAYER_GROUND_OFFSET;
    }

    clearEffects() {
        this.cutIn.active = false;
        this.cutIn.timer = 0;
        this.effects = [];
    }

    triggerGameOver() {
        if (this.current !== KS.GameStates.PLAYING) return;
        this.current = KS.GameStates.GAMEOVER;
        this.clearEffects();
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try {
                localStorage.setItem('ks_highscore', String(this.highScore));
            } catch (e) {}
        }
    }
};

/* ========================================
 * アセットローダー
 * ======================================== */
KS.AssetLoader = {
    loadImage: function(key, src) {
        return new Promise(function(resolve) {
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                KS.assets.images[key] = img;
                KS.assets.progress++;
                resolve(img);
            };
            img.onerror = function() {
                console.error('[AssetLoader] Failed: ' + key + ' (' + src + ')');
                KS.assets.progress++;
                resolve(null);
            };
            img.src = src;
        });
    },

    loadAll: function(manifest) {
        var entries = Object.entries(manifest);
        KS.assets.total = entries.length;
        KS.assets.progress = 0;

        return Promise.all(
            entries.map(function(entry) {
                return KS.AssetLoader.loadImage(entry[0], entry[1]);
            })
        ).then(function() {
            KS.assets.loaded = true;
        });
    }
};

/* ========================================
 * エフェクト画像生成
 * C-3対策: ctx.filterをゲームループで使わず、
 * 起動時にオフスクリーンCanvasで1回だけ生成してキャッシュ
 * obstacle = アフロにgrayscale+暗く+紫色調
 * bomb = ブロンドを明るく+金色光彩
 * ======================================== */
KS.EffectImageGenerator = {
    generate: function() {
        var d = KS.data;

        /* obstacle: wig_afro を暗い紫に色調変化 */
        var afroImg = KS.assets.images['wig_afro'];
        if (afroImg) {
            KS.assets.images['obstacle'] = KS.EffectImageGenerator._applyFilter(
                afroImg,
                'grayscale(0.6) brightness(0.4) contrast(1.5) sepia(0.8) hue-rotate(240deg) saturate(2)'
            );
        }

        /* bomb: wig_blonde を明るく光らせる */
        var blondeImg = KS.assets.images['wig_blonde'];
        if (blondeImg) {
            KS.assets.images['bomb'] = KS.EffectImageGenerator._applyFilter(
                blondeImg,
                'brightness(1.6) saturate(2) drop-shadow(0 0 6px #ffd700) drop-shadow(0 0 12px #ffaa00)'
            );
        }
    },

    _applyFilter: function(sourceImg, filterStr) {
        var offCanvas = document.createElement('canvas');
        /* 解像度を2倍にしてdrop-shadowの余白を確保 */
        var padding = 20;
        offCanvas.width = sourceImg.naturalWidth + padding * 2;
        offCanvas.height = sourceImg.naturalHeight + padding * 2;
        var offCtx = offCanvas.getContext('2d');

        offCtx.filter = filterStr;
        offCtx.drawImage(sourceImg, padding, padding, sourceImg.naturalWidth, sourceImg.naturalHeight);
        offCtx.filter = 'none';

        /* CanvasをImageに変換してキャッシュ */
        var resultImg = new Image();
        resultImg.src = offCanvas.toDataURL('image/png');
        return resultImg;
    }
};

/* ========================================
 * オーディオ管理
 * ======================================== */
KS.AudioManager = {
    init: function() {
        if (KS.audio.initialized) return Promise.resolve();
        try {
            var AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return Promise.resolve();
            KS.audio.ctx = new AudioCtx();
            if (KS.audio.ctx.state === 'suspended') {
                return KS.audio.ctx.resume().then(function() {
                    KS.audio.initialized = true;
                });
            }
            KS.audio.initialized = true;
            return Promise.resolve();
        } catch (e) {
            console.warn('[AudioManager] Init failed:', e);
            return Promise.resolve();
        }
    },

    playSfx: function(freq, type, duration) {
        if (!KS.audio.initialized) return;
        var actx = KS.audio.ctx;
        if (!actx || actx.state === 'suspended') return;

        type = type || 'sine';
        duration = duration || 0.1;

        try {
            var osc = actx.createOscillator();
            var gain = actx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, actx.currentTime);
            gain.gain.setValueAtTime(0.1, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + duration);
            osc.connect(gain);
            gain.connect(actx.destination);
            osc.start();
            osc.stop(actx.currentTime + duration);
            osc.onended = function() {
                osc.disconnect();
                gain.disconnect();
            };
        } catch (e) {}
    }
};

/* ========================================
 * Canvas管理
 * ======================================== */
KS.CanvasManager = {
    init: function() {
        KS.canvas = document.getElementById('gameCanvas');
        KS.ctx = KS.canvas.getContext('2d');
    },

    applyLogicalSize: function() {
        KS.canvas.width = KS.data.CANVAS_W;
        KS.canvas.height = KS.data.CANVAS_H;
        KS.CanvasManager.resize();
    },

    resize: function() {
        var canvas = KS.canvas;
        if (!canvas) return;

        var wrapperW = window.innerWidth;
        var wrapperH = window.innerHeight;
        var canvasRatio = KS.data.CANVAS_W / KS.data.CANVAS_H;
        var windowRatio = wrapperW / wrapperH;

        var displayW, displayH;
        if (windowRatio > canvasRatio) {
            displayH = wrapperH;
            displayW = displayH * canvasRatio;
        } else {
            displayW = wrapperW;
            displayH = displayW / canvasRatio;
        }

        canvas.style.width = displayW + 'px';
        canvas.style.height = displayH + 'px';
    },

    clientToLogical: function(clientX, clientY) {
        var rect = KS.canvas.getBoundingClientRect();
        var scaleX = KS.data.CANVAS_W / rect.width;
        var scaleY = KS.data.CANVAS_H / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }
};

/* ========================================
 * 入力管理
 * ======================================== */
KS.InputManager = {
    init: function() {
        document.addEventListener('pointermove', KS.InputManager._onPointerMove);
        document.addEventListener('pointerdown', KS.InputManager._onPointerDown);
        document.addEventListener('pointerup', KS.InputManager._onPointerUp);
        window.addEventListener('resize', KS.CanvasManager.resize);
        KS.canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    },

    _onPointerMove: function(e) {
        if (!KS.canvas) return;
        var logical = KS.CanvasManager.clientToLogical(e.clientX, e.clientY);
        KS.input.lastPointerX = KS.input.pointerX;
        KS.input.pointerX = logical.x;
    },

    _onPointerDown: function(e) {
        KS.input.pointerActive = true;
        KS.InputManager._onPointerMove(e);
    },

    _onPointerUp: function(e) {
        KS.input.pointerActive = false;
    }
};

/* ========================================
 * メインループ
 * ======================================== */
KS.MainLoop = {
    _rafId: null,

    start: function() {
        KS.time.lastFrame = performance.now();
        KS.MainLoop._tick(performance.now());
    },

    _tick: function(timestamp) {
        KS.time.now = timestamp;
        KS.time.delta = timestamp - KS.time.lastFrame;
        KS.time.lastFrame = timestamp;
        KS.time.frameCount++;

        if (KS.state && KS.state.current === KS.GameStates.PLAYING) {
            KS.time.elapsed += KS.time.delta;
        }

        if (KS.updateFn) KS.updateFn();
        if (KS.renderFn) KS.renderFn();

        KS.MainLoop._rafId = requestAnimationFrame(KS.MainLoop._tick);
    },

    stop: function() {
        if (KS.MainLoop._rafId) {
            cancelAnimationFrame(KS.MainLoop._rafId);
            KS.MainLoop._rafId = null;
        }
    }
};

/* ========================================
 * ブートシーケンス
 * ======================================== */
KS.boot = function() {
    KS.CanvasManager.init();

    KS.state = new KS.GameState();

    try {
        var saved = localStorage.getItem('ks_highscore');
        if (saved) KS.state.highScore = parseInt(saved, 10) || 0;
    } catch (e) {}

    KS.InputManager.init();

    if (KS.data.IMAGE_MANIFEST) {
        KS.AssetLoader.loadAll(KS.data.IMAGE_MANIFEST).then(function() {
            /* アセットロード完了後にエフェクト画像を生成 */
            KS.EffectImageGenerator.generate();
            KS.state.current = KS.GameStates.TITLE;
        });
    } else {
        KS.state.current = KS.GameStates.TITLE;
    }

    KS.MainLoop.start();
};
