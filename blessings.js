/**
 * blessings.js — BGM管理（Web Audio API オシレーター生成）
 * 読み込み順: 4番目
 * v1.0.8 — レベル連動テンポ変化
 * 著作権: コロベイニキ（1843年）パブリックドメイン
 */
"use strict";

(function() {

    var MELODY = [
        ['E4', 1], ['B3', 0.5], ['C4', 0.5], ['D4', 1], ['C4', 0.5], ['B3', 0.5],
        ['A3', 1], ['A3', 0.5], ['C4', 0.5], ['E4', 1], ['D4', 0.5], ['C4', 0.5],
        ['B3', 1.5], ['C4', 0.5], ['D4', 1], ['E4', 1],
        ['C4', 1], ['A3', 1], ['A3', 2],
        ['_', 0.5], ['D4', 1], ['F4', 0.5], ['A4', 1], ['G4', 0.5], ['F4', 0.5],
        ['E4', 1.5], ['C4', 0.5], ['E4', 1], ['D4', 0.5], ['C4', 0.5],
        ['B3', 1], ['B3', 0.5], ['C4', 0.5], ['D4', 1], ['E4', 1],
        ['C4', 1], ['A3', 1], ['A3', 2]
    ];

    var BASS = [
        ['E2', 2], ['A2', 2], ['G#2', 2], ['A2', 1], ['C3', 1],
        ['D3', 2], ['C3', 2], ['B2', 2], ['A2', 2],
        ['D3', 2], ['F3', 2], ['C3', 2], ['A2', 1], ['C3', 1],
        ['B2', 2], ['E3', 2], ['A2', 2], ['A2', 2]
    ];

    var NOTE_FREQ = {
        '_': 0,
        'A2': 110.00, 'B2': 123.47, 'C3': 130.81, 'D3': 146.83,
        'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'G#2': 103.83,
        'A3': 220.00, 'B3': 246.94, 'C4': 261.63, 'D4': 293.66,
        'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00
    };

    /* レベル別BPMテーブル */
    var LEVEL_BPM = {
        1: 130,
        2: 140,
        3: 150,
        4: 165,
        5: 180,
        6: 200,
        7: 220
    };

    var BASE_BPM = 130;

    var bgmState = {
        playing: false,
        melodyTimeout: null,
        volume: 0.08,
        currentBPM: BASE_BPM
    };

    function getCurrentBPM() {
        if (!KS.state) return BASE_BPM;
        var level = KS.state.difficultyLevel || 1;
        return LEVEL_BPM[level] || BASE_BPM;
    }

    function playNote(actx, freq, startTime, duration, type, vol) {
        if (freq === 0) return;
        try {
            var osc = actx.createOscillator();
            var gain = actx.createGain();
            osc.type = type || 'square';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(vol, startTime);
            gain.gain.setValueAtTime(vol, startTime + duration * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.95);
            osc.connect(gain);
            gain.connect(actx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration);
            osc.onended = function() {
                osc.disconnect();
                gain.disconnect();
            };
        } catch (e) {}
    }

    function scheduleTrack(actx, notes, type, vol, bpm) {
        var beatSec = 60 / bpm;
        var startTime = actx.currentTime + 0.05;
        var currentTime = startTime;
        for (var i = 0; i < notes.length; i++) {
            var freq = NOTE_FREQ[notes[i][0]] || 0;
            var dur = notes[i][1] * beatSec;
            playNote(actx, freq, currentTime, dur, type, vol);
            currentTime += dur;
        }
        return (currentTime - startTime) * 1000;
    }

    function startLoop() {
        if (!bgmState.playing) return;
        var actx = KS.audio.ctx;
        if (!actx || actx.state === 'suspended') return;

        /* ループ開始時に現在レベルのBPMを取得 */
        bgmState.currentBPM = getCurrentBPM();

        var melodyDur = scheduleTrack(actx, MELODY, 'square', bgmState.volume, bgmState.currentBPM);
        scheduleTrack(actx, BASS, 'triangle', bgmState.volume * 0.6, bgmState.currentBPM);

        bgmState.melodyTimeout = setTimeout(function() {
            if (bgmState.playing) startLoop();
        }, melodyDur);
    }

    KS.blessings = {
        startBGM: function() {
            if (bgmState.playing) return;
            if (!KS.audio.ctx) return;
            bgmState.playing = true;
            startLoop();
        },

        stopBGM: function() {
            bgmState.playing = false;
            if (bgmState.melodyTimeout) {
                clearTimeout(bgmState.melodyTimeout);
                bgmState.melodyTimeout = null;
            }
        },

        setVolume: function(v) {
            bgmState.volume = Math.max(0, Math.min(0.2, v));
        },

        isPlaying: function() {
            return bgmState.playing;
        },

        getCurrentBPM: function() {
            return bgmState.currentBPM;
        }
    };

})();
