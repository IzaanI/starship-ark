// Starship Ark — Hybrid Audio Engine
// Combines real acoustic recordings for tactile interactables (paper, switches, buttons)
// with Web Audio procedural synthesis for the vintage CRT terminal and mechanical keyboard.

class SoundEngine {
    constructor() {
        this.isMuted = false;
        this.masterVolume = 0.5; // Global volume multiplier (0.0 to 1.0)
        
        // Individual volume levels for each sound effect (0.0 to 1.0)
        this.volumes = {
            ambient: 0.25,    // Background rain & thunderstorm loop
            lampHum: 0.06,    // Faint electrical booth mains hum
            lamp: 0.15,       // Desk lamp switch toggle
            accept: 0.5,      // Wall accept button & authorization chime
            reject: 0.5,      // Wall reject button & denial buzzer
            book: 0.3,       // Ship manual page turns
            ledger: 0.25,      // Crew ledger manifest flip
            crt: 0.4,         // Terminal open/close CRT whine & pop
            keystroke: 0.8,   // Terminal mechanical keyboard typing
            dataFetch: 0.5,   // Document retrieval data stream chirps
            launchAlert: 0.6  // Liftoff alarm siren
        };

        this.ctx = null;
        this.masterGain = null;
        this.initialized = false;
        this.sounds = {};
        this.ambientAudio = null;
        this.isAmbientPlaying = false;
        this.lampHumOsc1 = null;
        this.lampHumOsc2 = null;
        this.lampHumGain = null;

        this.initAudioPool();
        this.initAmbient();
    }

