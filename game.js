/**
 * game.js v1.1.2 — KS名前空間、GameState、アセット、オーディオ、メインループ
 * 読み込み順: 1番目
 * カートゥーンSE強化、ゲームオーバー吹き飛ばし修正
 */
"use strict";

window.KS = {
    data: {}, enemies: {}, blessings: {}, systems: {},
    nodemap: {}, ui: {}, uiScreens: {},
    updateFn: null, renderFn: null,
    state: null, canvas: null, ctx: null,
    assets: { images: {}, loaded: false, progress: 0, total: 0 },
    audio: { ctx: null, initialized: false, activeNodes: 0, MAX_NODES: 12 },
    input: { pointerX: 0, pointerActive: false, lastPointerX: 0 },
    time: { now: 0, delta: 0, lastFrame: 0, elapsed: 0, frameCount: 0 }
};

KS.GameStates = Object.freeze({
    LOADING: 'LOADING', TITLE: 'TITLE', PLAYING: 'PLAYING',
    GAMEOVER: 'GAMEOVER', GAMEOVER_ANIM: 'GAMEOVER_ANIM', PAUSED: 'PAUSED'
});

/* ========== GameState ========== */
KS.GameState = class GameState {
    constructor() { this.reset(); }

    reset() {
        this.current = KS.GameStates.LOADING;
        this.player = {
            x: 0, y: 0, w: 90, h: 90,
            stack: [], isHappy: false, happyTimer: 0, facingRight: false
        };
        this.fallingWigs = [];
        this.score = 0;
        this.highScore = 0;
        this.difficultyLevel = 0;
        this.elapsedPlayTime = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.cutIn = { active: false, timer: 0, wigType: null };
        this.effects = [];
        this.particles = [];
        this.floatingTexts = [];
        this.screenShake = { x: 0, y: 0, timer: 0, intensity: 0 };
        this.bgWigs = [];
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
        this.floatingTexts = [];
        /* particles, bgWigs はクリアしない（ゲームオーバー演出で使用中） */
    }

    triggerGameOver() {
        if (this.current !== KS.GameStates.PLAYING) return;
        this.current = KS.GameStates.GAMEOVER_ANIM;
        this.gameOverAnimTimer = 150; /* 約2.5秒 @60fps */
        KS.blessings.stopBGM();
        this.clearEffects();
        /* カツラ吹き飛ばし: スタックアイテム自体に物理パラメータを付与 */
        var stack = this.player.stack;
        var d = KS.data;
        for (var i = 0; i < stack.length; i++) {
            var baseX = this.player.x + (this.player.w - d.WIG_STACK_W) / 2;
            var baseY = this.player.y + d.PLAYER_HEAD_TOP_OFFSET - (i + 1) * d.STACK_OFFSET;
            stack[i].exploding = true;
            stack[i].ex = baseX;
            stack[i].ey = baseY;
            stack[i].evx = (Math.random() - 0.5) * 20;
            stack[i].evy = -(Math.random() * 8 + 4 + i * 2);
            stack[i].erot = 0;
            stack[i].erotSpeed = (Math.random() - 0.5) * 0.5;
            stack[i].egravity = 0.4;
            stack[i].ealpha = 1.0;
        }
        /* 追加パーティクル（キラキラ） */
        if (KS.systems.fx) {
            KS.systems.fx.spawnParticles(
                this.player.x + this.player.w / 2,
                this.player.y - stack.length * d.STACK_OFFSET / 2,
                20, 'match'
            );
        }
        KS.AudioManager.playSfxGameOver();
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try { localStorage.setItem('ks_highscore', String(this.highScore)); } catch (e) {}
        }
    }
};

/* ========== AssetLoader ========== */
KS.AssetLoader = {
    loadImage: function(key, src) {
        return new Promise(function(resolve) {
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() { KS.assets.images[key] = img; KS.assets.progress++; resolve(img); };
            img.onerror = function() { console.error('[Asset] Failed: ' + key); KS.assets.progress++; resolve(null); };
            img.src = src;
        });
    },
    loadAll: function(manifest) {
        var entries = Object.entries(manifest);
        KS.assets.total = entries.length;
        KS.assets.progress = 0;
        return Promise.all(entries.map(function(e) { return KS.AssetLoader.loadImage(e[0], e[1]); }))
            .then(function() { KS.assets.loaded = true; });
    }
};

