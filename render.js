/**
 * render.js — メイン描画関数
 * 読み込み順: 10番目（最後）
 * 責務: フレームごとの描画、ブートシーケンス起動
 * サイズ目安: ~6KB
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
        grad.addColorStop(0, '#dfe6e9');
        grad.addColorStop(1, '#b2bec3');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, d.CANVAS_W, d.CANVAS_H);

        /* ゲームオーバーライン（警告線） */
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

        /* プレイヤー描画 */
        renderPlayer(ctx, st, d);

        /* スタック描画 */
        renderStack(ctx, st, d);

        /* 落下物描画 */
        renderFallingWigs(ctx, st, d);

        /* カットイン */
        KS.ui.drawCutIn(ctx);

        /* HUD */
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
            /* プレースホルダー */
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

            renderWigItem(ctx, item.type, drawX, drawY, 0, item.isObstacle, false);
        }
    }

    function renderFallingWigs(ctx, st, d) {
        for (var i = 0; i < st.fallingWigs.length; i++) {
            var w = st.fallingWigs[i];
            renderWigItem(ctx, w.type, w.x, w.y, w.rotation, w.isObstacle, w.isBomb);
        }
    }

    function renderWigItem(ctx, type, x, y, rot, isObstacle, isBomb) {
        var d = KS.data;
        ctx.save();
        ctx.translate(x + d.WIG_W / 2, y + d.WIG_H / 2);
        if (rot) ctx.rotate(rot);

        var img = KS.assets.images[type];
        if (img) {
            ctx.drawImage(img, -d.WIG_W / 2, -d.WIG_H / 2, d.WIG_W, d.WIG_H);
        } else {
            /* プレースホルダー描画（C-3対策: ctx.filterは使わない） */
            if (isBomb) {
                ctx.fillStyle = '#e74c3c';
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
            var label = isBomb ? 'BOMB' : (isObstacle ? 'BLOCK' : type.toUpperCase());
            ctx.fillText(label, 0, 0);
        }

        ctx.restore();
    }

    /* メインループに登録 */
    KS.renderFn = render;

    /* ========================================
     * ブートシーケンス起動
     * （render.jsが最後に読み込まれるファイルなので、ここで起動）
     * ======================================== */
    KS.boot();

})();
