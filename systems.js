/**
 * systems.js — コアゲームメカニクス
 * 読み込み順: 5番目
 * v1.0.5 — collision hitbox を新サイズ定数に合わせて修正
 */
"use strict";

(function() {

    var WIG_W, WIG_H, STACK_OFFSET;

    function ensureConstants() {
        WIG_W = KS.data.WIG_W;
        WIG_H = KS.data.WIG_H;
        STACK_OFFSET = KS.data.STACK_OFFSET;
    }

    /* ========================================
     * 難易度制御
     * ======================================== */
    KS.systems.difficulty = {
        getCurrent: function() {
            ensureConstants();
            var st = KS.state;
            var table = KS.data.DIFFICULTY_TABLE;
            var elapsed = st.elapsedPlayTime / 1000;
            var current = table[0];
            for (var i = 1; i < table.length; i++) {
                if (elapsed >= table[i].time) {
                    current = table[i];
                } else {
                    break;
                }
            }
            st.difficultyLevel = current.level;
            return current;
        }
    };

    /* ========================================
     * コンボシステム
     * ======================================== */
    KS.systems.combo = {
        update: function() {
            var st = KS.state;
            if (st.comboTimer > 0) {
                st.comboTimer--;
                if (st.comboTimer <= 0) {
                    st.comboCount = 0;
                }
            }
        },

        onMatch: function(matchCount) {
            var st = KS.state;
            st.comboCount++;
            st.comboTimer = KS.data.COMBO_WINDOW;
            var baseScore = KS.data.getMatchScore(matchCount);
            var multiplier = KS.data.getComboMultiplier(st.comboCount);
            var totalScore = Math.floor(baseScore * multiplier);
            st.score += totalScore;
            return totalScore;
        },

        reset: function() {
            KS.state.comboCount = 0;
            KS.state.comboTimer = 0;
        }
    };

    /* ========================================
     * マッチ検出
     * ======================================== */
    KS.systems.match = {
        check: function() {
            var st = KS.state;
            var stack = st.player.stack;
            if (stack.length < 3) return;

            var topType = stack[stack.length - 1].type;
            if (topType === 'obstacle') return;

            var matchCount = 1;
            for (var i = stack.length - 2; i >= 0; i--) {
                if (stack[i].type === topType && !stack[i].isObstacle) {
                    matchCount++;
                } else {
                    break;
                }
            }

            if (matchCount >= 3) {
                stack.splice(stack.length - matchCount, matchCount);
                var scored = KS.systems.combo.onMatch(matchCount);

                st.player.isHappy = true;
                st.player.happyTimer = KS.data.HAPPY_DURATION;

                st.cutIn.active = true;
                st.cutIn.timer = KS.data.CUTIN_DURATION;
                st.cutIn.wigType = topType;

                KS.AudioManager.playSfx(880, 'sine', 0.3);
            }
        }
    };

    /* ========================================
     * 衝突判定
     * v1.0.5: ヒットボックスを新サイズ定数に合わせて調整
     * ======================================== */
    KS.systems.collision = {
        check: function() {
            ensureConstants();
            var st = KS.state;
            var p = st.player;
            var d = KS.data;

            /* プレイヤーのキャッチ領域: 頭頂付近 */
            var stackTopY;
            if (p.stack.length === 0) {
                stackTopY = p.y + d.PLAYER_HEAD_TOP_OFFSET;
            } else {
                stackTopY = p.y + d.PLAYER_HEAD_TOP_OFFSET - p.stack.length * STACK_OFFSET;
            }

            var catchLeft = p.x;
            var catchRight = p.x + p.w;
            var catchTop = stackTopY - WIG_H;
            var catchBottom = stackTopY + WIG_H;

            for (var i = st.fallingWigs.length - 1; i >= 0; i--) {
                var w = st.fallingWigs[i];
                if (!w.alive) continue;

                var wigCX = w.x + WIG_W / 2;
                var wigCY = w.y + WIG_H / 2;

                if (wigCX > catchLeft && wigCX < catchRight &&
                    wigCY > catchTop && wigCY < catchBottom) {

                    w.alive = false;
                    st.fallingWigs.splice(i, 1);

                    if (w.isBomb) {
                        KS.systems.collision._handleBomb(st);
                    } else if (w.isObstacle) {
                        KS.systems.collision._handleObstacle(st, w);
                    } else {
                        KS.systems.collision._handleNormal(st, w);
                    }
                }
            }
        },

        _handleNormal: function(st, w) {
            st.player.stack.push({
                type: w.type,
                imageKey: w.imageKey,
                isObstacle: false
            });
            st.score += KS.data.SCORE.CATCH;
            KS.AudioManager.playSfx(440, 'sine', 0.08);
            KS.systems.match.check();
        },

        _handleObstacle: function(st, w) {
            st.player.stack.push({
                type: 'obstacle',
                imageKey: w.imageKey,
                isObstacle: true
            });
            KS.AudioManager.playSfx(200, 'sawtooth', 0.15);
        },

        _handleBomb: function(st) {
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
            KS.AudioManager.playSfx(660, 'square', 0.2);
        }
    };

    /* ========================================
     * ゲームオーバー判定
     * ======================================== */
    KS.systems.gameOverCheck = function() {
        ensureConstants();
        var st = KS.state;
        var p = st.player;
        var d = KS.data;

        if (p.stack.length === 0) return;

        var topY = p.y + d.PLAYER_HEAD_TOP_OFFSET - p.stack.length * STACK_OFFSET;
        if (topY <= d.STACK_GAME_OVER_Y) {
            st.triggerGameOver();
        }
    };

})();
