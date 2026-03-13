/**
 * update.js — メインupdate関数
 * 読み込み順: 9番目
 * 責務: フレームごとのゲーム状態更新
 * サイズ目安: ~3KB
 */
"use strict";

(function() {

    function update() {
        var st = KS.state;
        if (!st) return;

        /* A-3対策: PLAYING以外では更新しない */
        if (st.current !== KS.GameStates.PLAYING) return;

        var d = KS.data;
        var p = st.player;

        /* ========================================
         * プレイヤー移動（D-4結論: lerp）
         * E-2対策: documentリスナーでcanvas外でも追従
         * ======================================== */
        var targetX = KS.input.pointerX - p.w / 2;
        p.x += (targetX - p.x) * d.PLAYER_LERP_SPEED;
        p.x = Math.max(0, Math.min(d.CANVAS_W - p.w, p.x));

        /* 向き判定 */
        if (KS.input.pointerX > KS.input.lastPointerX + 1) {
            p.facingRight = true;
        } else if (KS.input.pointerX < KS.input.lastPointerX - 1) {
            p.facingRight = false;
        }

        /* ========================================
         * 喜び演出タイマー
         * ======================================== */
        if (p.happyTimer > 0) {
            p.happyTimer--;
            if (p.happyTimer === 0) p.isHappy = false;
        }

        /* ========================================
         * カットインタイマー
         * ======================================== */
        if (st.cutIn.active) {
            st.cutIn.timer--;
            if (st.cutIn.timer <= 0) {
                st.cutIn.active = false;
            }
        }

        /* ========================================
         * 経過プレイ時間（難易度に使用）
         * ======================================== */
        st.elapsedPlayTime = KS.time.elapsed;

        /* ========================================
         * システム更新
         * ======================================== */
        KS.enemies.SpawnController.update();
        KS.systems.combo.update();

        /* 落下物の移動 */
        for (var i = 0; i < st.fallingWigs.length; i++) {
            st.fallingWigs[i].update();
        }
        /* 画面外の落下物を除去 */
        st.fallingWigs = st.fallingWigs.filter(function(w) { return w.alive; });

        /* 当たり判定 */
        KS.systems.collision.check();

        /* ゲームオーバー判定 */
        KS.systems.gameOverCheck();
    }

    /* メインループに登録 */
    KS.updateFn = update;

})();
