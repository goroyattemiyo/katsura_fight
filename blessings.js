/**
 * blessings.js — BGM管理（Web Audio API オシレーター生成）
 * 読み込み順: 4番目
 * v1.0.7 — コロベイニキ（ロシア民謡・パブリックドメイン）BGM実装
 * 著作権: メロディは1843年作曲、パブリックドメイン
 *         音源は本コードで独自生成（著作隣接権の問題なし）
 */
"use strict";

(function() {

    /* コロベイニキ メロディデータ
     * [音名, 長さ(拍)] 形式
     * テンポ: BPM 140
     */
    var MELODY = [
        /* フレーズ1 */
        ['E4', 1], ['B3', 0.5], ['C4', 0.5], ['D4', 1], ['C4', 0.5], ['B3', 0.5],
        ['A3', 1], ['A3', 0.5], ['C4', 0.5], ['E4', 1], ['D4', 0.5], ['C4', 0.5],
        ['B3', 1.5], ['C4', 0.5], ['D4', 1], ['E4', 1],
        ['C4', 1], ['A3', 1], ['A3', 2],
        /* フレーズ2 */
        ['_', 0.5], ['D4', 1], ['F4', 0.5], ['A4', 1], ['G4', 0.5], ['F4', 0.5],
        ['E4', 1.5], ['C4', 0.5], ['E4', 1], ['D4', 0.5], ['C4', 0.5],
        ['B3', 1], ['B3', 0.5], ['C4', 0.5], ['D4', 1], ['E4', 1],
        ['C4', 1], ['A3', 1], ['A3', 2]
    ];

    /* ベースライン */
    var BASS = [
        ['E2', 2], ['A2', 2], ['G#2', 2], ['A2', 1], ['C3', 1],
        ['D3', 2], ['C3', 2], ['B2', 2], ['A2', 2],
        ['D3', 2], ['F3', 2], ['C3', 2], ['A2', 1], ['C3', 1],
        ['B2', 2], ['E3', 2], ['A2', 2], ['A2', 2]
    ];

    /* 音名→周波数変換テーブル */
    var NOTE_FREQ = {
        '_': 0,
        'A2': 110.00, 'B2': 123.47, 'C3': 130.81, 'D3': 146.83,
        'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'G#2': 103.83,
        'A3': 220.00, 'B3': 246.94, 'C4': 261.63, 'D4': 293.66,
        'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00
    };

    var BPM = 140;
    var BEAT_SEC = 60 / BPM;

    var bgmState = {
        playing: false,
        melodyTimeout: null,
        bassTimeout: null,
        volume: 0.08
    };

    function playNote(actx, freq, startTime, duration, type, vol) {
        if (freq === 0) return; /* rest */
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

    function scheduleTrack(actx, notes, type, vol, onComplete) {
        var startTime = actx.currentTime + 0.05;
        var currentTime = startTime;

        for (var i = 0; i < notes.length; i++) {
            var note = notes[i];
            var freq = NOTE_FREQ[note[0]] || 0;
            var dur = note[1] * BEAT_SEC;
            playNote(actx, freq, currentTime, dur, type, vol);
            currentTime += dur;
        }

        var totalDuration = (currentTime - startTime) * 1000;
        return totalDuration;
    }

    function startLoop() {
        if (!bgmState.playing) return;
        var actx = KS.audio.ctx;
        if (!actx || actx.state === 'suspended') return;

        var melodyDur = scheduleTrack(actx, MELODY, 'square', bgmState.volume, null);
        scheduleTrack(actx, BASS, 'triangle', bgmState.volume * 0.6, null);

        bgmState.melodyTimeout = setTimeout(function() {
            if (bgmState.playing) startLoop();
        }, melodyDur);
    }

    /* ========================================
     * 公開API
     * ======================================== */
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
            if (bgmState.bassTimeout) {
                clearTimeout(bgmState.bassTimeout);
                bgmState.bassTimeout = null;
            }
        },

        setVolume: function(v) {
            bgmState.volume = Math.max(0, Math.min(0.2, v));
        },

        isPlaying: function() {
            return bgmState.playing;
        }
    };

})();
