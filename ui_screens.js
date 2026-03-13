/**
 * ui_screens.js — タイトル画面、ゲームオーバー画面、ローディング画面
 * 読み込み順: 8番目
 * 責務: 画面遷移ごとの描画とクリック処理
 * サイズ目安: ~6KB
 */
"use strict";

(function() {

    KS.uiScreens = {

        /* ========================================
         * ローディング画面
         * ======================================== */
        drawLoading: function(ctx) {
            var d = KS.data;
            var progress = KS.assets.total > 0
                ? KS.assets.progress / KS.assets.total
                : 0;

            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, d.CANVAS_W, d.CANVAS_H);

            ctx.font = 'bold 28px Arial';
            ctx.fillStyle = '#f1c40f';
            ctx.textAlign = 'center';
            ctx.fillText('Loading...', d.CANVAS_W / 2, d.CANVAS_H / 2 - 30);

            /* プログレスバー */
            var barW = 200;
            var barH = 12;
            var barX = (d.CANVAS_W - barW) / 2;
            var barY = d.CANVAS_H / 2;

            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(barX, barY, barW, barH);

            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(barX, barY, barW * progress, barH);

            ctx.font = '14px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(Math.floor(progress * 100) + '%', d.CANVAS_W / 2, barY + 35);
        },

        /* ========================================
         * タイトル画面
         * ======================================== */
        drawTitle: function(ctx) {
            var d = KS.data;
            var fc = KS.time.frameCount;

            /* 背景 */
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, d.CANVAS_W, d.CANVAS_H);

            /* タイトル */
            ctx.save();
            var titleScale = 1 + Math.sin(fc * 0.03) * 0.03;
            ctx.translate(d.CANVAS_W / 2, d.CANVAS_H * 0.3);
            ctx.scale(titleScale, titleScale);
            ctx.font = 'bold 42px Arial';
            ctx.fillStyle = '#f1c40f';
            ctx.strokeStyle = '#e67e22';
            ctx.lineWidth = 3;
            ctx.textAlign = 'center';
            ctx.strokeText('Wig Stack!', 0, 0);
            ctx.fillText('Wig Stack!', 0, 0);
            ctx.restore();

            /* サブタイトル */
            ctx.font = '16px Arial';
            ctx.fillStyle = '#bdc3c7';
            ctx.textAlign = 'center';
            ctx.fillText('カツラ・スタック・パズル DX', d.CANVAS_W / 2, d.CANVAS_H * 0.3 + 40);

            /* スタートボタン */
            var btnW = 220;
            var btnH = 55;
            var btnX = (d.CANVAS_W - btnW) / 2;
            var btnY = d.CANVAS_H * 0.55;
            var pulse = 1 + Math.sin(fc * 0.05) * 0.02;

            ctx.save();
            ctx.translate(btnX + btnW / 2, btnY + btnH / 2);
            ctx.scale(pulse, pulse);

            /* ボタン背景 */
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            KS.uiScreens._roundRect(ctx, -btnW / 2, -btnH / 2, btnW, btnH, 27);
            ctx.fill();

            /* ボタンテキスト */
            ctx.font = 'bold 22px Arial';
            ctx.fillStyle = '#2c3e50';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('TAP TO START', 0, 0);
            ctx.restore();

            /* ボタンの当たり判定領域を保存（クリック判定用） */
            KS.uiScreens._titleBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

            /* ハイスコア */
            if (KS.state.highScore > 0) {
                ctx.font = '16px Arial';
                ctx.fillStyle = '#f39c12';
                ctx.textAlign = 'center';
                ctx.fillText('HIGH SCORE: ' + KS.state.highScore, d.CANVAS_W / 2, d.CANVAS_H * 0.72);
            }

            /* 操作説明 */
            ctx.font = '13px Arial';
            ctx.fillStyle = '#7f8c8d';
            ctx.fillText('マウス or タッチで移動', d.CANVAS_W / 2, d.CANVAS_H * 0.85);
            ctx.fillText('カツラをキャッチして3つ揃えよう！', d.CANVAS_W / 2, d.CANVAS_H * 0.89);
        },

        _titleBtnRect: { x: 0, y: 0, w: 0, h: 0 },

        /* ========================================
         * ゲームオーバー画面
         * ======================================== */
        drawGameOver: function(ctx) {
            var d = KS.data;
            var st = KS.state;
            var fc = KS.time.frameCount;

            /* 半透明オーバーレイ */
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, d.CANVAS_W, d.CANVAS_H);

            /* タイトル */
            ctx.font = 'bold 36px Arial';
            ctx.fillStyle = '#e74c3c';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.textAlign = 'center';
            ctx.strokeText('GAME OVER', d.CANVAS_W / 2, d.CANVAS_H * 0.3);
            ctx.fillText('GAME OVER', d.CANVAS_W / 2, d.CANVAS_H * 0.3);

            /* スコア */
            ctx.font = 'bold 28px Arial';
            ctx.fillStyle = '#f1c40f';
            ctx.lineWidth = 3;
            ctx.strokeText('SCORE: ' + st.score, d.CANVAS_W / 2, d.CANVAS_H * 0.42);
            ctx.fillText('SCORE: ' + st.score, d.CANVAS_W / 2, d.CANVAS_H * 0.42);

            /* ハイスコア */
            ctx.font = '18px Arial';
            ctx.fillStyle = '#f39c12';
            ctx.fillText('HIGH SCORE: ' + st.highScore, d.CANVAS_W / 2, d.CANVAS_H * 0.5);

            /* リトライボタン */
            var btnW = 200;
            var btnH = 50;
            var btnX = (d.CANVAS_W - btnW) / 2;
            var btnY = d.CANVAS_H * 0.6;
            var pulse = 1 + Math.sin(fc * 0.05) * 0.02;

            ctx.save();
            ctx.translate(btnX + btnW / 2, btnY + btnH / 2);
            ctx.scale(pulse, pulse);

            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            KS.uiScreens._roundRect(ctx, -btnW / 2, -btnH / 2, btnW, btnH, 25);
            ctx.fill();

            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = '#2c3e50';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('RETRY', 0, 0);
            ctx.restore();

            KS.uiScreens._retryBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };
        },

        _retryBtnRect: { x: 0, y: 0, w: 0, h: 0 },

        /* ========================================
         * クリック判定
         * ======================================== */
        handleClick: function(logicalX, logicalY) {
            var st = KS.state;

            if (st.current === KS.GameStates.TITLE) {
                var btn = KS.uiScreens._titleBtnRect;
                if (logicalX >= btn.x && logicalX <= btn.x + btn.w &&
                    logicalY >= btn.y && logicalY <= btn.y + btn.h) {
                    KS.uiScreens._startGame();
                }
            } else if (st.current === KS.GameStates.GAMEOVER) {
                var btn2 = KS.uiScreens._retryBtnRect;
                if (logicalX >= btn2.x && logicalX <= btn2.x + btn2.w &&
                    logicalY >= btn2.y && logicalY <= btn2.y + btn2.h) {
                    KS.uiScreens._startGame();
                }
            }
        },

        _startGame: async function() {
            /* D-1(audio)対策: ユーザージェスチャー内でaudio初期化 */
            await KS.AudioManager.init();

            /* A-1, A-2対策: 全リセット */
            KS.state.startGame();
            KS.enemies.SpawnController.reset();
            KS.systems.combo.reset();
            KS.time.elapsed = 0;
        },

        /* ========================================
         * ユーティリティ: 角丸矩形
         * ======================================== */
        _roundRect: function(ctx, x, y, w, h, r) {
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }
    };

    /* ========================================
     * クリックイベント登録
     * ======================================== */
    document.addEventListener('pointerdown', function(e) {
        var logical = KS.CanvasManager.clientToLogical(e.clientX, e.clientY);
        KS.uiScreens.handleClick(logical.x, logical.y);
    });

})();
