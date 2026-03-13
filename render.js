/**
 * render.js — メイン描画関数
 * 読み込み順: 10番目（最後）
 * v1.0.5 — カツラフィッティング、背景改善、地面描画
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
        /* 背景グラデーション */
        var grad = ctx.createLinearGradient(0, 0, 0, d.CANVAS_H);
        grad.addColorStop(0, d.BG_GRAD_TOP);
        grad.addColorStop(1, d.BG_GRAD_BOTTOM);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, d.CANVAS_W, d.CANVAS_H);

        /* 地面 */
        var groundY = d.CANVAS_H - d.GROUND_HEIGHT;
        ctx.fillStyle = d.GROUND_COLOR;
        ctx.fillRect(0, groundY, d.CANVAS_W, d.GROUND_HEIGHT);
        /* 地面ライン */
        ctx.strokeStyle = d.GROUND_LINE_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(d.CANVAS_W, groundY);
        ctx.stroke();
        /* 地面パターン（ドット） */
        ctx.fillStyle = d.GROUND_LINE_COLOR;
        for (var gx = 20; gx < d.CANVAS_W; gx += 40) {
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(gx, groundY + 30, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        /* ゲームオーバーライン */
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(0, d.STACK_GAME_OVER_Y);
        ctx.lineTo(d.CANVAS_W, d.STACK_GAME_OVER_Y);
        ctx.stroke();
        ctx.setLineDash([]);
        /* DANGER ラベル */
        ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('DANGER', d.CANVAS_W - 8, d.STACK_GAME_OVER_Y - 4);
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
        if (p.isHappy) ctx.translate(0, Math.sin(KS.time.frameCount * 0.15) * 3);

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
            /* カツラをプレイヤー頭頂中央に配置 */
            var drawX = p.x + (p.w - d.WIG_STACK_W) / 2;
            var headTopY = p.y + d.PLAYER_HEAD_TOP_OFFSET;
            var drawY = headTopY - (i + 1) * d.STACK_OFFSET;

            renderStackWigItem(ctx, item.imageKey, drawX, drawY);
        }
    }

    function renderFallingWigs(ctx, st, d) {
        for (var i = 0; i < st.fallingWigs.length; i++) {
            var w = st.fallingWigs[i];
            renderFallingWigItem(ctx, w.imageKey, w.x, w.y, w.rotation);
        }
    }

    /* 落下中のカツラ描画（WIG_W x WIG_H） */
    function renderFallingWigItem(ctx, imageKey, x, y, rot) {
        var d = KS.data;
        ctx.save();
        ctx.translate(x + d.WIG_W / 2, y + d.WIG_H / 2);
        if (rot) ctx.rotate(rot);

        var img = KS.assets.images[imageKey];
        if (img) {
            ctx.drawImage(img, -d.WIG_W / 2, -d.WIG_H / 2, d.WIG_W, d.WIG_H);
        } else {
            var isBomb = (imageKey === 'bomb');
            var isObstacle = (imageKey === 'obstacle');
            ctx.fillStyle = isBomb ? '#f1c40f' : (isObstacle ? '#2c3e50' : '#9b59b6');
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

    /* スタック上のカツラ描画（WIG_STACK_W x WIG_STACK_H） */
    function renderStackWigItem(ctx, imageKey, x, y) {
        var d = KS.data;
        ctx.save();
        ctx.translate(x + d.WIG_STACK_W / 2, y + d.WIG_STACK_H / 2);

        var img = KS.assets.images[imageKey];
        if (img) {
            ctx.drawImage(img, -d.WIG_STACK_W / 2, -d.WIG_STACK_H / 2, d.WIG_STACK_W, d.WIG_STACK_H);
        } else {
            var isBomb = (imageKey === 'bomb');
            var isObstacle = (imageKey === 'obstacle');
            ctx.fillStyle = isBomb ? '#f1c40f' : (isObstacle ? '#2c3e50' : '#9b59b6');
            ctx.fillRect(-d.WIG_STACK_W / 2, -d.WIG_STACK_H / 2, d.WIG_STACK_W, d.WIG_STACK_H);
            ctx.fillStyle = '#ffffff';
            ctx.font = '9px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(imageKey || '?', 0, 0);
        }
        ctx.restore();
    }

    KS.renderFn = render;

    /* ブートシーケンス起動 */
    KS.boot();

})();
