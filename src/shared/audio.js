// Starship Ark — Hybrid Audio Engine
// Combines real acoustic recordings for tactile interactables (paper, switches, buttons)
// with Web Audio procedural synthesis for the vintage CRT terminal and mechanical keyboard.

class SoundEngine {
    constructor() {
        this.isMuted = false;
        this.masterVolume = 0.5; // Global volume multiplier (0.0 to 1.0)
        
        // Individual volume levels for each sound effect (0.0 to 1.0)
        this.volumes = {
            ambient: 0.3,    // Background rain & thunderstorm loop
            lampHum: 0.06,    // Faint electrical booth mains hum
            lamp: 0.15,       // Desk lamp switch toggle
            accept: 0.3,      // Wall accept button & authorization chime
            reject: 0.3,      // Wall reject button & denial buzzer
            book: 0.3,       // Ship manual page turns
            ledger: 0.25,      // Crew ledger manifest flip
            crt: 0.4,         // Terminal open/close CRT whine & pop
            keystroke: 0.7,   // Terminal mechanical keyboard typing
            dataFetch: 0.5,   // Document retrieval data stream chirps
            launchAlert: 0.5, // Liftoff alarm siren
            spaceEngine: 0.50,  // Deep space brown noise hull ambience
            tacticalRelay: 0.40, // Speed telegraph relay switch
            pneumatics: 0.35,   // Airlock / compartment bulkheads
            stationChime: 0.30, // Duty station terminal arrival
            commsChirp: 0.35,   // Sensor & bridge comms blip
            warningSonar: 0.40  // Low-resource critical warning pulse
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

        // Phase II: Deep Space Procedural Brown Noise Hull & Propulsion Ambience
        this.brownNoiseSource = null;
        this.brownFilter = null;
        this.engineGain = null;
        this.isEnginePlaying = false;
        this.currentEngineMode = 'pause';

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
        if (this.engineGain && this.ctx) {
            this.updateEngineSpeed(this.currentEngineMode);
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

    createBrownNoiseBuffer(duration = 3.5) {
        if (!this.ctx) return null;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Brownian random walk integrator (-6dB/octave slope)
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            data[i] = Math.max(-1.0, Math.min(1.0, lastOut * 3.5));
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

    // =========================================================================
    // 11. PHASE II: DEEP SPACE ENGINE DRONE & TACTICAL BRIDGE AUDIO
    // =========================================================================

    startSpaceEngine(initialMode = 'pause') {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        if (this.isEnginePlaying) {
            this.updateEngineSpeed(initialMode);
            return;
        }

        const t = this.ctx.currentTime;
        this.currentEngineMode = initialMode;

        // Master engine / ambience gain node
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.setValueAtTime(0.0001, t);
        this.engineGain.connect(this.masterGain);

        // Brown noise low-pass filter
        this.brownFilter = this.ctx.createBiquadFilter();
        this.brownFilter.type = "lowpass";
        this.brownFilter.frequency.setValueAtTime(320, t);
        this.brownFilter.Q.setValueAtTime(1.0, t);
        this.brownFilter.connect(this.engineGain);

        // Brown noise procedural buffer source loop
        const brownBuf = this.createBrownNoiseBuffer(3.5);
        if (brownBuf) {
            this.brownNoiseSource = this.ctx.createBufferSource();
            this.brownNoiseSource.buffer = brownBuf;
            this.brownNoiseSource.loop = true;
            this.brownNoiseSource.connect(this.brownFilter);
            this.brownNoiseSource.start(t);
        }

        this.isEnginePlaying = true;
        this.updateEngineSpeed(initialMode, 0.8);
    }

    updateEngineSpeed(mode = 'pause', rampSec = 0.35) {
        if (!this.ctx || !this.isEnginePlaying || !this.engineGain) return;
        this.currentEngineMode = mode;
        const t = this.ctx.currentTime;
        const rampT = t + rampSec;
        const master = this.masterVolume * (this.volumes.spaceEngine || 0.50);

        // Resting brown noise hull ambience in Pause: deep, soothing low-end bed
        let targetCutoff = 320;
        let targetVol = 0.38 * master;

        if (mode === 'cruise') {
            // Cruise: opens up into a steady propulsion stream
            targetCutoff = 560;
            targetVol = 0.55 * master;
        } else if (mode === 'warp') {
            // Warp: full throttle deep cosmic rushing slipstream
            targetCutoff = 860;
            targetVol = 0.75 * master;
        }

        if (this.brownFilter) {
            this.brownFilter.frequency.linearRampToValueAtTime(targetCutoff, rampT);
        }
        this.engineGain.gain.linearRampToValueAtTime(Math.max(0.0001, targetVol), rampT);
    }

    stopSpaceEngine() {
        if (!this.ctx || !this.isEnginePlaying) return;
        const t = this.ctx.currentTime;
        if (this.engineGain) {
            this.engineGain.gain.linearRampToValueAtTime(0.0001, t + 0.4);
        }
        setTimeout(() => {
            try {
                if (this.brownNoiseSource) { this.brownNoiseSource.stop(); this.brownNoiseSource.disconnect(); }
                if (this.brownFilter) { this.brownFilter.disconnect(); }
                if (this.engineGain) { this.engineGain.disconnect(); }
            } catch (e) {}
            this.brownNoiseSource = null;
            this.brownFilter = null;
            this.engineGain = null;
            this.isEnginePlaying = false;
        }, 450);
    }

    playSpeedRelay(mode) {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const scale = (this.volumes.tacticalRelay || 0.4) * this.masterVolume;

        // Mechanical relay switch snap
        const clickNoise = this.ctx.createBufferSource();
        clickNoise.buffer = this.createNoiseBuffer(0.025);
        if (clickNoise.buffer) {
            const filter = this.ctx.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.setValueAtTime(mode === 'warp' ? 2600 : (mode === 'cruise' ? 2100 : 1600), t);
            filter.Q.setValueAtTime(2.5, t);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.18 * scale, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.024);

            clickNoise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            clickNoise.start(t);
        }

        // Low-frequency solenoid / propulsion impulse thud
        const thud = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thud.type = "sine";
        const baseFreq = mode === 'warp' ? 95 : (mode === 'cruise' ? 75 : 55);
        thud.frequency.setValueAtTime(baseFreq, t);
        thud.frequency.exponentialRampToValueAtTime(32, t + 0.09);
        thudGain.gain.setValueAtTime(0.24 * scale, t);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);

        thud.connect(thudGain);
        thudGain.connect(this.masterGain);
        thud.start(t);
        thud.stop(t + 0.11);
    }

    playPneumaticDoor() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const scale = (this.volumes.pneumatics || 0.35) * this.masterVolume;

        // Pressurized air release hiss
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.18);
        if (noise.buffer) {
            const filter = this.ctx.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.setValueAtTime(1400, t);
            filter.frequency.linearRampToValueAtTime(800, t + 0.16);
            filter.Q.setValueAtTime(1.8, t);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.14 * scale, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            noise.start(t);
        }

        // Latch release click
        const latch = this.ctx.createOscillator();
        const lGain = this.ctx.createGain();
        latch.type = "triangle";
        latch.frequency.setValueAtTime(420, t + 0.02);
        latch.frequency.exponentialRampToValueAtTime(180, t + 0.06);
        lGain.gain.setValueAtTime(0.12 * scale, t + 0.02);
        lGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

        latch.connect(lGain);
        lGain.connect(this.masterGain);
        latch.start(t + 0.02);
        latch.stop(t + 0.08);
    }