    setMasterVolume(vol) {
        this.masterVolume = Math.min(1, Math.max(0, vol));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(0.55 * this.masterVolume, this.ctx.currentTime);
        }
        if (this.ambientAudio) {
            this.ambientAudio.volume = Math.min(1, Math.max(0, this.volumes.ambient * this.masterVolume));
        }
        if (this.lampHumGain && this.ctx) {
            this.lampHumGain.gain.setValueAtTime(this.volumes.lampHum * this.masterVolume, this.ctx.currentTime);
        }
    }

    // Adjust individual effect volume dynamically (e.g., SoundFX.setEffectVolume('lamp', 0.2))
    setEffectVolume(effectName, vol) {
        if (this.volumes[effectName] !== undefined) {
            this.volumes[effectName] = Math.min(1, Math.max(0, vol));
            if (effectName === 'ambient' && this.ambientAudio) {
                this.ambientAudio.volume = Math.min(1, Math.max(0, this.volumes.ambient * this.masterVolume));
            }
        }
    }

    initAudioPool() {
        const soundMap = {
            lampOn: 'audio/lamp_switch.wav',
            lampOff: 'audio/switch_off.wav',
            pageTurn: 'audio/page_turn.wav',
            pageFlip: 'audio/page_flip.mp3',
            buttonClick: 'audio/button_click.wav',
            accessGranted: 'audio/access_granted.wav',
            accessDenied: 'audio/access_denied.wav'
        };

        for (const [key, path] of Object.entries(soundMap)) {
            try {
                const audio = new Audio(path);
                audio.preload = 'auto';
                this.sounds[key] = audio;
            } catch (e) {
                console.warn(`Failed to preload ${path}:`, e);
            }
        }
    }

    playFile(key, volume = 0.5) {
        if (this.isMuted) return;
        try {
            const base = this.sounds[key];
            if (!base) return;
            const sound = base.cloneNode();
            sound.volume = Math.min(1, Math.max(0, volume * this.masterVolume));
            const p = sound.play();
            if (p !== undefined) {
                p.catch(() => {});
            }
        } catch (e) {
            console.warn("Audio playback error:", e);
        }
    }

    initAmbient() {
        if (this.ambientAudio) return;
        try {
            this.ambientAudio = new Audio('audio/ambient_rain_thunder.mp3');
            this.ambientAudio.loop = true;
            this.ambientAudio.volume = Math.min(1, Math.max(0, this.volumes.ambient * this.masterVolume));
            this.ambientAudio.preload = 'auto';

            this.ambientAudio.addEventListener('ended', () => {
                this.ambientAudio.currentTime = 0;
                this.ambientAudio.play().catch(() => {});
            });
        } catch (e) {
            console.warn("Failed to initialize ambient audio:", e);
        }
    }

    startAmbient() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ambientAudio) {
            this.initAmbient();
        }
        if (this.ambientAudio) {
            this.ambientAudio.volume = Math.min(1, Math.max(0, this.volumes.ambient * this.masterVolume));
            if (this.ambientAudio.paused) {
                const p = this.ambientAudio.play();
                if (p !== undefined) {
                    p.then(() => {
                        this.isAmbientPlaying = true;
                    }).catch(() => {
                        this.isAmbientPlaying = false;
                    });
                }
            } else {
                this.isAmbientPlaying = true;
            }
        }
        this.startLampHum();
    }

    stopAmbient() {
        if (this.ambientAudio) {
            this.ambientAudio.pause();
            this.isAmbientPlaying = false;
        }
        this.stopLampHum();
    }

    startLampHum() {
        if (!this.ctx || this.lampHumGain) return;
        try {
            const t = this.ctx.currentTime;
            this.lampHumGain = this.ctx.createGain();
            const humVol = this.volumes.lampHum * this.masterVolume;
            this.lampHumGain.gain.setValueAtTime(humVol, t);

            // 60 Hz electrical mains hum + 120 Hz second harmonic
            this.lampHumOsc1 = this.ctx.createOscillator();
            this.lampHumOsc1.type = "sine";
            this.lampHumOsc1.frequency.setValueAtTime(60, t);

            this.lampHumOsc2 = this.ctx.createOscillator();
            this.lampHumOsc2.type = "sine";
            this.lampHumOsc2.frequency.setValueAtTime(120, t);

            const filter = this.ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(250, t);

            this.lampHumOsc1.connect(filter);
            this.lampHumOsc2.connect(filter);
            filter.connect(this.lampHumGain);
            this.lampHumGain.connect(this.masterGain);

            this.lampHumOsc1.start(t);
            this.lampHumOsc2.start(t);
        } catch(e) {
            console.warn("Booth hum init failed:", e);
        }
    }

    stopLampHum() {
        if (this.lampHumGain && this.ctx) {
            const t = this.ctx.currentTime;
            this.lampHumGain.gain.cancelScheduledValues(t);
            this.lampHumGain.gain.linearRampToValueAtTime(0, t + 0.15);
            setTimeout(() => {
                if (this.lampHumOsc1) { try { this.lampHumOsc1.stop(); } catch(e){} this.lampHumOsc1 = null; }
                if (this.lampHumOsc2) { try { this.lampHumOsc2.stop(); } catch(e){} this.lampHumOsc2 = null; }
                this.lampHumGain = null;
            }, 200);
        }
    }

    // 1. DESK LAMP (Real tactile switch audio)
    playLamp(isOn) {
        const vol = this.volumes.lamp;
        this.playFile(isOn ? 'lampOn' : 'lampOff', vol);
    }

    // 2. ACCEPT WALL BUTTON (Real mechanical button click + electronic access granted tone)
    playAccept() {
        const vol = this.volumes.accept;
        this.playFile('buttonClick', vol);
        setTimeout(() => {
            this.playFile('accessGranted', vol * 0.9);
        }, 40);
    }

    // 3. REJECT WALL BUTTON (Real mechanical button click + electronic access denied buzz)
    playReject() {
        const vol = this.volumes.reject;
        this.playFile('buttonClick', vol);
        setTimeout(() => {
            this.playFile('accessDenied', vol * 0.85);
        }, 40);
    }

    // 4. SHIP MANUAL (Real book page turn audio)
    playBook(isPageTurn = false) {
        this.playFile('pageTurn', this.volumes.book);
    }

    // 5. CURRENT CREW LEDGER (Real paper sheet flip audio)
    playLedger() {
        this.playFile('pageFlip', this.volumes.ledger);
    }

    // Web Audio Synthesizer for CRT & Terminal (User confirmed these are fitting)
    initSynth() {
        if (this.initialized) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            this.ctx = new AudioContextClass();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.55 * this.masterVolume, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) {
            console.warn("Web Audio synth not supported:", e);
        }
    }

    ensureContext() {
        if (!this.initialized) {
            this.initSynth();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    createNoiseBuffer(duration = 0.2) {
        if (!this.ctx) return null;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // 6. TERMINAL SCREEN OPEN (CRT High-Voltage Coil Whine & Degauss Thrum)
    playTerminalOpen() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const scale = (this.volumes.crt !== undefined ? this.volumes.crt : 0.5) * 2;

        const hum = this.ctx.createOscillator();
        const hGain = this.ctx.createGain();
        hum.type = "sine";
        hum.frequency.setValueAtTime(150, t);
        hum.frequency.exponentialRampToValueAtTime(55, t + 0.28);
        hGain.gain.setValueAtTime(0.28 * scale, t);
        hGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        hum.connect(hGain);
        hGain.connect(this.masterGain);
        hum.start(t);
        hum.stop(t + 0.35);

        const flyback = this.ctx.createOscillator();
        const fGain = this.ctx.createGain();
        flyback.type = "sine";
        flyback.frequency.setValueAtTime(4500, t);
        flyback.frequency.exponentialRampToValueAtTime(12500, t + 0.22);
        fGain.gain.setValueAtTime(0.04 * scale, t);
        fGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        flyback.connect(fGain);
        fGain.connect(this.masterGain);
        flyback.start(t);
        flyback.stop(t + 0.26);

        this.playKeyClick(t, true);
    }

    // 7. TERMINAL SCREEN CLOSE (CRT Collapse Pop)
    playTerminalClose() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const scale = (this.volumes.crt !== undefined ? this.volumes.crt : 0.5) * 2;

        const pop = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        pop.type = "sine";
        pop.frequency.setValueAtTime(800, t);
        pop.frequency.exponentialRampToValueAtTime(75, t + 0.12);
        gain.gain.setValueAtTime(0.22 * scale, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        pop.connect(gain);
        gain.connect(this.masterGain);
        pop.start(t);
        pop.stop(t + 0.14);
    }

    // 8. TERMINAL MECHANICAL KEYSTROKE
    playKeyClick(time = null, isEnter = false) {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = time || this.ctx.currentTime;
        const scale = (this.volumes.keystroke !== undefined ? this.volumes.keystroke : 0.5) * 2;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.015);
        if (!noise.buffer) return;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(isEnter ? 2400 : 3800 + Math.random() * 800, t);
        filter.Q.setValueAtTime(3.0, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime((isEnter ? 0.22 : 0.12) * scale, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(t);

        const thud = this.ctx.createOscillator();
        const tGain = this.ctx.createGain();
        thud.type = "triangle";
        thud.frequency.setValueAtTime(isEnter ? 140 : 210, t);
        tGain.gain.setValueAtTime((isEnter ? 0.16 : 0.08) * scale, t);
        tGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
        thud.connect(tGain);
        tGain.connect(this.masterGain);
        thud.start(t);
        thud.stop(t + 0.03);
    }

    // 9. DOCUMENT RETRIEVAL TELEMETRY STREAM
    playDataFetch() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const scale = (this.volumes.dataFetch !== undefined ? this.volumes.dataFetch : 0.5) * 2;

        const freqs = [1480, 1920, 2600, 1750, 2200];
        freqs.forEach((freq, idx) => {
            const stepT = t + idx * 0.032;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "square";
            osc.frequency.setValueAtTime(freq, stepT);
            gain.gain.setValueAtTime(0.07 * scale, stepT);
            gain.gain.exponentialRampToValueAtTime(0.001, stepT + 0.026);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(stepT);
            osc.stop(stepT + 0.03);
        });
    }

    // 10. LAUNCH SEQUENCE / EMERGENCY ALARM KLAXON (Deep naval pitch, 4x slower pulse)
    playLaunchAlert() {
        this.playCrisisAlert();
    }

    playCrisisAlert() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const t = this.ctx.currentTime;
        const scale = (this.volumes.launchAlert !== undefined ? this.volumes.launchAlert : 0.6) * (1 / 0.6);
        const startT = t + 0.04; // Safety lead time for AudioContext render quantum

        // Primary Klaxon: slightly deeper pitch (200Hz -> 380Hz -> 190Hz, was 260Hz -> 520Hz)
        const osc = this.ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(200, startT);
        osc.frequency.linearRampToValueAtTime(380, startT + 0.35);
        osc.frequency.linearRampToValueAtTime(190, startT + 0.70);

        // Sub harmonic oscillator for rich ship hull presence (100Hz -> 190Hz -> 95Hz)
        const subOsc = this.ctx.createOscillator();
        subOsc.type = "sine";
        subOsc.frequency.setValueAtTime(100, startT);
        subOsc.frequency.linearRampToValueAtTime(190, startT + 0.35);
        subOsc.frequency.linearRampToValueAtTime(95, startT + 0.70);

        // Lowpass filter: 750Hz for warm, naval alarm tone with crisp audible presence
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(750, startT);

        // Envelope with smooth 50ms attack preventing click, decaying over 0.78s
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, startT);
        gain.gain.linearRampToValueAtTime(0.30 * scale, startT + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.78);

        osc.connect(filter);
        subOsc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(startT);
        subOsc.start(startT);
        osc.stop(startT + 0.82);
        subOsc.stop(startT + 0.82);
    }
}

window.SoundFX = new SoundEngine();
