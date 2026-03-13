/**
 * ui.js — HUD、カットイン、NEXTプレビュー
 * 読み込み順: 7番目
 * v1.0.6 — NEXTプレビュー追加
 */
"use strict";

(function() {

    KS.ui.drawHUD = function(ctx) {
        var st = KS.state;
        var d = KS.data;

        ctx.save();

        /* スコア */
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText('SCORE: ' + st.score, 15, 35);

        /* レベル */
        ctx.font = '16px Arial';
        ctx.fillText('Lv.' + st.difficultyLevel, 15, 58);

        /* コンボ表示 */
        if (st.comboCount > 0 && st.comboTimer > 0) {
            var comboScale = 1 + Math.sin(KS.time.frameCount * 0.2) * 0.1;
            var comboAlpha = Math.min(1, st.comboTimer / 30);
            ctx.globalAlpha = comboAlpha;
            ctx.font = 'bold ' + Math.floor(20 * comboScale) + 'px Arial';
            ctx.fillStyle = '#ffd700';
            ctx.textAlign = 'center';
            ctx.fillText('COMBO x' + st.comboCount, d.CANVAS_W / 2, 80);
            ctx.globalAlpha = 1;
        }

        ctx.shadowBlur = 0;
        ctx.restore();

        /* NEXTプレビュー */
        KS.ui._drawNextPreview(ctx);

        /* スタックバー */
        KS.ui._drawStackBar(ctx);
    };

    /* NEXTウィッグ プレビュー */
    KS.ui._drawNextPreview = function(ctx) {
        var sc = KS.enemies.SpawnController;
        var d = KS.data;
        if (!sc || !sc.nextWigImageKey) return;

        var boxX = d.CANVAS_W - 90;
        var boxY = 15;
        var boxW = 75;
        var boxH = 55;

        ctx.save();

        /* 背景ボックス */
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.moveTo(boxX + 6, boxY);
        ctx.lineTo(boxX + boxW - 6, boxY);
        ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + 6);
        ctx.lineTo(boxX + boxW, boxY + boxH - 6);
        ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - 6, boxY + boxH);
        ctx.lineTo(boxX + 6, boxY + boxH);
        ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - 6);
        ctx.lineTo(boxX, boxY + 6);
        ctx.quadraticCurveTo(boxX, boxY, boxX + 6, boxY);
        ctx.fill();

        /* NEXT ラベル */
        ctx.fillStyle = '#aaaaaa';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('NEXT', boxX + boxW / 2, boxY + 12);

        /* プレビュー画像 */
        var img = KS.assets.images[sc.nextWigImageKey];
        if (img) {
            var pw = 50;
            var ph = 27;
            ctx.drawImage(img, boxX + (boxW - pw) / 2, boxY + 18, pw, ph);
        } else {
            ctx.fillStyle = sc.nextIsBomb ? '#f1c40f' : (sc.nextIsObstacle ? '#e74c3c' : '#9b59b6');
            ctx.fillRect(boxX + 15, boxY + 18, 45, 25);
            ctx.fillStyle = '#fff';
            ctx.font = '9px Arial';
            ctx.fillText(sc.nextWigType || '?', boxX + boxW / 2, boxY + 34);
        }

        ctx.restore();
    };

    /* スタック高さバー */
    KS.ui._drawStackBar = function(ctx) {
        var st = KS.state;
        var d = KS.data;

        var barX = d.CANVAS_W - 18;
        var barY = 80;
        var barW = 8;
        var barH = 120;

        var maxStack = Math.floor((d.CANVAS_H - d.PLAYER_GROUND_OFFSET - d.STACK_GAME_OVER_Y) / d.STACK_OFFSET);
        var fillRatio = Math.min(1, st.player.stack.length / maxStack);

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(barX, barY, barW, barH);

        var fillColor;
        if (fillRatio < 0.5) fillColor = '#2ecc71';
        else if (fillRatio < 0.75) fillColor = '#f1c40f';
        else fillColor = '#e74c3c';

        var fillH = barH * fillRatio;
        ctx.fillStyle = fillColor;
        ctx.fillRect(barX, barY + barH - fillH, barW, fillH);
        ctx.restore();
    };

    /* カットイン描画 */
    KS.ui.drawCutIn = function(ctx) {
        var st = KS.state;
        var d = KS.data;
        if (!st.cutIn.active) return;

        ctx.save();

        var progress = 1 - (st.cutIn.timer / d.CUTIN_DURATION);
        ctx.globalAlpha = Math.max(0, 0.3 * (1 - progress));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, d.CANVAS_W, d.CANVAS_H);

        ctx.globalAlpha = Math.max(0, 1 - progress * 0.5);
        var imgKey = 'happy_' + st.cutIn.wigType;
        var img = KS.assets.images[imgKey] || KS.assets.images['playerHappy'];
        if (img) {
            var size = 250 + Math.sin(progress * Math.PI) * 20;
            ctx.drawImage(img,
                (d.CANVAS_W - size) / 2,
                (d.CANVAS_H - size) / 2 - 50,
                size, size
            );
        }

        ctx.globalAlpha = 1;
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText('NICE COMBO!!', d.CANVAS_W / 2, d.CANVAS_H / 2 + 100);
        ctx.fillText('NICE COMBO!!', d.CANVAS_W / 2, d.CANVAS_H / 2 + 100);

        ctx.restore();
    };

})();
