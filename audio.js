// Starship Ark — Hybrid Audio Engine
// Combines real acoustic recordings for tactile interactables (paper, switches, buttons)
// with Web Audio procedural synthesis for the vintage CRT terminal and mechanical keyboard.

class SoundEngine {
    constructor() {
        this.isMuted = false;
        this.masterVolume = 0.5; // Global volume multiplier (0.0 to 1.0)
        
        // Individual volume levels for each sound effect (0.0 to 1.0)
        this.volumes = {
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
        this.initAudioPool();
    }

    setMasterVolume(vol) {
        this.masterVolume = Math.min(1, Math.max(0, vol));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(0.55 * this.masterVolume, this.ctx.currentTime);
        }
    }

    // Adjust individual effect volume dynamically (e.g., SoundFX.setEffectVolume('lamp', 0.2))
    setEffectVolume(effectName, vol) {
        if (this.volumes[effectName] !== undefined) {
            this.volumes[effectName] = Math.min(1, Math.max(0, vol));
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

    // 10. LAUNCH SEQUENCE / EMERGENCY ALARM KLXON
    playLaunchAlert() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const scale = (this.volumes.launchAlert !== undefined ? this.volumes.launchAlert : 0.6) * (1 / 0.6);

        for (let i = 0; i < 2; i++) {
            const sweepT = t + i * 0.35;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(260, sweepT);
            osc.frequency.linearRampToValueAtTime(520, sweepT + 0.22);
            osc.frequency.linearRampToValueAtTime(240, sweepT + 0.32);

            const filter = this.ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(900, sweepT);

            gain.gain.setValueAtTime(0.24 * scale, sweepT);
            gain.gain.exponentialRampToValueAtTime(0.001, sweepT + 0.34);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            osc.start(sweepT);
            osc.stop(sweepT + 0.35);
        }
    }
}

window.SoundFX = new SoundEngine();
