/**
 * MusicSystem - 八音盒音效系统 v2（真人演奏模拟）
 * Web Audio API 实现：力度变化、延音踏板、弹性速度
 */
import { CONFIG } from './config.js';

export class MusicSystem {
    constructor() {
        this.audioContext = null;
        this.lastEatTime = 0;
        this.noteIndex = 0;
        this.currentSong = null;
        this.sustainNodes = [];
        this.rubatoAmount = 0.08;
        this.velocityRange = { min: 0.65, max: 1.0 };
        this.currentVelocity = 0.8;
        this.expression = {
            dolce: true,
            legato: true,
            rubato: true,
            pedal: true
        };
        this.convolver = null;
        this.reverbGain = null;

        this.songs = {
            '水晶序曲': [
                { freq: 261.63, duration: 150, velocity: 0.45, pedal: true },
                { freq: 293.66, duration: 150, velocity: 0.48, pedal: true },
                { freq: 329.63, duration: 150, velocity: 0.52, pedal: true },
                { freq: 392.00, duration: 150, velocity: 0.55, pedal: true },
                { freq: 523.25, duration: 150, velocity: 0.60, pedal: true },
                { freq: 587.33, duration: 150, velocity: 0.63, pedal: true },
                { freq: 659.25, duration: 150, velocity: 0.67, pedal: true },
                { freq: 783.99, duration: 150, velocity: 0.70, pedal: true },
                { freq: 1046.50, duration: 150, velocity: 0.75, pedal: true },
                { freq: 1174.66, duration: 150, velocity: 0.78, pedal: true },
                { freq: 1318.51, duration: 150, velocity: 0.82, pedal: true },
                { freq: 1567.98, duration: 150, velocity: 0.85, pedal: true },
                { freq: 1318.51, duration: 150, velocity: 0.82, pedal: true },
                { freq: 1174.66, duration: 150, velocity: 0.78, pedal: true },
                { freq: 1046.50, duration: 150, velocity: 0.75, pedal: true },
                { freq: 783.99, duration: 150, velocity: 0.70, pedal: true },
                { freq: 659.25, duration: 150, velocity: 0.67, pedal: true },
                { freq: 587.33, duration: 150, velocity: 0.63, pedal: true },
                { freq: 523.25, duration: 150, velocity: 0.60, pedal: true },
                { freq: 392.00, duration: 150, velocity: 0.55, pedal: true },
                { freq: 329.63, duration: 150, velocity: 0.52, pedal: true },
                { freq: 293.66, duration: 150, velocity: 0.48, pedal: true },
                { freq: 261.63, duration: 200, velocity: 0.45, pedal: true },
                { freq: 349.23, duration: 150, velocity: 0.50, pedal: true },
                { freq: 392.00, duration: 150, velocity: 0.53, pedal: true },
                { freq: 440.00, duration: 150, velocity: 0.57, pedal: true },
                { freq: 523.25, duration: 150, velocity: 0.60, pedal: true },
                { freq: 698.46, duration: 150, velocity: 0.65, pedal: true },
                { freq: 783.99, duration: 150, velocity: 0.68, pedal: true },
                { freq: 880.00, duration: 150, velocity: 0.72, pedal: true },
                { freq: 1046.50, duration: 150, velocity: 0.75, pedal: true },
                { freq: 1396.91, duration: 150, velocity: 0.80, pedal: true },
                { freq: 1046.50, duration: 150, velocity: 0.75, pedal: true },
                { freq: 880.00, duration: 150, velocity: 0.72, pedal: true },
                { freq: 783.99, duration: 150, velocity: 0.68, pedal: true },
                { freq: 698.46, duration: 150, velocity: 0.65, pedal: true },
                { freq: 523.25, duration: 150, velocity: 0.60, pedal: true },
                { freq: 440.00, duration: 150, velocity: 0.57, pedal: true },
                { freq: 392.00, duration: 150, velocity: 0.53, pedal: true },
                { freq: 349.23, duration: 200, velocity: 0.50, pedal: true },
                { freq: 392.00, duration: 150, velocity: 0.52, pedal: true },
                { freq: 440.00, duration: 150, velocity: 0.55, pedal: true },
                { freq: 493.88, duration: 150, velocity: 0.58, pedal: true },
                { freq: 587.33, duration: 150, velocity: 0.62, pedal: true },
                { freq: 783.99, duration: 150, velocity: 0.67, pedal: true },
                { freq: 880.00, duration: 150, velocity: 0.70, pedal: true },
                { freq: 987.77, duration: 150, velocity: 0.74, pedal: true },
                { freq: 1174.66, duration: 150, velocity: 0.78, pedal: true },
                { freq: 1567.98, duration: 150, velocity: 0.82, pedal: true },
                { freq: 1174.66, duration: 150, velocity: 0.78, pedal: true },
                { freq: 987.77, duration: 150, velocity: 0.74, pedal: true },
                { freq: 880.00, duration: 150, velocity: 0.70, pedal: true },
                { freq: 783.99, duration: 150, velocity: 0.67, pedal: true },
                { freq: 587.33, duration: 150, velocity: 0.62, pedal: true },
                { freq: 493.88, duration: 150, velocity: 0.58, pedal: true },
                { freq: 440.00, duration: 150, velocity: 0.55, pedal: true },
                { freq: 392.00, duration: 200, velocity: 0.52, pedal: true },
                { freq: 523.25, duration: 150, velocity: 0.60, pedal: true },
                { freq: 587.33, duration: 150, velocity: 0.65, pedal: true },
                { freq: 659.25, duration: 150, velocity: 0.70, pedal: true },
                { freq: 783.99, duration: 150, velocity: 0.75, pedal: true },
                { freq: 1046.50, duration: 150, velocity: 0.80, pedal: true },
                { freq: 1174.66, duration: 150, velocity: 0.85, pedal: true },
                { freq: 1318.51, duration: 150, velocity: 0.90, pedal: true },
                { freq: 1567.98, duration: 150, velocity: 0.95, pedal: true },
                { freq: 2093.00, duration: 200, velocity: 1.0, pedal: true },
                { freq: 1567.98, duration: 150, velocity: 0.90, pedal: true },
                { freq: 1318.51, duration: 150, velocity: 0.85, pedal: true },
                { freq: 1174.66, duration: 150, velocity: 0.80, pedal: true },
                { freq: 1046.50, duration: 150, velocity: 0.75, pedal: true },
                { freq: 783.99, duration: 150, velocity: 0.70, pedal: true },
                { freq: 659.25, duration: 150, velocity: 0.65, pedal: true },
                { freq: 587.33, duration: 150, velocity: 0.60, pedal: true },
                { freq: 523.25, duration: 150, velocity: 0.55, pedal: true },
                { freq: 392.00, duration: 150, velocity: 0.50, pedal: true },
                { freq: 329.63, duration: 150, velocity: 0.48, pedal: true },
                { freq: 293.66, duration: 150, velocity: 0.46, pedal: true },
                { freq: 261.63, duration: 300, velocity: 0.45, pedal: true },
            ],
            '致爱丽丝': [
                { freq: 659.25, duration: 200, velocity: 0.7, pedal: true },
                { freq: 622.25, duration: 200, velocity: 0.65, pedal: true },
                { freq: 659.25, duration: 200, velocity: 0.7, pedal: true },
                { freq: 622.25, duration: 200, velocity: 0.65, pedal: true },
                { freq: 659.25, duration: 200, velocity: 0.7, pedal: true },
                { freq: 587.33, duration: 200, velocity: 0.65, pedal: true },
                { freq: 659.25, duration: 200, velocity: 0.7, pedal: true },
                { freq: 523.25, duration: 200, velocity: 0.6, pedal: true },
                { freq: 587.33, duration: 200, velocity: 0.65, pedal: true },
                { freq: 523.25, duration: 400, velocity: 0.6, pedal: true },
                { freq: 440.00, duration: 400, velocity: 0.55, pedal: true },
                { freq: 493.88, duration: 400, velocity: 0.6, pedal: true },
                { freq: 523.25, duration: 600, velocity: 0.65, pedal: true },
            ],
            '爱的罗曼史': [
                { freq: 392.00, duration: 300, velocity: 0.6, pedal: true },
                { freq: 440.00, duration: 300, velocity: 0.65, pedal: true },
                { freq: 493.88, duration: 300, velocity: 0.7, pedal: true },
                { freq: 523.25, duration: 300, velocity: 0.75, pedal: true },
                { freq: 587.33, duration: 300, velocity: 0.8, pedal: true },
                { freq: 659.25, duration: 600, velocity: 0.85, pedal: true },
                { freq: 587.33, duration: 300, velocity: 0.8, pedal: true },
                { freq: 523.25, duration: 300, velocity: 0.75, pedal: true },
                { freq: 493.88, duration: 300, velocity: 0.7, pedal: true },
                { freq: 440.00, duration: 600, velocity: 0.65, pedal: true },
            ]
        };

        this.currentSongName = '水晶序曲';
        this.currentSong = this.songs[this.currentSongName];
    }

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this._createReverb();
            this._warmup();
        }
    }

    _warmup() {
        try {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            osc.start();
            osc.stop(this.audioContext.currentTime + 0.01);
        } catch(e) {}
    }

    _createReverb() {
        try {
            const sampleRate = this.audioContext.sampleRate;
            const length = sampleRate * 1;
            const impulse = this.audioContext.createBuffer(2, length, sampleRate);
            const leftCh = impulse.getChannelData(0);
            for (let i = 0; i < length; i++) {
                leftCh[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
            }
            const rightCh = impulse.getChannelData(1);
            for (let i = 0; i < length; i++) {
                rightCh[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.8);
            }
            this.convolver = this.audioContext.createConvolver();
            this.convolver.buffer = impulse;
            this.reverbGain = this.audioContext.createGain();
            this.reverbGain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
            this.convolver.connect(this.reverbGain);
            this.reverbGain.connect(this.audioContext.destination);
        } catch(e) {
            console.warn('Reverb creation failed:', e);
        }
    }

    _applyRubato(baseDuration) {
        if (!this.expression.rubato) return baseDuration;
        const variation = (Math.random() - 0.5) * 2 * this.rubatoAmount;
        return baseDuration * (1 + variation);
    }

    _updateVelocity() {
        const range = this.velocityRange.max - this.velocityRange.min;
        this.currentVelocity = this.velocityRange.min + Math.random() * range;
    }

    playNote(freq, duration = 120, velocity, usePedal, screenX) {
        if (!this.audioContext) this.init();
        if (!this.audioContext) return;
        if (this.audioContext.state === 'suspended') this.audioContext.resume();

        if (velocity === undefined) velocity = this.currentVelocity;
        if (usePedal === undefined) usePedal = this.expression.pedal;

        const now = this.audioContext.currentTime;
        const durationSec = duration / 1000;
        const v = Math.max(0.3, Math.min(1.0, velocity));

        try {
            const osc1 = this.audioContext.createOscillator();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(freq, now);

            const osc2 = this.audioContext.createOscillator();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(freq, now);

            const osc3 = this.audioContext.createOscillator();
            osc3.type = 'sine';
            osc3.frequency.setValueAtTime(freq * 2, now);

            const osc4 = this.audioContext.createOscillator();
            osc4.type = 'sine';
            osc4.frequency.setValueAtTime(freq * 0.5, now);

            const gainMain = this.audioContext.createGain();
            gainMain.gain.setValueAtTime(0, now);
            gainMain.gain.linearRampToValueAtTime(Math.min(1.0, 2.8 * v), now + 0.005);
            gainMain.gain.exponentialRampToValueAtTime(Math.min(1.0, 1.4 * v), now + 0.1);
            gainMain.gain.exponentialRampToValueAtTime(Math.min(1.0, 0.24 * v), now + durationSec * 1.5);

            const gainSquare = this.audioContext.createGain();
            gainSquare.gain.setValueAtTime(0, now);
            gainSquare.gain.linearRampToValueAtTime(Math.min(1.0, 1.0 * v), now + 0.005);
            gainSquare.gain.exponentialRampToValueAtTime(Math.min(1.0, 0.12 * v), now + durationSec);

            const gainHarmonic = this.audioContext.createGain();
            gainHarmonic.gain.setValueAtTime(0, now);
            gainHarmonic.gain.linearRampToValueAtTime(Math.min(1.0, 0.48 * v), now + 0.003);
            gainHarmonic.gain.exponentialRampToValueAtTime(Math.min(1.0, 0.024 * v), now + durationSec * 0.8);

            const gainLow = this.audioContext.createGain();
            gainLow.gain.setValueAtTime(0, now);
            gainLow.gain.linearRampToValueAtTime(Math.min(1.0, 0.72 * v), now + 0.008);
            gainLow.gain.exponentialRampToValueAtTime(Math.min(1.0, 0.024 * v), now + durationSec * 1.2);

            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(4000, now);
            filter.frequency.exponentialRampToValueAtTime(800, now + durationSec);
            filter.Q.setValueAtTime(1, now);

            osc1.connect(gainMain);
            osc2.connect(gainSquare);
            osc3.connect(gainHarmonic);
            osc4.connect(gainLow);

            gainMain.connect(filter);
            gainSquare.connect(filter);
            gainHarmonic.connect(filter);
            gainLow.connect(filter);

            let panner = null;
            if (screenX !== undefined && this.audioContext.createStereoPanner) {
                panner = this.audioContext.createStereoPanner();
                const panValue = (screenX / CONFIG.CANVAS_WIDTH) * 2 - 1;
                panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panValue)), now);
            }

            if (usePedal && this.convolver) {
                if (panner) { filter.connect(panner); panner.connect(this.convolver); }
                else { filter.connect(this.convolver); }
            } else {
                if (panner) { filter.connect(panner); panner.connect(this.audioContext.destination); }
                else { filter.connect(this.audioContext.destination); }
            }

            osc1.start(now);
            osc2.start(now);
            osc3.start(now);
            osc4.start(now);

            osc1.stop(now + durationSec * 1.5 + 0.3);
            osc2.stop(now + durationSec + 0.2);
            osc3.stop(now + durationSec * 0.8 + 0.2);
            osc4.stop(now + durationSec * 1.2 + 0.2);

            if (usePedal) {
                this._addSustainTail(freq, durationSec, v);
            }

            this.lastEatTime = now;
        } catch (e) {
            console.warn('playNote error:', e);
        }
    }

    _addSustainTail(freq, duration, velocity) {
        try {
            const now = this.audioContext.currentTime;
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.02 * velocity, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 2.5);
            osc.connect(gain);
            if (this.convolver) { gain.connect(this.convolver); }
            else { gain.connect(this.audioContext.destination); }
            osc.start(now);
            osc.stop(now + duration * 2.5 + 0.1);
        } catch (e) {
            console.warn('_addSustainTail error:', e);
        }
    }

    onEatFood(food, screenX) {
        const now = this.audioContext ? this.audioContext.currentTime : 0;
        if (now - this.lastEatTime < 0.1) return;
        this.lastEatTime = now;
        this._updateVelocity();
        if (this.currentSong && this.noteIndex < this.currentSong.length) {
            const note = this.currentSong[this.noteIndex];
            const adjustedDuration = this._applyRubato(note.duration);
            this.playNote(note.freq, adjustedDuration, note.velocity, note.pedal, screenX);
            this.noteIndex++;
            if (this.noteIndex >= this.currentSong.length) {
                this.noteIndex = 0;
            }
        }
    }

    setSong(songName) {
        if (this.songs[songName]) {
            this.currentSongName = songName;
            this.currentSong = this.songs[songName];
            this.noteIndex = 0;
        }
    }

    playYellowBeadArpeggio(segmentCount, screenX) {
        const song = this.songs['水晶序曲'];
        if (!song || song.length === 0) return;
        const totalNotes = song.length;
        const interval = 100;
        const playNoteAtIndex = (index) => {
            if (index >= segmentCount) return;
            const noteIndex = index % totalNotes;
            const note = song[noteIndex];
            const adjustedDuration = this._applyRubato(note.duration);
            this.playNote(note.freq, adjustedDuration, note.velocity, note.pedal, screenX);
            setTimeout(() => { playNoteAtIndex(index + 1); }, interval);
        };
        playNoteAtIndex(0);
    }
}