/* ========== EffectImageGenerator ========== */
KS.EffectImageGenerator = {
    generate: function() {
        if (!KS.assets.images['obstacle']) {
            var afro = KS.assets.images['wig_afro'];
            if (afro) KS.assets.images['obstacle'] = this._applyFilter(afro,
                'grayscale(0.6) brightness(0.4) contrast(1.5) sepia(0.8) hue-rotate(240deg) saturate(2)');
        }
        if (!KS.assets.images['bomb']) {
            var blonde = KS.assets.images['wig_blonde'];
            if (blonde) KS.assets.images['bomb'] = this._applyFilter(blonde,
                'brightness(1.6) saturate(2) drop-shadow(0 0 6px #ffd700) drop-shadow(0 0 12px #ffaa00)');
        }
    },
    _applyFilter: function(src, filter) {
        var pad = 20;
        var c = document.createElement('canvas');
        c.width = src.naturalWidth + pad * 2;
        c.height = src.naturalHeight + pad * 2;
        var cx = c.getContext('2d');
        cx.filter = filter;
        cx.drawImage(src, pad, pad, src.naturalWidth, src.naturalHeight);
        return c;
    }
};

/* ==========================================================
 * AudioManager — カートゥーンSE（Council v1.1.2 決定）
 * 同時発音ガード付き（MAX_NODES: 12）
 * ========================================================== */
