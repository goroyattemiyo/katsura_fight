/**
 * update.js v1.1.0 — エフェクト更新追加
 */
"use strict";

(function() {

    function update() {
        var st = KS.state;
        if (!st) return;

        /* エフェクト更新（全状態で動かす） */
        if (KS.systems.fx) {
            KS.systems.fx.updateParticles();
            KS.systems.fx.updateShake();
            KS.systems.fx.updateFloatingTexts();
            KS.systems.fx.updateBgWigs();
        }

        if (st.current !== KS.GameStates.PLAYING) return;

        var d = KS.data;
        var p = st.player;

        /* プレイヤー移動 */
        var targetX = KS.input.pointerX - p.w / 2;
        p.x += (targetX - p.x) * d.PLAYER_LERP_SPEED;
        p.x = Math.max(0, Math.min(d.CANVAS_W - p.w, p.x));
        if (KS.input.pointerX > KS.input.lastPointerX + 2) p.facingRight = true;
        else if (KS.input.pointerX < KS.input.lastPointerX - 2) p.facingRight = false;

        /* タイマー */
        if (p.happyTimer > 0) { p.happyTimer--; if (p.happyTimer <= 0) p.isHappy = false; }
        if (st.cutIn.timer > 0) { st.cutIn.timer--; if (st.cutIn.timer <= 0) st.cutIn.active = false; }

        st.elapsedPlayTime = KS.time.elapsed;

        /* システム更新 */
        KS.enemies.SpawnController.update();
        KS.systems.combo.update();
        for (var i = st.fallingWigs.length - 1; i >= 0; i--) {
            st.fallingWigs[i].update();
            if (!st.fallingWigs[i].alive) st.fallingWigs.splice(i, 1);
        }
        KS.systems.collision.check();
        KS.systems.gameOverCheck();
    }

    KS.updateFn = update;

})();
