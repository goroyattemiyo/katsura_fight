/**
 * enemies.js — 落下物（FallingWig）クラス、SpawnController
 * 読み込み順: 3番目
 * 責務: 落下物の生成・更新ロジック
 * サイズ目安: ~5KB
 */
"use strict";

(function() {

    /* ========================================
     * FallingWig クラス
     * ======================================== */
    function FallingWig(config) {
        this.x = config.x || 0;
        this.y = config.y || -KS.data.WIG_H;
        this.type = config.type || 'regent';
        this.isObstacle = config.isObstacle || false;
        this.isBomb = config.isBomb || false;
        this.rotation = (Math.random() - 0.5) * 0.2;
        this.speed = config.speed || 2.0;
        this.alive = true;
    }

    FallingWig.prototype.update = function() {
        this.y += this.speed;
        if (this.y > KS.data.CANVAS_H + KS.data.WIG_H) {
            this.alive = false;
        }
    };

    /* ========================================
     * SpawnController
     * A-2対策: フレームカウンタベースのスポーン。reset()完備
     * ======================================== */
    var SpawnController = {
        _timer: 0,

        reset: function() {
            this._timer = 0;
        },

        update: function() {
            var st = KS.state;
            if (st.current !== KS.GameStates.PLAYING) return;

            var diff = KS.systems.difficulty.getCurrent();
            this._timer++;

            if (this._timer >= diff.spawnInterval) {
                this._timer = 0;
                SpawnController.spawn(diff);
            }
        },

        spawn: function(diff) {
            var d = KS.data;
            var rand = Math.random();
            var config = {
                x: Math.random() * (d.CANVAS_W - d.WIG_W),
                speed: diff.fallSpeed
            };

            /* 特殊アイテム判定 */
            var obstacleRate = d.SPECIAL_TYPES.obstacle.spawnRate;
            var bombRate = d.SPECIAL_TYPES.bomb.spawnRate;

            if (diff.level >= d.SPECIAL_TYPES.obstacle.minLevel && rand < obstacleRate) {
                /* 障害物カツラ */
                config.type = 'obstacle';
                config.isObstacle = true;
            } else if (diff.level >= d.SPECIAL_TYPES.bomb.minLevel && rand < obstacleRate + bombRate) {
                /* ボムカツラ */
                config.type = 'bomb';
                config.isBomb = true;
            } else {
                /* 通常カツラ: 難易度に応じた種類数からランダム */
                var available = d.WIG_TYPES.filter(function(wt) {
                    return wt.minLevel <= diff.level;
                });
                var chosen = available[Math.floor(Math.random() * available.length)];
                config.type = chosen.id;
            }

            KS.state.fallingWigs.push(new FallingWig(config));
        }
    };

    /* 公開 */
    KS.enemies.FallingWig = FallingWig;
    KS.enemies.SpawnController = SpawnController;

})();
