/**
 * update.js — メインupdate関数
 * 読み込み順: 9番目
 * v1.0.2 — BUG-5: 二重フィルタ削除（collision.check内に一本化）
 */
"use strict";

(function() {

    function update() {
        var st = KS.state;
        if (!st) return;

        if (st.current !== KS.GameStates.PLAYING) return;

        var d = KS.data;
        var p = st.player;

        /* プレイヤー移動（lerp） */
        var targetX = KS.input.pointerX - p.w / 2;
        p.x += (targetX - p.x) * d.PLAYER_LERP_SPEED;
        p.x = Math.max(0, Math.min(d.CANVAS_W - p.w, p.x));

        /* 向き判定 */
        if (KS.input.pointerX > KS.input.lastPointerX + 1) {
            p.facingRight = true;
        } else if (KS.input.pointerX < KS.input.lastPointerX - 1) {
            p.facingRight = false;
        }

        /* 喜び演出タイマー */
        if (p.happyTimer > 0) {
            p.happyTimer--;
            if (p.happyTimer === 0) p.isHappy = false;
        }

        /* カットインタイマー */
        if (st.cutIn.active) {
            st.cutIn.timer--;
            if (st.cutIn.timer <= 0) {
                st.cutIn.active = false;
            }
        }

        /* 経過プレイ時間 */
        st.elapsedPlayTime = KS.time.elapsed;

        /* システム更新 */
        KS.enemies.SpawnController.update();
        KS.systems.combo.update();

        /* 落下物の移動 */
        for (var i = 0; i < st.fallingWigs.length; i++) {
            st.fallingWigs[i].update();
        }

        /*
         * BUG-5修正: ここにあった fallingWigs.filter() を削除。
         * 画面外の alive=false 設定は FallingWig.update() が行い、
         * filter はcollision.check() 内で一括実行される。
         */

        /* 当たり判定（内部で alive=false のカツラも除去される） */
        KS.systems.collision.check();

        /* ゲームオーバー判定 */
        KS.systems.gameOverCheck();
    }

    KS.updateFn = update;

})();
