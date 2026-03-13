/**
 * game.js — KS名前空間、GameState、アセットローダー、メインループ
 * 読み込み順: 1番目
 * 責務: グローバル名前空間の定義、ゲーム状態管理、アセット管理、メインループ起動
 * サイズ目安: ~8KB
 */
"use strict";

/* ========================================
 * KS 名前空間
 * ======================================== */
window.KS = {
    /* サブオブジェクト（各ファイルが埋める） */
    data: {},
    enemies: {},
    blessings: {},
    systems: {},
    nodemap: {},
    ui: {},
    uiScreens: {},
    updateFn: null,
    renderFn: null,

    /* ゲーム状態 */
    state: null,

    /* Canvas 参照 */
    canvas: null,
    ctx: null,

    /* アセット */
    assets: {
        images: {},
        loaded: false,
        progress: 0,
        total: 0
    },

    /* オーディオ */
    audio: {
        ctx: null,
        initialized: false
    },

    /* 入力 */
    input: {
        pointerX: 0,
        pointerActive: false,
        lastPointerX: 0
    },

    /* 時間管理 */
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
 * A-3対策: 状態遷移を厳密に管理
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
 * A-1対策: reset()で全プロパティを初期化
 * ======================================== */
KS.GameState = class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        /* 画面状態 */
        this.current = KS.GameStates.LOADING;

        /* プレイヤー */
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

        /* 落下物 */
        this.fallingWigs = [];

        /* スコア */
        this.score = 0;
        this.highScore = 0;

        /* 難易度 */
        this.difficultyLevel = 0;
        this.elapsedPlayTime = 0;

        /* コンボ */
        this.comboCount = 0;
        this.comboTimer = 0;

        /* 演出 */
        this.cutIn = {
            active: false,
            timer: 0,
            wigType: null
        };
        this.effects = [];

        /* スポーン制御 */
        this.spawnTimer = 0;
    }

    /* A-1, C-2対策: ゲーム開始時のリセット */
    startGame() {
        const hs = this.highScore;
        this.reset();
        this.highScore = hs;
        this.current = KS.GameStates.PLAYING;

        /* プレイヤー初期位置（data.jsのCANVAS定数を参照） */
        const d = KS.data;
        this.player.x = (d.CANVAS_W - this.player.w) / 2;
        this.player.y = d.CANVAS_H - d.PLAYER_GROUND_OFFSET;
    }

    /* C-2対策: 全演出クリア */
    clearEffects() {
        this.cutIn.active = false;
        this.cutIn.timer = 0;
        this.effects = [];
    }

    /* ゲームオーバー遷移（A-3対策: 1回だけ発火） */
    triggerGameOver() {
        if (this.current !== KS.GameStates.PLAYING) return;
        this.current = KS.GameStates.GAMEOVER;
        this.clearEffects();
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try {
                localStorage.setItem('ks_highscore', String(this.highScore));
            } catch (e) { /* localStorage使用不可環境 */ }
        }
    }
};

/* ========================================
 * アセットローダー
 * C-1対策: Promise.all + プログレス管理
 * ======================================== */
KS.AssetLoader = {
    loadImage(key, src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                KS.assets.images[key] = img;
                KS.assets.progress++;
                resolve(img);
            };
            img.onerror = () => {
                console.error('[AssetLoader] Failed to load: ' + key + ' (' + src + ')');
                KS.assets.progress++;
                resolve(null); /* エラーでも進行を止めない */
            };
            img.src = src;
        });
    },

    async loadAll(manifest) {
        const entries = Object.entries(manifest);
        KS.assets.total = entries.length;
        KS.assets.progress = 0;

        await Promise.all(
            entries.map(([key, src]) => KS.AssetLoader.loadImage(key, src))
        );

        KS.assets.loaded = true;
    }
};

/* ========================================
 * オーディオ管理
 * D-1対策: async resume
 * D-2対策: disconnect管理
 * ======================================== */
KS.AudioManager = {
    async init() {
        if (KS.audio.initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            KS.audio.ctx = new AudioCtx();
            if (KS.audio.ctx.state === 'suspended') {
                await KS.audio.ctx.resume();
            }
            KS.audio.initialized = true;
        } catch (e) {
            console.warn('[AudioManager] Init failed:', e);
        }
    },

    playSfx(freq, type, duration) {
        if (!KS.audio.initialized) return;
        const actx = KS.audio.ctx;
        if (!actx || actx.state === 'suspended') return;

        type = type || 'sine';
        duration = duration || 0.1;

        try {
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, actx.currentTime);
            gain.gain.setValueAtTime(0.1, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + duration);
            osc.connect(gain);
            gain.connect(actx.destination);
            osc.start();
            osc.stop(actx.currentTime + duration);

            /* D-2対策: 終了後にdisconnect */
            osc.onended = function() {
                osc.disconnect();
                gain.disconnect();
            };
        } catch (e) {
            /* 音声再生失敗は握りつぶす（ゲーム進行に影響させない） */
        }
    }
};

