/**
 * systems.js — 当たり判定、コンボ、難易度制御、スコアリング
 * 読み込み順: 5番目
 * 責務: ゲームメカニクスのコアロジック
 * サイズ目安: ~8KB
 */
"use strict";

(function() {

    /* ========================================
     * 難易度制御
     * D-2結論: 経過時間ベース
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
     * D-6結論: 時間制限コンボ（5秒窓）
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
            KS.state.comboCount = 0;
            KS.state.comboTimer = 0;
        }
    };

    /* ========================================
     * マッチ判定
     * D-1結論: 最上部連続一致（可変長）
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

                /* スコア加算（コンボ倍率込み） */
                var points = KS.systems.combo.onMatch(count);
                KS.state.score += points;

                /* 喜び演出 */
                KS.state.player.isHappy = true;
                KS.state.player.happyTimer = KS.data.HAPPY_DURATION;

                /* カットイン */
                KS.state.cutIn.active = true;
                KS.state.cutIn.timer = KS.data.CUTIN_DURATION;
                KS.state.cutIn.wigType = matchedType;

                /* SE */
                KS.AudioManager.playSfx(1200, 'triangle', 0.5);

                return count;
            }

            return 0;
        }
    };

    /* ========================================
     * 当たり判定
     * B-1対策: スタック最上部のWIG_H範囲のみ
     * B-3対策: 同フレーム複数キャッチは許容（最上部マッチで対応）
     * ======================================== */
    KS.systems.collision = {
        check: function() {
            var st = KS.state;
            var p = st.player;
            var d = KS.data;

            /* スタック最上部のY座標 */
            var stackTopY = p.y - (p.stack.length * d.STACK_OFFSET);

            /* 当たり判定の領域: スタック最上部からWIG_H分のみ（B-1対策） */
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

                /* AABB判定 */
                if (wCenterY >= hitTop && wCenterY <= hitBottom + d.WIG_H &&
                    wRight > hitLeft && wLeft < hitRight) {

                    /* キャッチ成功 */
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

            /* 死んだカツラを除去 */
            st.fallingWigs = st.fallingWigs.filter(function(w) { return w.alive; });
        },

        _handleNormal: function(w) {
            var st = KS.state;
            st.player.stack.push({ type: w.type, isObstacle: false });
            st.score += KS.data.SCORE.CATCH;
            KS.AudioManager.playSfx(440, 'sine', 0.1);

            /* マッチ判定 */
            KS.systems.match.check();
        },

        _handleObstacle: function(w) {
            var st = KS.state;
            st.player.stack.push({ type: w.type, isObstacle: true });
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
