/**
 * systems.js — 当たり判定、コンボ、難易度制御、スコアリング
 * 読み込み順: 5番目
 * 更新: v1.0.1 — imageKey対応
 */
"use strict";

(function() {

    /* ========================================
     * 難易度制御
     * ======================================== */
    KS.systems.difficulty = {
        getCurrent: function() {
            var table = KS.data.DIFFICULTY_TABLE;
            var elapsedSec = KS.time.elapsed / 1000;
            var current = table[0];

            for (var i = table.length - 1; i >= 0; i--) {
                if (elapsedSec >= table[i].time) {
                    current = table[i];
                    break;
                }
            }

            KS.state.difficultyLevel = current.level;
            return current;
        }
    };

    /* ========================================
     * コンボシステム
     * ======================================== */
    KS.systems.combo = {
        update: function() {
            var st = KS.state;
            if (st.current !== KS.GameStates.PLAYING) return;
            if (st.comboTimer > 0) {
                st.comboTimer--;
                if (st.comboTimer === 0) {
                    st.comboCount = 0;
                }
            }
        },

        onMatch: function(matchCount) {
            var st = KS.state;
            if (st.comboTimer > 0) {
                st.comboCount++;
            } else {
                st.comboCount = 0;
            }
            st.comboTimer = KS.data.COMBO_WINDOW;

            var baseScore = KS.data.getMatchScore(matchCount);
            var mult = KS.data.getComboMultiplier(st.comboCount);
            return Math.floor(baseScore * mult);
        },

        reset: function() {
            if (!KS.state) return;
            KS.state.comboCount = 0;
            KS.state.comboTimer = 0;
        }
    };

    /* ========================================
     * マッチ判定 — 最上部連続一致（可変長）
     * ======================================== */
    KS.systems.match = {
        check: function() {
            var stack = KS.state.player.stack;
            if (stack.length < 3) return 0;

            var top = stack[stack.length - 1];
            if (top.isObstacle) return 0;

            var topType = top.type;
            var count = 0;

            for (var i = stack.length - 1; i >= 0; i--) {
                if (stack[i].type === topType && !stack[i].isObstacle) {
                    count++;
                } else {
                    break;
                }
            }

            if (count >= 3) {
                var matchedType = topType;
                stack.splice(stack.length - count, count);

                var points = KS.systems.combo.onMatch(count);
                KS.state.score += points;

                KS.state.player.isHappy = true;
                KS.state.player.happyTimer = KS.data.HAPPY_DURATION;

                KS.state.cutIn.active = true;
                KS.state.cutIn.timer = KS.data.CUTIN_DURATION;
                KS.state.cutIn.wigType = matchedType;

                KS.AudioManager.playSfx(1200, 'triangle', 0.5);

                return count;
            }

            return 0;
        }
    };

    /* ========================================
     * 当たり判定
     * ======================================== */
    KS.systems.collision = {
        check: function() {
            var st = KS.state;
            var p = st.player;
            var d = KS.data;

            var stackTopY = p.y - (p.stack.length * d.STACK_OFFSET);

            var hitTop = stackTopY - d.WIG_H * 0.5;
            var hitBottom = stackTopY + d.WIG_H * 0.5;
            var hitLeft = p.x + (p.w - d.WIG_W) / 2;
            var hitRight = hitLeft + d.WIG_W;

            for (var i = st.fallingWigs.length - 1; i >= 0; i--) {
                var w = st.fallingWigs[i];
                if (!w.alive) continue;

                var wCenterY = w.y + d.WIG_H / 2;
                var wLeft = w.x;
                var wRight = w.x + d.WIG_W;

                if (wCenterY >= hitTop && wCenterY <= hitBottom + d.WIG_H &&
                    wRight > hitLeft && wLeft < hitRight) {

                    w.alive = false;

                    if (w.isBomb) {
                        KS.systems.collision._handleBomb();
                    } else if (w.isObstacle) {
                        KS.systems.collision._handleObstacle(w);
                    } else {
                        KS.systems.collision._handleNormal(w);
                    }
                }
            }

            st.fallingWigs = st.fallingWigs.filter(function(w) { return w.alive; });
        },

        _handleNormal: function(w) {
            var st = KS.state;
            st.player.stack.push({
                type: w.type,
                imageKey: w.imageKey,
                isObstacle: false
            });
            st.score += KS.data.SCORE.CATCH;
            KS.AudioManager.playSfx(440, 'sine', 0.1);
            KS.systems.match.check();
        },

        _handleObstacle: function(w) {
            var st = KS.state;
            st.player.stack.push({
                type: 'obstacle',
                imageKey: 'obstacle',
                isObstacle: true
            });
            KS.AudioManager.playSfx(80, 'sawtooth', 0.4);
        },

        _handleBomb: function() {
            var st = KS.state;
            var removedCount = 0;

            st.player.stack = st.player.stack.filter(function(item) {
                if (item.isObstacle) {
                    removedCount++;
                    return false;
                }
                return true;
            });

            st.score += removedCount * KS.data.SCORE.BOMB_CLEAR_PER_OBSTACLE;

            if (removedCount > 0) {
                st.player.isHappy = true;
                st.player.happyTimer = KS.data.HAPPY_DURATION;
            }

            KS.AudioManager.playSfx(880, 'square', 0.3);
        }
    };

    /* ========================================
     * ゲームオーバー判定
     * ======================================== */
    KS.systems.gameOverCheck = function() {
        var st = KS.state;
        var p = st.player;
        var stackTopY = p.y - (p.stack.length * KS.data.STACK_OFFSET);

        if (stackTopY <= KS.data.STACK_GAME_OVER_Y) {
            st.triggerGameOver();
        }
    };

})();
