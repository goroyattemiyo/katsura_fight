/**
 * ui.js — HUD（スコア、コンボ、レベル表示）
 * 読み込み順: 7番目
 * 更新: v1.0.1 — カットイン画像キー修正
 */
"use strict";

(function() {

    KS.ui = {
        drawHUD: function(ctx) {
            var st = KS.state;
            var d = KS.data;

            ctx.save();

            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#2c3e50';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.strokeText('SCORE: ' + st.score, 15, 30);
            ctx.fillText('SCORE: ' + st.score, 15, 30);

            ctx.font = 'bold 16px Arial';
            ctx.strokeText('Lv.' + st.difficultyLevel, 15, 55);
            ctx.fillText('Lv.' + st.difficultyLevel, 15, 55);

            if (st.comboCount > 0 && st.comboTimer > 0) {
                var comboAlpha = Math.min(1, st.comboTimer / 30);
                var mult = d.getComboMultiplier(st.comboCount);
                var scale = 1 + Math.sin(KS.time.frameCount * 0.1) * 0.1;

                ctx.save();
                ctx.globalAlpha = comboAlpha;
                ctx.font = 'bold ' + Math.floor(28 * scale) + 'px Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#e74c3c';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4;

                var comboText = st.comboCount + ' COMBO! x' + mult;
                ctx.strokeText(comboText, d.CANVAS_W / 2, 90);
                ctx.fillText(comboText, d.CANVAS_W / 2, 90);
                ctx.restore();
            }

            var stackCount = st.player.stack.length;
            var maxStack = Math.floor((st.player.y - d.STACK_GAME_OVER_Y) / d.STACK_OFFSET);
            if (maxStack <= 0) maxStack = 1;
            var barWidth = 8;
            var barHeight = 100;
            var barX = d.CANVAS_W - 25;
            var barY = 15;

            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            var fillRatio = Math.min(1, stackCount / maxStack);
            var fillColor = fillRatio < 0.5 ? '#2ecc71' :
                            fillRatio < 0.75 ? '#f39c12' : '#e74c3c';
            var fillH = barHeight * fillRatio;
            ctx.fillStyle = fillColor;
            ctx.fillRect(barX, barY + barHeight - fillH, barWidth, fillH);

            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);

            ctx.restore();
        },

        drawCutIn: function(ctx) {
            var st = KS.state;
            var ci = st.cutIn;
            if (!ci.active) return;

            var d = KS.data;
            var centerX = d.CANVAS_W / 2;
            var centerY = d.CANVAS_H / 2;
            var size = 250;

            var alpha = Math.min(1, ci.timer / 10) * 0.3;
            ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
            ctx.fillRect(0, 0, d.CANVAS_W, d.CANVAS_H);

            ctx.save();
            var elapsed = d.CUTIN_DURATION - ci.timer;
            var scale = 1.0 + Math.sin(elapsed * 0.15) * 0.05;
            ctx.translate(centerX, centerY);
            ctx.scale(scale, scale);

            /* カットイン画像: happy_<wigType> */
            var happyKey = 'happy_' + ci.wigType;
            var img = KS.assets.images[happyKey] || KS.assets.images.playerHappy;
            if (img) {
                ctx.drawImage(img, -size / 2, -size / 2, size, size);
            }
            ctx.restore();

            ctx.save();
            ctx.font = 'bold 36px Arial';
            ctx.fillStyle = '#f1c40f';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 5;
            ctx.textAlign = 'center';
            ctx.strokeText('NICE COMBO!!', centerX, centerY + size / 2 + 30);
            ctx.fillText('NICE COMBO!!', centerX, centerY + size / 2 + 30);
            ctx.restore();
        }
    };

})();