KS.AudioManager = {
    initSync: function() {
        if (KS.audio.initialized) return;
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            if (!KS.audio.ctx) KS.audio.ctx = new AC();
            if (KS.audio.ctx.state === 'suspended') {
                KS.audio.ctx.resume();
            }
            /* モバイル対応: ジェスチャーコンテキスト内で呼ばれるため
               resume()発行直後に楽観的にtrue設定。
               ブラウザはジェスチャー内のresumeを即座に許可する。 */
            KS.audio.initialized = true;
        } catch (e) {}
    },
    init: function() {
        if (KS.audio.initialized) return Promise.resolve();
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return Promise.resolve();
            if (!KS.audio.ctx) KS.audio.ctx = new AC();
            if (KS.audio.ctx.state === 'suspended') {
                return KS.audio.ctx.resume().then(function() { KS.audio.initialized = true; });
            }
            KS.audio.initialized = true;
            return Promise.resolve();
        } catch (e) { return Promise.resolve(); }
    },

    _canPlay: function() {
        if (!KS.audio.initialized || !KS.audio.ctx) return false;
        if (KS.audio.activeNodes >= KS.audio.MAX_NODES) return false;
        /* モバイル: resume直後はまだsuspendedの場合がある。再度resumeを試行 */
        if (KS.audio.ctx.state === 'suspended') {
            try { KS.audio.ctx.resume(); } catch(e) {}
        }
        return true;
    },
    _track: function(osc) {
        KS.audio.activeNodes++;
        osc.onended = function() {
            KS.audio.activeNodes = Math.max(0, KS.audio.activeNodes - 1);
            try { osc.disconnect(); } catch(e) {}
        };
    },

    /* ノイズバッファ生成（爆発・破裂用） */
    _createNoise: function(duration) {
        var actx = KS.audio.ctx;
        var len = actx.sampleRate * duration;
        var buf = actx.createBuffer(1, len, actx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        return buf;
    },

    playSfx: function(freq, type, duration) {
        if (!this._canPlay()) return;
        var actx = KS.audio.ctx; var t = actx.currentTime;
        try {
            var o = actx.createOscillator(); var g = actx.createGain();
            o.type = type || 'sine';
            o.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.12, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + (duration || 0.1));
            o.connect(g); g.connect(actx.destination);
            o.start(); o.stop(t + (duration || 0.1));
            this._track(o);
        } catch (e) {}
    },

    /* キャッチ: バウンス「ポコッ」 */
    playSfxCatch: function() {
        if (!this._canPlay()) return;
        var actx = KS.audio.ctx; var t = actx.currentTime;
        try {
            var o = actx.createOscillator(); var g = actx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(600, t);
            o.frequency.exponentialRampToValueAtTime(1200, t + 0.03);
            o.frequency.exponentialRampToValueAtTime(400, t + 0.08);
            o.frequency.exponentialRampToValueAtTime(700, t + 0.12);
            g.gain.setValueAtTime(0.18, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            o.connect(g); g.connect(actx.destination);
            o.start(); o.stop(t + 0.15);
            this._track(o);
        } catch (e) {}
    },

    /* マッチ: 華やかアルペジオ + キラキラ */
    playSfxMatch: function(comboCount) {
        if (!this._canPlay()) return;
        var actx = KS.audio.ctx; var t = actx.currentTime;
        var pitchShift = Math.min((comboCount || 0) * 0.1, 0.5);
        var notes = [523, 659, 784, 1047, 1318];
        try {
            for (var i = 0; i < notes.length; i++) {
                var o = actx.createOscillator(); var g = actx.createGain();
                o.type = i < 4 ? 'sine' : 'triangle';
                o.frequency.setValueAtTime(notes[i] * (1 + pitchShift), t + i * 0.07);
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.13, t + i * 0.07);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
                o.connect(g); g.connect(actx.destination);
                o.start(t + i * 0.07); o.stop(t + 0.6);
                this._track(o);
            }
            /* キラキラ高周波 */
            var o2 = actx.createOscillator(); var g2 = actx.createGain();
            o2.type = 'sine';
            o2.frequency.setValueAtTime(3000, t + 0.3);
            o2.frequency.exponentialRampToValueAtTime(6000, t + 0.35);
            o2.frequency.exponentialRampToValueAtTime(2000, t + 0.6);
            g2.gain.setValueAtTime(0.05, t + 0.3);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
            o2.connect(g2); g2.connect(actx.destination);
            o2.start(t + 0.3); o2.stop(t + 0.65);
            this._track(o2);
        } catch (e) {}
    },

    /* 障害物: ブブー + ドスン */
    playSfxObstacle: function() {
        if (!this._canPlay()) return;
        var actx = KS.audio.ctx; var t = actx.currentTime;
        try {
            /* ブブー（デチューン2音） */
            var o1 = actx.createOscillator(); var o2 = actx.createOscillator();
            var g = actx.createGain();
            o1.type = 'sawtooth'; o2.type = 'square';
            o1.frequency.setValueAtTime(140, t); o2.frequency.setValueAtTime(148, t);
            g.gain.setValueAtTime(0.13, t);
            g.gain.setValueAtTime(0.13, t + 0.15);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            o1.connect(g); o2.connect(g); g.connect(actx.destination);
            o1.start(); o2.start(); o1.stop(t + 0.3); o2.stop(t + 0.3);
            this._track(o1);
            /* ドスン低音 */
            var o3 = actx.createOscillator(); var g3 = actx.createGain();
            o3.type = 'sine';
            o3.frequency.setValueAtTime(80, t + 0.05);
            o3.frequency.exponentialRampToValueAtTime(30, t + 0.25);
            g3.gain.setValueAtTime(0.2, t + 0.05);
            g3.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            o3.connect(g3); g3.connect(actx.destination);
            o3.start(t + 0.05); o3.stop(t + 0.3);
            this._track(o3);
        } catch (e) {}
    },

    /* ボム: 爆発（下降 + ノイズバースト） */
    playSfxBomb: function() {
        if (!this._canPlay()) return;
        var actx = KS.audio.ctx; var t = actx.currentTime;
        try {
            var o = actx.createOscillator(); var g = actx.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(300, t);
            o.frequency.exponentialRampToValueAtTime(30, t + 0.5);
            g.gain.setValueAtTime(0.18, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            o.connect(g); g.connect(actx.destination);
            o.start(); o.stop(t + 0.5);
            this._track(o);
            /* ノイズバースト */
            var nBuf = this._createNoise(0.3);
            var ns = actx.createBufferSource(); var ng = actx.createGain();
            ns.buffer = nBuf;
            ng.gain.setValueAtTime(0.15, t);
            ng.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            ns.connect(ng); ng.connect(actx.destination);
            ns.start(t); ns.stop(t + 0.3);
            this._track(ns);
            /* パーン破裂 */
            var o2 = actx.createOscillator(); var g2 = actx.createGain();
            o2.type = 'square';
            o2.frequency.setValueAtTime(600, t);
            o2.frequency.exponentialRampToValueAtTime(100, t + 0.15);
            g2.gain.setValueAtTime(0.12, t);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            o2.connect(g2); g2.connect(actx.destination);
            o2.start(); o2.stop(t + 0.15);
            this._track(o2);
        } catch (e) {}
    },

    /* ゲームオーバー: コミカルトロンボーン下降 + ポテッ */
    playSfxGameOver: function() {
        if (!this._canPlay()) return;
        var actx = KS.audio.ctx; var t = actx.currentTime;
        try {
            /* トロンボーン「ワーワーワー」（LFOビブラート付き） */
            var o = actx.createOscillator(); var g = actx.createGain();
            var lfo = actx.createOscillator(); var lfoGain = actx.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(400, t);
            o.frequency.linearRampToValueAtTime(350, t + 0.3);
            o.frequency.linearRampToValueAtTime(280, t + 0.6);
            o.frequency.linearRampToValueAtTime(100, t + 1.0);
            /* ビブラート */
            lfo.type = 'sine'; lfo.frequency.setValueAtTime(6, t);
            lfoGain.gain.setValueAtTime(15, t);
            lfoGain.gain.linearRampToValueAtTime(30, t + 1.0);
            lfo.connect(lfoGain); lfoGain.connect(o.frequency);
            g.gain.setValueAtTime(0.12, t);
            g.gain.setValueAtTime(0.12, t + 0.8);
            g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
            o.connect(g); g.connect(actx.destination);
            o.start(); lfo.start(); o.stop(t + 1.1); lfo.stop(t + 1.1);
            this._track(o);
            /* 最後に「ポテッ」 */
            var o2 = actx.createOscillator(); var g2 = actx.createGain();
            o2.type = 'sine';
            o2.frequency.setValueAtTime(300, t + 1.15);
            o2.frequency.exponentialRampToValueAtTime(80, t + 1.3);
            g2.gain.setValueAtTime(0.15, t + 1.15);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 1.35);
            o2.connect(g2); g2.connect(actx.destination);
            o2.start(t + 1.15); o2.stop(t + 1.35);
            this._track(o2);
        } catch (e) {}
    },

    /* コンボSE: コンボ数でピッチが上がる短い上昇音 */
    playSfxCombo: function(comboCount) {
        if (!this._canPlay()) return;
        var actx = KS.audio.ctx; var t = actx.currentTime;
        var baseFreq = 500 + (comboCount || 0) * 100;
        try {
            var o = actx.createOscillator(); var g = actx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(baseFreq, t);
            o.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.1);
            g.gain.setValueAtTime(0.1, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            o.connect(g); g.connect(actx.destination);
            o.start(); o.stop(t + 0.12);
            this._track(o);
        } catch (e) {}
    }
};