    playStationArrival() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const scale = (this.volumes.stationChime || 0.3) * this.masterVolume;

        // High-tech terminal check-in double chime (A5 880Hz -> E6 1318Hz)
        const notes = [880, 1318];
        notes.forEach((freq, idx) => {
            const noteT = t + (idx * 0.055);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, noteT);

            gain.gain.setValueAtTime(0.09 * scale, noteT);
            gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.065);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(noteT);
            osc.stop(noteT + 0.075);
        });
    }

    playCommsTelemetryChirp() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const scale = (this.volumes.commsChirp || 0.35) * this.masterVolume;

        // Quick dual-frequency radio blip
        const freqs = [1980, 1420];
        freqs.forEach((freq, idx) => {
            const stepT = t + (idx * 0.03);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "square";
            osc.frequency.setValueAtTime(freq, stepT);

            gain.gain.setValueAtTime(0.045 * scale, stepT);
            gain.gain.exponentialRampToValueAtTime(0.001, stepT + 0.026);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(stepT);
            osc.stop(stepT + 0.028);
        });
    }

    playResourceWarningBeep() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const scale = (this.volumes.warningSonar || 0.4) * this.masterVolume;

        // Dual low sonar warning pulse (340Hz)
        [0, 0.12].forEach(delay => {
            const pulseT = t + delay;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(340, pulseT);

            gain.gain.setValueAtTime(0.12 * scale, pulseT);
            gain.gain.exponentialRampToValueAtTime(0.001, pulseT + 0.08);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(pulseT);
            osc.stop(pulseT + 0.09);
        });
    }
}

window.SoundFX = new SoundEngine();
