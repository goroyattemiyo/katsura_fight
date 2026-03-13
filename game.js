/**
 * game.js — KS名前空間、GameState、アセットローダー、メインループ
 * 読み込み順: 1番目
 * v1.0.2 — BUG-2: boot内でapplyLogicalSize, BUG-4: Canvas保持,
 *           BUG-3: AudioManager.initSync追加
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
        KS.blessings.stopBGM();
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
 * BUG-4修正: Canvasオブジェクトをそのまま保持（Imageに変換しない）
 * DP-1結論: MANIFESTでロード済みのキーはスキップ
 * ======================================== */
KS.EffectImageGenerator = {
    generate: function() {
        /* obstacle: MANIFESTに専用画像があればスキップ */
        if (!KS.assets.images['obstacle']) {
            var afroImg = KS.assets.images['wig_afro'];
            if (afroImg) {
                KS.assets.images['obstacle'] = KS.EffectImageGenerator._applyFilter(
                    afroImg,
                    'grayscale(0.6) brightness(0.4) contrast(1.5) sepia(0.8) hue-rotate(240deg) saturate(2)'
                );
            }
        }

        /* bomb: 専用画像なし。常にエフェクト生成 */
        if (!KS.assets.images['bomb']) {
            var blondeImg = KS.assets.images['wig_blonde'];
            if (blondeImg) {
                KS.assets.images['bomb'] = KS.EffectImageGenerator._applyFilter(
                    blondeImg,
                    'brightness(1.6) saturate(2) drop-shadow(0 0 6px #ffd700) drop-shadow(0 0 12px #ffaa00)'
                );
            }
        }
    },

    /* BUG-4修正: Canvasオブジェクトを直接返す（drawImageで即時利用可能） */
    _applyFilter: function(sourceImg, filterStr) {
        var padding = 20;
        var offCanvas = document.createElement('canvas');
        offCanvas.width = sourceImg.naturalWidth + padding * 2;
        offCanvas.height = sourceImg.naturalHeight + padding * 2;
        var offCtx = offCanvas.getContext('2d');

        offCtx.filter = filterStr;
        offCtx.drawImage(sourceImg, padding, padding, sourceImg.naturalWidth, sourceImg.naturalHeight);
        offCtx.filter = 'none';

        /* Imageに変換せず、Canvasをそのまま返す */
        return offCanvas;
    }
};

/* ========================================
 * オーディオ管理
 * BUG-3修正: initSync（同期版）を追加。DP-3結論反映
 * ======================================== */
KS.AudioManager = {
    /**
     * initSync — ユーザージェスチャー内で同期的に呼ぶ版
     * iOS Safari のジェスチャーコンテキストを失わないために、
     * await せずに AudioContext 生成と resume() を発火する
     */
    initSync: function() {
        if (KS.audio.initialized) return;
        try {
            var AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            if (!KS.audio.ctx) {
                KS.audio.ctx = new AudioCtx();
            }
            if (KS.audio.ctx.state === 'suspended') {
                /* resume() の Promise は取得するが await しない */
                KS.audio.ctx.resume().then(function() {
                    KS.audio.initialized = true;
                });
            } else {
                KS.audio.initialized = true;
            }
        } catch (e) {
            console.warn('[AudioManager] initSync failed:', e);
        }
    },

    /**
     * init — 非同期版（boot等のタイミングで使う）
     */
    init: function() {
        if (KS.audio.initialized) return Promise.resolve();
        try {
            var AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return Promise.resolve();
            if (!KS.audio.ctx) {
                KS.audio.ctx = new AudioCtx();
            }
            if (KS.audio.ctx.state === 'suspended') {
                return KS.audio.ctx.resume().then(function() {
                    KS.audio.initialized = true;
                });
            }
            KS.audio.initialized = true;
            return Promise.resolve();
        } catch (e) {
            console.warn('[AudioManager] init failed:', e);
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
        if (!KS.canvas) return;
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
 * BUG-2修正: Canvas初期化→applyLogicalSizeの順序を保証
 * ======================================== */
KS.boot = function() {
    /* 1. Canvas初期化（DOMからcanvas要素を取得） */
    KS.CanvasManager.init();

    /* 2. Canvas論理サイズ適用（BUG-2修正: data.jsからここに移動） */
    KS.CanvasManager.applyLogicalSize();

    /* 3. GameState生成 */
    KS.state = new KS.GameState();

    /* 4. ハイスコア読み込み */
    try {
        var saved = localStorage.getItem('ks_highscore');
        if (saved) KS.state.highScore = parseInt(saved, 10) || 0;
    } catch (e) {}

    /* 5. 入力初期化 */
    KS.InputManager.init();

    /* 6. アセット読み込み */
    if (KS.data.IMAGE_MANIFEST) {
        KS.AssetLoader.loadAll(KS.data.IMAGE_MANIFEST).then(function() {
            /* 7. エフェクト画像生成（DP-1: 専用画像優先、なければ生成） */
            KS.EffectImageGenerator.generate();
            /* 8. TITLE画面へ */
            KS.state.current = KS.GameStates.TITLE;
        });
    } else {
        KS.state.current = KS.GameStates.TITLE;
    }

    /* 9. メインループ開始（ローディング画面を表示するため、ロード完了前に開始） */
    KS.MainLoop.start();
};