/* ========== CanvasManager ========== */
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
        var c = KS.canvas; if (!c) return;
        var ww = window.innerWidth, wh = window.innerHeight;
        var cr = KS.data.CANVAS_W / KS.data.CANVAS_H, wr = ww / wh;
        var dw, dh;
        if (wr > cr) { dh = wh; dw = dh * cr; } else { dw = ww; dh = dw / cr; }
        c.style.width = dw + 'px'; c.style.height = dh + 'px';
    },
    clientToLogical: function(cx, cy) {
        var r = KS.canvas.getBoundingClientRect();
        return { x: (cx - r.left) * (KS.data.CANVAS_W / r.width), y: (cy - r.top) * (KS.data.CANVAS_H / r.height) };
    }
};

/* ========== InputManager ========== */
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
        var l = KS.CanvasManager.clientToLogical(e.clientX, e.clientY);
        KS.input.lastPointerX = KS.input.pointerX;
        KS.input.pointerX = l.x;
    },
    _onPointerDown: function(e) { KS.input.pointerActive = true; KS.InputManager._onPointerMove(e); },
    _onPointerUp: function() { KS.input.pointerActive = false; }
};

/* ========== MainLoop ========== */
KS.MainLoop = {
    _rafId: null,
    start: function() { KS.time.lastFrame = performance.now(); KS.MainLoop._tick(performance.now()); },
    _tick: function(ts) {
        KS.time.now = ts; KS.time.delta = ts - KS.time.lastFrame;
        KS.time.lastFrame = ts; KS.time.frameCount++;
        if (KS.state && KS.state.current === KS.GameStates.PLAYING) KS.time.elapsed += KS.time.delta;
        if (KS.updateFn) KS.updateFn();
        if (KS.renderFn) KS.renderFn();
        KS.MainLoop._rafId = requestAnimationFrame(KS.MainLoop._tick);
    },
    stop: function() { if (KS.MainLoop._rafId) { cancelAnimationFrame(KS.MainLoop._rafId); KS.MainLoop._rafId = null; } }
};

/* ========== Boot ========== */
KS.boot = function() {
    KS.CanvasManager.init();
    KS.CanvasManager.applyLogicalSize();
    KS.state = new KS.GameState();
    try { var s = localStorage.getItem('ks_highscore'); if (s) KS.state.highScore = parseInt(s, 10) || 0; } catch (e) {}
    KS.InputManager.init();
    if (KS.data.IMAGE_MANIFEST) {
        KS.AssetLoader.loadAll(KS.data.IMAGE_MANIFEST).then(function() {
            KS.EffectImageGenerator.generate();
            KS.state.current = KS.GameStates.TITLE;
        });
    } else { KS.state.current = KS.GameStates.TITLE; }
    KS.MainLoop.start();
};
