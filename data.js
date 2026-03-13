/**
 * data.js v1.1.0 — ジョーク演出強化
 */
"use strict";

(function() {
    var d = KS.data;

    d.CANVAS_W = 450;
    d.CANVAS_H = 800;

    d.PLAYER_W = 90;
    d.PLAYER_H = 90;
    d.PLAYER_GROUND_OFFSET = 110;
    d.PLAYER_LERP_SPEED = 0.4;
    d.PLAYER_HEAD_TOP_OFFSET = 8;

    d.WIG_W = 80;
    d.WIG_H = 44;
    d.WIG_STACK_W = 70;
    d.WIG_STACK_H = 38;
    d.STACK_OFFSET = 30;
    d.STACK_GAME_OVER_Y = 50;

    d.WIG_TYPES = [
        { id: 'regent',  name: 'リーゼント', minLevel: 1 },
        { id: 'blonde',  name: 'ブロンド',   minLevel: 1 },
        { id: 'red',     name: 'レッド',     minLevel: 1 },
        { id: 'bob',     name: 'ボブ',       minLevel: 3 },
        { id: 'afro',    name: 'アフロ',     minLevel: 5 }
    ];

    d.SPECIAL_TYPES = {
        obstacle: { id: 'obstacle', baseImage: 'wig_afro', spawnRate: 0.10, minLevel: 2 },
        bomb:     { id: 'bomb',     baseImage: 'wig_blonde', spawnRate: 0.08, minLevel: 3 }
    };

    d.SPAWN_BIAS_RATE = 0.40;

    d.SCORE = {
        CATCH: 10, MATCH_3: 300, MATCH_4: 500, MATCH_5_PLUS: 800,
        BOMB_CLEAR_PER_OBSTACLE: 50
    };
    d.getMatchScore = function(mc) {
        if (mc >= 5) return d.SCORE.MATCH_5_PLUS;
        if (mc === 4) return d.SCORE.MATCH_4;
        if (mc === 3) return d.SCORE.MATCH_3;
        return 0;
    };

    d.COMBO_WINDOW = 300;
    d.COMBO_MULTIPLIER = [1, 1.5, 2, 3, 5];
    d.getComboMultiplier = function(cc) {
        return d.COMBO_MULTIPLIER[Math.min(cc, d.COMBO_MULTIPLIER.length - 1)];
    };

    d.DIFFICULTY_TABLE = [
        { time:   0, fallSpeed: 2.0, spawnInterval: 72, wigTypeCount: 3, level: 1 },
        { time:  30, fallSpeed: 2.5, spawnInterval: 65, wigTypeCount: 3, level: 2 },
        { time:  60, fallSpeed: 3.0, spawnInterval: 58, wigTypeCount: 4, level: 3 },
        { time:  90, fallSpeed: 3.5, spawnInterval: 50, wigTypeCount: 4, level: 4 },
        { time: 120, fallSpeed: 4.0, spawnInterval: 42, wigTypeCount: 5, level: 5 },
        { time: 180, fallSpeed: 5.0, spawnInterval: 35, wigTypeCount: 5, level: 6 },
        { time: 240, fallSpeed: 6.0, spawnInterval: 30, wigTypeCount: 5, level: 7 }
    ];

    d.CUTIN_DURATION = 60;
    d.HAPPY_DURATION = 90;

    /* 背景 */
    d.BG_GRAD_TOP = '#667eea';
    d.BG_GRAD_BOTTOM = '#764ba2';
    d.GROUND_HEIGHT = 60;
    d.GROUND_COLOR = '#2d1b4e';
    d.GROUND_LINE_COLOR = '#8b5cf6';

    /* 演出定数 */
    d.SCREEN_SHAKE_CATCH = 3;
    d.SCREEN_SHAKE_MATCH = 8;
    d.SCREEN_SHAKE_OBSTACLE = 12;
    d.SCREEN_SHAKE_DURATION = 15;
    d.PARTICLE_COUNT_CATCH = 5;
    d.PARTICLE_COUNT_MATCH = 25;
    d.PARTICLE_COUNT_BOMB = 15;
    d.FLOATING_TEXT_DURATION = 60;
    d.BG_WIG_COUNT = 8;

    d.IMAGE_MANIFEST = {
        player:        'assets/img/player.webp',
        playerHappy:   'assets/img/player_happy.webp',
        wig_regent:    'assets/img/wig_regent.webp',
        wig_blonde:    'assets/img/wig_blonde.webp',
        wig_red:       'assets/img/wig_red.webp',
        wig_bob:       'assets/img/wig_bob.webp',
        wig_afro:      'assets/img/wig_afro.webp',
        happy_afro:    'assets/img/happy_afro.webp',
        happy_red:     'assets/img/happy_red.webp',
        happy_regent:  'assets/img/happy_regent.webp',
        happy_bob:     'assets/img/happy_bob.webp',
        happy_blonde:  'assets/img/happy_blonde.webp'
    };
})();