/* ========================================
 * Canvas 初期化 + レスポンシブ
 * B-2対策: 論理サイズ固定 + CSSスケーリング
 * ======================================== */
KS.CanvasManager = {
    init() {
        KS.canvas = document.getElementById('gameCanvas');
        KS.ctx = KS.canvas.getContext('2d');

        /* 論理サイズは data.js で定義される（まだ読まれていないので仮値） */
        /* data.js 読み込み後に resize が呼ばれる */
    },

    applyLogicalSize() {
        KS.canvas.width = KS.data.CANVAS_W;
        KS.canvas.height = KS.data.CANVAS_H;
        KS.CanvasManager.resize();
    },

    resize() {
        const canvas = KS.canvas;
        if (!canvas) return;

        const wrapperW = window.innerWidth;
        const wrapperH = window.innerHeight;
        const canvasRatio = KS.data.CANVAS_W / KS.data.CANVAS_H;
        const windowRatio = wrapperW / wrapperH;

        let displayW, displayH;
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

    /* B-2対策: ポインタ座標を論理座標に変換 */
    clientToLogical(clientX, clientY) {
        const rect = KS.canvas.getBoundingClientRect();
        const scaleX = KS.data.CANVAS_W / rect.width;
        const scaleY = KS.data.CANVAS_H / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }
};

/* ========================================
 * 入力管理
 * E-1対策: Pointer Events統一
 * E-2対策: documentレベルリスナー
 * ======================================== */
KS.InputManager = {
    init() {
        /* Pointer Events API（E-1対策: タッチ/マウス統一） */
        document.addEventListener('pointermove', KS.InputManager._onPointerMove);
        document.addEventListener('pointerdown', KS.InputManager._onPointerDown);
        document.addEventListener('pointerup', KS.InputManager._onPointerUp);

        /* レスポンシブ */
        window.addEventListener('resize', KS.CanvasManager.resize);

        /* コンテキストメニュー抑制（モバイル長押し対策） */
        KS.canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    },

    _onPointerMove(e) {
        if (!KS.canvas) return;
        const logical = KS.CanvasManager.clientToLogical(e.clientX, e.clientY);
        KS.input.lastPointerX = KS.input.pointerX;
        KS.input.pointerX = logical.x;
    },

    _onPointerDown(e) {
        KS.input.pointerActive = true;
        KS.InputManager._onPointerMove(e);
    },

    _onPointerUp(e) {
        KS.input.pointerActive = false;
    }
};

/* ========================================
 * メインループ
 * ======================================== */
KS.MainLoop = {
    _rafId: null,

    start() {
        KS.time.lastFrame = performance.now();
        KS.MainLoop._tick(performance.now());
    },

    _tick(timestamp) {
        KS.time.now = timestamp;
        KS.time.delta = timestamp - KS.time.lastFrame;
        KS.time.lastFrame = timestamp;
        KS.time.frameCount++;

        /* PLAYING状態の経過時間カウント */
        if (KS.state && KS.state.current === KS.GameStates.PLAYING) {
            KS.time.elapsed += KS.time.delta;
        }

        /* update と render は各ファイルで登録される */
        if (KS.updateFn) KS.updateFn();
        if (KS.renderFn) KS.renderFn();

        KS.MainLoop._rafId = requestAnimationFrame(KS.MainLoop._tick);
    },

    stop() {
        if (KS.MainLoop._rafId) {
            cancelAnimationFrame(KS.MainLoop._rafId);
            KS.MainLoop._rafId = null;
        }
    }
};

/* ========================================
 * ブートシーケンス
 * ======================================== */
KS.boot = async function() {
    /* 1. Canvas初期化 */
    KS.CanvasManager.init();

    /* 2. data.js が読み込まれた後にCanvas論理サイズを適用
     *    （data.jsの末尾でKS.CanvasManager.applyLogicalSize()を呼ぶ） */

    /* 3. GameState生成 */
    KS.state = new KS.GameState();

    /* 4. ハイスコア読み込み */
    try {
        const saved = localStorage.getItem('ks_highscore');
        if (saved) KS.state.highScore = parseInt(saved, 10) || 0;
    } catch (e) { /* localStorage使用不可 */ }

    /* 5. 入力初期化 */
    KS.InputManager.init();

    /* 6. アセット読み込み（data.jsのIMAGE_MANIFEST参照） */
    if (KS.data.IMAGE_MANIFEST) {
        await KS.AssetLoader.loadAll(KS.data.IMAGE_MANIFEST);
    }

    /* 7. TITLE画面へ遷移 */
    KS.state.current = KS.GameStates.TITLE;

    /* 8. メインループ開始 */
    KS.MainLoop.start();
};

/* render.js（最後に読み込まれるファイル）の末尾でKS.boot()を呼ぶ */
