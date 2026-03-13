/**
 * enemies.js — 落下オブジェクト、スポーン制御
 * 読み込み順: 3番目
 * v1.0.6 — スポーンバイアス追加、次ウィッグプレビュー
 */
"use strict";

(function() {

    /* ========================================
     * FallingWig クラス
     * ======================================== */
    function FallingWig(x, y, type, imageKey, speed, isObstacle, isBomb) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.imageKey = imageKey;
        this.speed = speed;
        this.isObstacle = isObstacle || false;
        this.isBomb = isBomb || false;
        this.alive = true;
        this.rotation = (Math.random() - 0.5) * 0.3;
    }

    FallingWig.prototype.update = function() {
        if (!this.alive) return;
        this.y += this.speed;
        if (this.y > KS.data.CANVAS_H + 50) {
            this.alive = false;
        }
    };

    /* ========================================
     * SpawnController
     * v1.0.6: バイアスロジック + 次ウィッグプレビュー
     * ======================================== */
    var SpawnController = {
        timer: 0,
        nextWigType: null,
        nextWigImageKey: null,
        nextIsObstacle: false,
        nextIsBomb: false,

        reset: function() {
            this.timer = 0;
            this.nextWigType = null;
            this.nextWigImageKey = null;
            this.nextIsObstacle = false;
            this.nextIsBomb = false;
        },

        /* 次に降るウィッグを事前決定（プレビュー用） */
        _prepareNext: function(difficulty) {
            var d = KS.data;
            var st = KS.state;
            var level = difficulty.level;

            /* 特殊アイテム判定 */
            var roll = Math.random();
            if (level >= d.SPECIAL_TYPES.obstacle.minLevel && roll < d.SPECIAL_TYPES.obstacle.spawnRate) {
                this.nextWigType = 'obstacle';
                this.nextWigImageKey = 'obstacle';
                this.nextIsObstacle = true;
                this.nextIsBomb = false;
                return;
            }
            roll = Math.random();
            if (level >= d.SPECIAL_TYPES.bomb.minLevel && roll < d.SPECIAL_TYPES.bomb.spawnRate) {
                this.nextWigType = 'bomb';
                this.nextWigImageKey = 'bomb';
                this.nextIsObstacle = false;
                this.nextIsBomb = true;
                return;
            }

            /* 通常ウィッグ（バイアス付き） */
            var available = [];
            for (var i = 0; i < d.WIG_TYPES.length; i++) {
                if (d.WIG_TYPES[i].minLevel <= level) {
                    available.push(d.WIG_TYPES[i]);
                }
            }

            var chosen;
            var stack = st.player.stack;
            var lastType = stack.length > 0 ? stack[stack.length - 1].type : null;

            /* バイアス: 直前キャッチ種と同じものが SPAWN_BIAS_RATE で出る */
            if (lastType && lastType !== 'obstacle' && Math.random() < d.SPAWN_BIAS_RATE) {
                chosen = null;
                for (var j = 0; j < available.length; j++) {
                    if (available[j].id === lastType) {
                        chosen = available[j];
                        break;
                    }
                }
                if (!chosen) {
                    chosen = available[Math.floor(Math.random() * available.length)];
                }
            } else {
                chosen = available[Math.floor(Math.random() * available.length)];
            }

            this.nextWigType = chosen.id;
            this.nextWigImageKey = 'wig_' + chosen.id;
            this.nextIsObstacle = false;
            this.nextIsBomb = false;
        },

        update: function() {
            var st = KS.state;
            if (st.current !== KS.GameStates.PLAYING) return;

            var difficulty = KS.systems.difficulty.getCurrent();

            /* 初回: 次ウィッグを事前決定 */
            if (this.nextWigType === null) {
                this._prepareNext(difficulty);
            }

            this.timer++;
            if (this.timer >= difficulty.spawnInterval) {
                this.timer = 0;

                var d = KS.data;
                var x = Math.random() * (d.CANVAS_W - d.WIG_W);

                var wig = new FallingWig(
                    x, -d.WIG_H,
                    this.nextWigType,
                    this.nextWigImageKey,
                    difficulty.fallSpeed,
                    this.nextIsObstacle,
                    this.nextIsBomb
                );
                st.fallingWigs.push(wig);

                /* 次のウィッグを事前決定 */
                this._prepareNext(difficulty);
            }
        }
    };

    KS.enemies.FallingWig = FallingWig;
    KS.enemies.SpawnController = SpawnController;

})();
