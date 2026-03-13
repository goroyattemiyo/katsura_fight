/**
 * render.js — メイン描画関数
 * 読み込み順: 10番目（最後）
 * 更新: v1.0.1 — imageKey対応、エフェクト画像利用
 */
"use strict";

(function() {

    function render() {
        var st = KS.state;
        var ctx = KS.ctx;
        var d = KS.data;
        if (!st || !ctx) return;

        ctx.clearRect(0, 0, d.CANVAS_W, d.CANVAS_H);

        switch (st.current) {
            case KS.GameStates.LOADING:
                KS.uiScreens.drawLoading(ctx);
                break;

            case KS.GameStates.TITLE:
                KS.uiScreens.drawTitle(ctx);
                break;

            case KS.GameStates.PLAYING:
                renderGame(ctx, st, d);
                break;

            case KS.GameStates.GAMEOVER:
                renderGame(ctx, st, d);
                KS.uiScreens.drawGameOver(ctx);
                break;
        }
    }

    function renderGame(ctx, st, d) {
        var grad = ctx.createLinearGradient(0, 0, 0, d.CANVAS_H);
        grad.addColorStop(0, '#dfe6e9');
        grad.addColorStop(1, '#b2bec3');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, d.CANVAS_W, d.CANVAS_H);

        /* ゲームオーバーライン */
        ctx.save();
        ctx.strokeStyle = 'rgba(231, 76, 60, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, d.STACK_GAME_OVER_Y);
        ctx.lineTo(d.CANVAS_W, d.STACK_GAME_OVER_Y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        renderPlayer(ctx, st, d);
        renderStack(ctx, st, d);
        renderFallingWigs(ctx, st, d);
        KS.ui.drawCutIn(ctx);
        KS.ui.drawHUD(ctx);
    }

    function renderPlayer(ctx, st, d) {
        var p = st.player;
        var imgKey = p.isHappy ? 'playerHappy' : 'player';
        var img = KS.assets.images[imgKey];

        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        if (p.facingRight) ctx.scale(-1, 1);
        if (p.isHappy) ctx.translate(0, Math.sin(KS.time.frameCount * 0.15) * 5);

        if (img) {
            ctx.drawImage(img, -p.w / 2, -p.h / 2, p.w, p.h);
        } else {
            ctx.fillStyle = '#3498db';
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PLAYER', 0, 5);
        }
        ctx.restore();
    }

    function renderStack(ctx, st, d) {
        var p = st.player;
        var stack = p.stack;

        for (var i = 0; i < stack.length; i++) {
            var item = stack[i];
            var drawX = p.x + (p.w - d.WIG_W) / 2;
            var drawY = p.y - (i + 1) * d.STACK_OFFSET + 15;
            renderWigItem(ctx, item.imageKey, drawX, drawY, 0);
        }
    }

    function renderFallingWigs(ctx, st, d) {
        for (var i = 0; i < st.fallingWigs.length; i++) {
            var w = st.fallingWigs[i];
            renderWigItem(ctx, w.imageKey, w.x, w.y, w.rotation);
        }
    }

    function renderWigItem(ctx, imageKey, x, y, rot) {
        var d = KS.data;
        ctx.save();
        ctx.translate(x + d.WIG_W / 2, y + d.WIG_H / 2);
        if (rot) ctx.rotate(rot);

        var img = KS.assets.images[imageKey];
        if (img) {
            ctx.drawImage(img, -d.WIG_W / 2, -d.WIG_H / 2, d.WIG_W, d.WIG_H);
        } else {
            /* プレースホルダー */
            var isBomb = (imageKey === 'bomb');
            var isObstacle = (imageKey === 'obstacle');
            if (isBomb) {
                ctx.fillStyle = '#f1c40f';
            } else if (isObstacle) {
                ctx.fillStyle = '#2c3e50';
            } else {
                ctx.fillStyle = '#9b59b6';
            }
            ctx.fillRect(-d.WIG_W / 2, -d.WIG_H / 2, d.WIG_W, d.WIG_H);

            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            var label = isBomb ? 'BOMB' : (isObstacle ? 'BLOCK' : (imageKey || '?').toUpperCase());
            ctx.fillText(label, 0, 0);
        }

        ctx.restore();
    }

    KS.renderFn = render;

    /* ブートシーケンス起動 */
    KS.boot();

})();
