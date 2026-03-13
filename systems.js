/**
 * systems.js v1.1.0 — コアメカニクス + 演出システム
 */
"use strict";

(function() {

    var WIG_W, WIG_H, STACK_OFFSET;
    function ensureConstants() {
        WIG_W = KS.data.WIG_W;
        WIG_H = KS.data.WIG_H;
        STACK_OFFSET = KS.data.STACK_OFFSET;
    }

    /* ========== 難易度制御 ========== */
    KS.systems.difficulty = {
        getCurrent: function() {
            ensureConstants();
            var st = KS.state;
            var table = KS.data.DIFFICULTY_TABLE;
            var elapsed = st.elapsedPlayTime / 1000;
            var current = table[0];
            for (var i = 1; i < table.length; i++) {
                if (elapsed >= table[i].time) current = table[i];
                else break;
            }
            st.difficultyLevel = current.level;
            return current;
        }
    };

    /* ========== コンボ ========== */
    KS.systems.combo = {
        update: function() {
            var st = KS.state;
            if (st.comboTimer > 0) {
                st.comboTimer--;
                if (st.comboTimer <= 0) st.comboCount = 0;
            }
        },
        onMatch: function(matchCount) {
            var st = KS.state;
            st.comboCount++;
            st.comboTimer = KS.data.COMBO_WINDOW;
            var base = KS.data.getMatchScore(matchCount);
            var mult = KS.data.getComboMultiplier(st.comboCount);
            var total = Math.floor(base * mult);
            st.score += total;
            return total;
        },
        reset: function() {
            KS.state.comboCount = 0;
            KS.state.comboTimer = 0;
        }
    };

    /* ========== マッチ検出 ========== */
    KS.systems.match = {
        check: function() {
            var st = KS.state;
            var stack = st.player.stack;
            if (stack.length < 3) return;
            var topType = stack[stack.length - 1].type;
            if (topType === 'obstacle') return;
            var mc = 1;
            for (var i = stack.length - 2; i >= 0; i--) {
                if (stack[i].type === topType && !stack[i].isObstacle) mc++;
                else break;
            }
            if (mc >= 3) {
                var matchY = st.player.y + KS.data.PLAYER_HEAD_TOP_OFFSET - (stack.length - 1) * STACK_OFFSET;
                var matchX = st.player.x + st.player.w / 2;
                stack.splice(stack.length - mc, mc);
                var scored = KS.systems.combo.onMatch(mc);

                st.player.isHappy = true;
                st.player.happyTimer = KS.data.HAPPY_DURATION;
                st.cutIn.active = true;
                st.cutIn.timer = KS.data.CUTIN_DURATION;
                st.cutIn.wigType = topType;

                /* 演出: パーティクル爆発 */
                KS.systems.fx.spawnParticles(matchX, matchY, KS.data.PARTICLE_COUNT_MATCH, 'match');
                /* 演出: スクリーンシェイク */
                KS.systems.fx.shake(KS.data.SCREEN_SHAKE_MATCH);
                /* 演出: フローティングテキスト */
                KS.systems.fx.floatText(matchX, matchY, '+' + scored, '#ffd700', 28);
                /* 演出: コンボテキスト */
                if (st.comboCount > 1) {
                    KS.systems.fx.floatText(matchX, matchY - 30, mc + ' COMBO!', '#ff6b6b', 22);
                }

                KS.AudioManager.playSfx(880, 'sine', 0.3);
            }
        }
    };

    /* ========== 衝突判定 ========== */
    KS.systems.collision = {
        check: function() {
            ensureConstants();
            var st = KS.state;
            var p = st.player;
            var d = KS.data;
            var stackTopY = p.stack.length === 0
                ? p.y + d.PLAYER_HEAD_TOP_OFFSET
                : p.y + d.PLAYER_HEAD_TOP_OFFSET - p.stack.length * STACK_OFFSET;
            var catchLeft = p.x;
            var catchRight = p.x + p.w;
            var catchTop = stackTopY - WIG_H;
            var catchBottom = stackTopY + WIG_H;

            for (var i = st.fallingWigs.length - 1; i >= 0; i--) {
                var w = st.fallingWigs[i];
                if (!w.alive) continue;
                var cx = w.x + WIG_W / 2;
                var cy = w.y + WIG_H / 2;
                if (cx > catchLeft && cx < catchRight && cy > catchTop && cy < catchBottom) {
                    w.alive = false;
                    st.fallingWigs.splice(i, 1);
                    if (w.isBomb) KS.systems.collision._handleBomb(st, w);
                    else if (w.isObstacle) KS.systems.collision._handleObstacle(st, w);
                    else KS.systems.collision._handleNormal(st, w);
                }
            }
        },
        _handleNormal: function(st, w) {
            st.player.stack.push({ type: w.type, imageKey: w.imageKey, isObstacle: false });
            st.score += KS.data.SCORE.CATCH;
            /* 演出 */
            var fx = KS.systems.fx;
            fx.spawnParticles(st.player.x + st.player.w / 2, st.player.y, KS.data.PARTICLE_COUNT_CATCH, 'catch');
            fx.shake(KS.data.SCREEN_SHAKE_CATCH);
            fx.floatText(st.player.x + st.player.w / 2, st.player.y - 20, '+10', '#ffffff', 16);
            KS.AudioManager.playSfx(440, 'sine', 0.08);
            KS.systems.match.check();
        },
        _handleObstacle: function(st, w) {
            st.player.stack.push({ type: 'obstacle', imageKey: w.imageKey, isObstacle: true });
            /* 演出: 強めのシェイク + 赤フラッシュテキスト */
            KS.systems.fx.shake(KS.data.SCREEN_SHAKE_OBSTACLE);
            KS.systems.fx.floatText(st.player.x + st.player.w / 2, st.player.y - 20, 'BLOCKED!', '#e74c3c', 20);
            KS.AudioManager.playSfx(200, 'sawtooth', 0.15);
        },
        _handleBomb: function(st, w) {
            var removed = 0;
            for (var i = st.player.stack.length - 1; i >= 0; i--) {
                if (st.player.stack[i].isObstacle) {
                    st.player.stack.splice(i, 1);
                    removed++;
                }
            }
            if (removed > 0) {
                st.score += removed * KS.data.SCORE.BOMB_CLEAR_PER_OBSTACLE;
                st.player.isHappy = true;
                st.player.happyTimer = KS.data.HAPPY_DURATION;
            }
            KS.systems.fx.spawnParticles(st.player.x + st.player.w / 2, st.player.y, KS.data.PARTICLE_COUNT_BOMB, 'bomb');
            KS.systems.fx.shake(KS.data.SCREEN_SHAKE_MATCH);
            KS.systems.fx.floatText(st.player.x + st.player.w / 2, st.player.y - 20, 'BOOM!', '#f39c12', 24);
            KS.AudioManager.playSfx(660, 'square', 0.2);
        }
    };

    /* ========== ゲームオーバー判定 ========== */
    KS.systems.gameOverCheck = function() {
        ensureConstants();
        var st = KS.state;
        var p = st.player;
        var d = KS.data;
        if (p.stack.length === 0) return;
        var topY = p.y + d.PLAYER_HEAD_TOP_OFFSET - p.stack.length * STACK_OFFSET;
        if (topY <= d.STACK_GAME_OVER_Y) st.triggerGameOver();
    };

    /* ========================================
     * 演出エフェクトシステム (FX)
     * ======================================== */
    KS.systems.fx = {
        /* パーティクル生成 */
        spawnParticles: function(x, y, count, type) {
            var st = KS.state;
            var colors;
            if (type === 'match') colors = ['#ffd700', '#ff6b6b', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'];
            else if (type === 'bomb') colors = ['#f39c12', '#e74c3c', '#ffd700'];
            else colors = ['#ffffff', '#dfe6e9', '#ffeaa7'];

            for (var i = 0; i < count; i++) {
                var angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
                var speed = type === 'match' ? (3 + Math.random() * 5) : (1 + Math.random() * 3);
                st.particles.push({
                    x: x, y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 2,
                    life: 40 + Math.random() * 20,
                    maxLife: 60,
                    size: type === 'match' ? (4 + Math.random() * 6) : (2 + Math.random() * 4),
                    color: colors[Math.floor(Math.random() * colors.length)],
                    type: 'circle',
                    gravity: 0.15,
                    rotation: 0,
                    rotSpeed: (Math.random() - 0.5) * 0.2
                });
            }
            /* 星パーティクル（マッチ時） */
            if (type === 'match') {
                for (var j = 0; j < 8; j++) {
                    var a2 = Math.random() * Math.PI * 2;
                    var sp2 = 2 + Math.random() * 4;
                    st.particles.push({
                        x: x, y: y,
                        vx: Math.cos(a2) * sp2,
                        vy: Math.sin(a2) * sp2 - 3,
                        life: 50,
                        maxLife: 50,
                        size: 8 + Math.random() * 8,
                        color: '#ffd700',
                        type: 'star',
                        gravity: 0.08,
                        rotation: Math.random() * Math.PI,
                        rotSpeed: (Math.random() - 0.5) * 0.3
                    });
                }
            }
        },

        /* パーティクル更新 */
        updateParticles: function() {
            var pts = KS.state.particles;
            for (var i = pts.length - 1; i >= 0; i--) {
                var p = pts[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity || 0.15;
                p.vx *= 0.98;
                p.rotation += p.rotSpeed || 0;
                p.life--;
                if (p.life <= 0) pts.splice(i, 1);
            }
        },

        /* スクリーンシェイク */
        shake: function(intensity) {
            var s = KS.state.screenShake;
            s.intensity = Math.max(s.intensity, intensity);
            s.timer = KS.data.SCREEN_SHAKE_DURATION;
        },

        updateShake: function() {
            var s = KS.state.screenShake;
            if (s.timer > 0) {
                var decay = s.timer / KS.data.SCREEN_SHAKE_DURATION;
                s.x = (Math.random() - 0.5) * s.intensity * decay * 2;
                s.y = (Math.random() - 0.5) * s.intensity * decay * 2;
                s.timer--;
            } else {
                s.x = 0; s.y = 0; s.intensity = 0;
            }
        },

        /* フローティングテキスト */
        floatText: function(x, y, text, color, fontSize) {
            KS.state.floatingTexts.push({
                x: x, y: y, text: text, color: color || '#ffffff',
                fontSize: fontSize || 16,
                life: KS.data.FLOATING_TEXT_DURATION,
                maxLife: KS.data.FLOATING_TEXT_DURATION,
                vy: -2
            });
        },

        updateFloatingTexts: function() {
            var fts = KS.state.floatingTexts;
            for (var i = fts.length - 1; i >= 0; i--) {
                fts[i].y += fts[i].vy;
                fts[i].vy *= 0.95;
                fts[i].life--;
                if (fts[i].life <= 0) fts.splice(i, 1);
            }
        },

        /* 背景ウィッグ初期化 */
        initBgWigs: function() {
            var st = KS.state;
            var d = KS.data;
            st.bgWigs = [];
            var types = ['wig_regent', 'wig_blonde', 'wig_red', 'wig_bob', 'wig_afro'];
            for (var i = 0; i < d.BG_WIG_COUNT; i++) {
                st.bgWigs.push({
                    x: Math.random() * d.CANVAS_W,
                    y: Math.random() * d.CANVAS_H,
                    speed: 0.3 + Math.random() * 0.5,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.01,
                    size: 20 + Math.random() * 25,
                    alpha: 0.06 + Math.random() * 0.06,
                    imageKey: types[Math.floor(Math.random() * types.length)]
                });
            }
        },

        updateBgWigs: function() {
            var st = KS.state;
            var d = KS.data;
            for (var i = 0; i < st.bgWigs.length; i++) {
                var bw = st.bgWigs[i];
                bw.y += bw.speed;
                bw.rotation += bw.rotSpeed;
                if (bw.y > d.CANVAS_H + 40) {
                    bw.y = -40;
                    bw.x = Math.random() * d.CANVAS_W;
                }
            }
        }
    };

})();
