/**
 * data.js — ゲーム定数、バランステーブル、アセットマニフェスト
 * 読み込み順: 2番目（game.js の後）
 * 責務: 調整可能な全数値の一元管理
 * v1.0.3 — obstacle画像をMANIFESTから削除（エフェクト生成に統一）
 */
"use strict";

(function() {
    var d = KS.data;

    /* ========================================
     * Canvas 定数
     * ======================================== */
    d.CANVAS_W = 450;
    d.CANVAS_H = 800;

    /* ========================================
     * プレイヤー定数
     * ======================================== */
    d.PLAYER_W = 75;
    d.PLAYER_H = 75;
    d.PLAYER_GROUND_OFFSET = 100;
    d.PLAYER_LERP_SPEED = 0.4;

    /* ========================================
     * カツラ定数
     * ======================================== */
    d.WIG_W = 90;
    d.WIG_H = 60;
    d.STACK_OFFSET = 28;
    d.STACK_GAME_OVER_Y = 30;

    /* ========================================
     * カツラタイプ定義
     * ======================================== */
    d.WIG_TYPES = [
        { id: 'regent',  name: 'リーゼント', minLevel: 1 },
        { id: 'blonde',  name: 'ブロンド',   minLevel: 1 },
        { id: 'red',     name: 'レッド',     minLevel: 1 },
        { id: 'bob',     name: 'ボブ',       minLevel: 3 },
        { id: 'afro',    name: 'アフロ',     minLevel: 5 }
    ];

    /* ========================================
     * 特殊アイテム定義
     * DP-1結論更新: obstacle/bomb ともにエフェクト生成に統一
     * （wig_obstacle.webp は v1.0.3 で削除済み）
     * ======================================== */
    d.SPECIAL_TYPES = {
        obstacle: {
            id: 'obstacle',
            baseImage: 'wig_afro',
            spawnRate: 0.10,
            minLevel: 2
        },
        bomb: {
            id: 'bomb',
            baseImage: 'wig_blonde',
            spawnRate: 0.08,
            minLevel: 3
        }
    };

    /* ========================================
     * スコアリングテーブル
     * ======================================== */
    d.SCORE = {
        CATCH: 10,
        MATCH_3: 300,
        MATCH_4: 500,
        MATCH_5_PLUS: 800,
        BOMB_CLEAR_PER_OBSTACLE: 50
    };

    d.getMatchScore = function(matchCount) {
        if (matchCount >= 5) return d.SCORE.MATCH_5_PLUS;
        if (matchCount === 4) return d.SCORE.MATCH_4;
        if (matchCount === 3) return d.SCORE.MATCH_3;
        return 0;
    };

    /* ========================================
     * コンボテーブル
     * ======================================== */
    d.COMBO_WINDOW = 300;
    d.COMBO_MULTIPLIER = [1, 1.5, 2, 3, 5];

    d.getComboMultiplier = function(comboCount) {
        var idx = Math.min(comboCount, d.COMBO_MULTIPLIER.length - 1);
        return d.COMBO_MULTIPLIER[idx];
    };

    /* ========================================
     * 難易度テーブル
     * ======================================== */
    d.DIFFICULTY_TABLE = [
        { time:   0, fallSpeed: 2.0, spawnInterval: 72, wigTypeCount: 3, level: 1 },
        { time:  30, fallSpeed: 2.5, spawnInterval: 65, wigTypeCount: 3, level: 2 },
        { time:  60, fallSpeed: 3.0, spawnInterval: 58, wigTypeCount: 4, level: 3 },
        { time:  90, fallSpeed: 3.5, spawnInterval: 50, wigTypeCount: 4, level: 4 },
        { time: 120, fallSpeed: 4.0, spawnInterval: 42, wigTypeCount: 5, level: 5 },
        { time: 180, fallSpeed: 5.0, spawnInterval: 35, wigTypeCount: 5, level: 6 },
        { time: 240, fallSpeed: 6.0, spawnInterval: 30, wigTypeCount: 5, level: 7 }
    ];

    /* ========================================
     * 演出定数
     * ======================================== */
    d.CUTIN_DURATION = 50;
    d.HAPPY_DURATION = 90;

    /* ========================================
     * 画像マニフェスト
     * v1.0.3: obstacle を削除（エフェクト生成に統一）
     * bomb は引き続きエフェクト生成のためMANIFESTには含めない
     * ======================================== */
    d.IMAGE_MANIFEST = {
        /* プレイヤー */
        player:        'assets/img/player.webp',
        playerHappy:   'assets/img/player_happy.webp',

        /* カツラ */
        wig_regent:    'assets/img/wig_regent.webp',
        wig_blonde:    'assets/img/wig_blonde.webp',
        wig_red:       'assets/img/wig_red.webp',
        wig_bob:       'assets/img/wig_bob.webp',
        wig_afro:      'assets/img/wig_afro.webp',

        /* カットイン（喜び） */
        happy_afro:    'assets/img/happy_afro.webp',
        happy_red:     'assets/img/happy_red.webp',
        happy_regent:  'assets/img/happy_regent.webp',
        happy_bob:     'assets/img/happy_bob.webp',
        happy_blonde:  'assets/img/happy_blonde.webp'
    };

})();
