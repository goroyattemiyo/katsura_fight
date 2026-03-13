/**
 * render.js v1.1.0 — 演出強化
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
            case KS.GameStates.GAMEOVER_ANIM:
                renderGame(ctx, st, d);
                /* 徐々に暗くなるオーバーレイ */
                var animProgress = 1 - (st.gameOverAnimTimer / 150);
                ctx.fillStyle = 'rgba(0, 0, 0, ' + (animProgress * 0.5).toFixed(2) + ')';
                ctx.fillRect(0, 0, d.CANVAS_W, d.CANVAS_H);
                /* GAME OVER テキストをフェードイン */
                if (animProgress > 0.3) {
                    var textAlpha = Math.min(1, (animProgress - 0.3) / 0.3);
                    ctx.save();
                    ctx.globalAlpha = textAlpha;
                    ctx.font = 'bold 48px Arial';
                    ctx.fillStyle = '#e74c3c';
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 5;
                    ctx.textAlign = 'center';
                    var textY = d.CANVAS_H * 0.35;
                    var bounce = Math.sin(animProgress * Math.PI * 2) * 10 * (1 - animProgress);
                    ctx.strokeText('GAME OVER', d.CANVAS_W / 2, textY + bounce);
                    ctx.fillText('GAME OVER', d.CANVAS_W / 2, textY + bounce);
                    ctx.restore();
                }
                break;
            case KS.GameStates.GAMEOVER:
                renderGame(ctx, st, d);
                KS.uiScreens.drawGameOver(ctx);
                break;
        }
    }

    function renderGame(ctx, st, d) {
        ctx.save();
        /* スクリーンシェイク適用 */
        if (st.screenShake && st.screenShake.timer > 0) {
            ctx.translate(st.screenShake.x, st.screenShake.y);
        }

        /* 背景 */
        var grad = ctx.createLinearGradient(0, 0, 0, d.CANVAS_H);
        grad.addColorStop(0, d.BG_GRAD_TOP);
        grad.addColorStop(1, d.BG_GRAD_BOTTOM);
        ctx.fillStyle = grad;
        ctx.fillRect(-20, -20, d.CANVAS_W + 40, d.CANVAS_H + 40);

        /* 背景ウィッグ */
        renderBgWigs(ctx, st);

        /* 地面 */
        var groundY = d.CANVAS_H - d.GROUND_HEIGHT;
        ctx.fillStyle = d.GROUND_COLOR;
        ctx.fillRect(0, groundY, d.CANVAS_W, d.GROUND_HEIGHT);
        ctx.strokeStyle = d.GROUND_LINE_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(d.CANVAS_W, groundY);
        ctx.stroke();
        ctx.fillStyle = d.GROUND_LINE_COLOR;
        for (var gx = 20; gx < d.CANVAS_W; gx += 40) {
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(gx, groundY + 30, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

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
        ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('DANGER', d.CANVAS_W - 8, d.STACK_GAME_OVER_Y - 4);
        ctx.restore();

        renderPlayer(ctx, st, d);
        renderStack(ctx, st, d);
        renderFallingWigs(ctx, st, d);
        renderParticles(ctx, st);
        renderFloatingTexts(ctx, st);
        KS.ui.drawCutIn(ctx);
        KS.ui.drawHUD(ctx);

        ctx.restore(); /* シェイク解除 */
    }

    function renderBgWigs(ctx, st) {
        if (!st.bgWigs) return;
        for (var i = 0; i < st.bgWigs.length; i++) {
            var bw = st.bgWigs[i];
            var img = KS.assets.images[bw.imageKey];
            if (!img) continue;
            ctx.save();
            ctx.globalAlpha = bw.alpha;
            ctx.translate(bw.x, bw.y);
            ctx.rotate(bw.rotation);
            ctx.drawImage(img, -bw.size / 2, -bw.size / 2, bw.size, bw.size * 0.55);
            ctx.restore();
        }
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
        }
        ctx.restore();
    }

    function renderStack(ctx, st, d) {
        var p = st.player;
        for (var i = 0; i < p.stack.length; i++) {
            var drawX = p.x + (p.w - d.WIG_STACK_W) / 2;
            var headTopY = p.y + d.PLAYER_HEAD_TOP_OFFSET;
            var drawY = headTopY - (i + 1) * d.STACK_OFFSET;
            /* 微妙な揺れ（上に行くほど揺れる） */
            var wobble = Math.sin(KS.time.frameCount * 0.05 + i * 0.8) * (i * 0.5);
            renderStackWig(ctx, p.stack[i].imageKey, drawX + wobble, drawY);
        }
    }

    function renderFallingWigs(ctx, st, d) {
        for (var i = 0; i < st.fallingWigs.length; i++) {
            var w = st.fallingWigs[i];
            ctx.save();
            ctx.translate(w.x + d.WIG_W / 2, w.y + d.WIG_H / 2);
            if (w.rotation) ctx.rotate(w.rotation);
            var img = KS.assets.images[w.imageKey];
            if (img) {
                ctx.drawImage(img, -d.WIG_W / 2, -d.WIG_H / 2, d.WIG_W, d.WIG_H);
            } else {
                ctx.fillStyle = w.isBomb ? '#f1c40f' : (w.isObstacle ? '#2c3e50' : '#9b59b6');
                ctx.fillRect(-d.WIG_W / 2, -d.WIG_H / 2, d.WIG_W, d.WIG_H);
                ctx.fillStyle = '#fff';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(w.isBomb ? 'BOMB' : (w.isObstacle ? 'BLOCK' : w.imageKey), 0, 0);
            }
            ctx.restore();
        }
    }

    function renderStackWig(ctx, imageKey, x, y) {
        var d = KS.data;
        var img = KS.assets.images[imageKey];
        if (img) {
            ctx.drawImage(img, x, y, d.WIG_STACK_W, d.WIG_STACK_H);
        } else {
            ctx.fillStyle = '#9b59b6';
            ctx.fillRect(x, y, d.WIG_STACK_W, d.WIG_STACK_H);
        }
    }

    function renderParticles(ctx, st) {
        var pts = st.particles;
        for (var i = 0; i < pts.length; i++) {
            var p = pts[i];
            var alpha = p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation || 0);

            if (p.type === 'star') {
                drawStar(ctx, 0, 0, p.size / 2, p.color);
            } else if (p.type === 'wig' && p.imageKey) {
                var img = KS.assets.images[p.imageKey];
                if (img) {
                    ctx.drawImage(img, -p.size / 2, -p.size * 0.275, p.size, p.size * 0.55);
                }
            } else {
                ctx.fillStyle = p.color || '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    function drawStar(ctx, x, y, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (var i = 0; i < 5; i++) {
            var angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
            if (i === 0) ctx.moveTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
            else ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
    }

    function renderFloatingTexts(ctx, st) {
        var fts = st.floatingTexts;
        for (var i = 0; i < fts.length; i++) {
            var ft = fts[i];
            var alpha = ft.life / ft.maxLife;
            var scale = 1 + (1 - alpha) * 0.3;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(ft.x, ft.y);
            ctx.scale(scale, scale);
            ctx.font = 'bold ' + ft.fontSize + 'px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeText(ft.text, 0, 0);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, 0, 0);
            ctx.restore();
        }
    }

    KS.renderFn = render;
    KS.boot();

})();
