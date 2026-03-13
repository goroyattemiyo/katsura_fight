/**
 * enemies.js — 落下物（FallingWig）クラス、SpawnController
 * 読み込み順: 3番目
 * 更新: v1.0.1 — 画像キー名をwig_プレフィックス付きに統一
 */
"use strict";

(function() {

    function FallingWig(config) {
        this.x = config.x || 0;
        this.y = config.y || -KS.data.WIG_H;
        this.type = config.type || 'regent';
        this.imageKey = config.imageKey || ('wig_' + config.type);
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

            var obstacleRate = d.SPECIAL_TYPES.obstacle.spawnRate;
            var bombRate = d.SPECIAL_TYPES.bomb.spawnRate;

            if (diff.level >= d.SPECIAL_TYPES.obstacle.minLevel && rand < obstacleRate) {
                config.type = 'obstacle';
                config.imageKey = 'obstacle';  /* エフェクト生成済み画像 */
                config.isObstacle = true;
            } else if (diff.level >= d.SPECIAL_TYPES.bomb.minLevel && rand < obstacleRate + bombRate) {
                config.type = 'bomb';
                config.imageKey = 'bomb';      /* エフェクト生成済み画像 */
                config.isBomb = true;
            } else {
                var available = d.WIG_TYPES.filter(function(wt) {
                    return wt.minLevel <= diff.level;
                });
                var chosen = available[Math.floor(Math.random() * available.length)];
                config.type = chosen.id;
                config.imageKey = 'wig_' + chosen.id;
            }

            KS.state.fallingWigs.push(new FallingWig(config));
        }
    };

    KS.enemies.FallingWig = FallingWig;
    KS.enemies.SpawnController = SpawnController;

})();
