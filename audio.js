// Starship Ark — Web Audio API Synthesizer Sound Engine
// Zero-dependency, low-latency procedural audio for vintage sci-fi tactile feedback

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isMuted = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            this.ctx = new AudioContextClass();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) {
            console.warn("Web Audio not supported:", e);
        }
    }

    ensureContext() {
        if (!this.initialized) {
            this.init();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.55, this.ctx.currentTime);
        }
        return this.isMuted;
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

    // 1. DESK LAMP HARDWARE TOGGLE
    // Sharp dual micro-transients for physical switch spring snap + filament hum if turning on
    playLamp(isOn) {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;

        // Transient 1
        const snap1 = this.ctx.createBufferSource();
        snap1.buffer = this.createNoiseBuffer(0.015);
        if (!snap1.buffer) return;
        const filter1 = this.ctx.createBiquadFilter();
        filter1.type = "bandpass";
        filter1.frequency.setValueAtTime(isOn ? 2600 : 1900, t);
        filter1.Q.setValueAtTime(3.5, t);
        const gain1 = this.ctx.createGain();
        gain1.gain.setValueAtTime(0.35, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
        snap1.connect(filter1);
        filter1.connect(gain1);
        gain1.connect(this.masterGain);
        snap1.start(t);

        // Transient 2 (14ms delayed contact bounce)
        const snap2 = this.ctx.createBufferSource();
        snap2.buffer = this.createNoiseBuffer(0.02);
        const filter2 = this.ctx.createBiquadFilter();
        filter2.type = "bandpass";
        filter2.frequency.setValueAtTime(isOn ? 3300 : 2500, t + 0.014);
        filter2.Q.setValueAtTime(4.0, t + 0.014);
        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.45, t + 0.014);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
        snap2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(this.masterGain);
        snap2.start(t + 0.014);

        // Low filament resonance pulse if turned ON
        if (isOn) {
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(115, t + 0.01);
            oscGain.gain.setValueAtTime(0.12, t + 0.01);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
            osc.connect(oscGain);
            oscGain.connect(this.masterGain);
            osc.start(t + 0.01);
            osc.stop(t + 0.1);
        }
    }

    // 2. WALL BUTTON MECHANICAL CHASSIS THUD
    playButtonClunk(t, freq = 140) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(32, t + 0.09);
        gain.gain.setValueAtTime(0.7, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.12);

        // Metallic strike transient
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.025);
        if (!noise.buffer) return;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(850, t);
        filter.Q.setValueAtTime(2.5, t);
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.45, t);
        nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.masterGain);
        noise.start(t);
    }

    // 3. ACCEPT ENTRY (Wall Switch Clunk + Positive Electronic Airlock Chime & Pneumatic Release)
    playAccept() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;

        this.playButtonClunk(t, 160);

        // Ascending electronic access chime
        const chime1 = this.ctx.createOscillator();
        const chimeGain1 = this.ctx.createGain();
        chime1.type = "sine";
        chime1.frequency.setValueAtTime(587.33, t + 0.06); // D5
        chimeGain1.gain.setValueAtTime(0.2, t + 0.06);
        chimeGain1.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        chime1.connect(chimeGain1);
        chimeGain1.connect(this.masterGain);
        chime1.start(t + 0.06);
        chime1.stop(t + 0.25);

        const chime2 = this.ctx.createOscillator();
        const chimeGain2 = this.ctx.createGain();
        chime2.type = "sine";
        chime2.frequency.setValueAtTime(880, t + 0.14); // A5
        chimeGain2.gain.setValueAtTime(0.24, t + 0.14);
        chimeGain2.gain.exponentialRampToValueAtTime(0.001, t + 0.44);
        chime2.connect(chimeGain2);
        chimeGain2.connect(this.masterGain);
        chime2.start(t + 0.14);
        chime2.stop(t + 0.46);

        // Pneumatic air hiss
        const hiss = this.ctx.createBufferSource();
        hiss.buffer = this.createNoiseBuffer(0.26);
        if (!hiss.buffer) return;
        const hFilter = this.ctx.createBiquadFilter();
        hFilter.type = "bandpass";
        hFilter.frequency.setValueAtTime(1400, t + 0.08);
        hFilter.Q.setValueAtTime(1.0, t + 0.08);
        const hGain = this.ctx.createGain();
        hGain.gain.setValueAtTime(0.001, t);
        hGain.gain.linearRampToValueAtTime(0.16, t + 0.12);
        hGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        hiss.connect(hFilter);
        hFilter.connect(hGain);
        hGain.connect(this.masterGain);
        hiss.start(t + 0.08);
    }

    // 4. REJECT ENTRY (Wall Switch Clunk + Low Harsh Denial Buzzer)
    playReject() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;

        this.playButtonClunk(t, 120);

        // Low denial buzzer (dual pulses)
        [0.06, 0.17].forEach(offset => {
            const buzz = this.ctx.createOscillator();
            const bGain = this.ctx.createGain();
            buzz.type = "sawtooth";
            buzz.frequency.setValueAtTime(115, t + offset);
            
            const bFilter = this.ctx.createBiquadFilter();
            bFilter.type = "lowpass";
            bFilter.frequency.setValueAtTime(420, t + offset);

            bGain.gain.setValueAtTime(0.24, t + offset);
            bGain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.085);

            buzz.connect(bFilter);
            bFilter.connect(bGain);
            bGain.connect(this.masterGain);

            buzz.start(t + offset);
            buzz.stop(t + offset + 0.095);
        });
    }

    // 5. SHIP MANUAL (BOOK) OPEN & PAGE TURN
    playBook(isPageTurn = false) {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;

        // Paper rustle friction
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.22);
        if (!noise.buffer) return;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(isPageTurn ? 1650 : 1150, t);
        filter.frequency.exponentialRampToValueAtTime(650, t + 0.18);
        filter.Q.setValueAtTime(1.8, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.28, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.20);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(t);

        // Leather spine friction creak on open
        if (!isPageTurn) {
            const creak = this.ctx.createOscillator();
            const cGain = this.ctx.createGain();
            creak.type = "sawtooth";
            creak.frequency.setValueAtTime(85, t);
            creak.frequency.linearRampToValueAtTime(115, t + 0.07);
            creak.frequency.linearRampToValueAtTime(70, t + 0.15);

            const cFilter = this.ctx.createBiquadFilter();
            cFilter.type = "lowpass";
            cFilter.frequency.setValueAtTime(260, t);

            cGain.gain.setValueAtTime(0.09, t);
            cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

            creak.connect(cFilter);
            cFilter.connect(cGain);
            cGain.connect(this.masterGain);
            creak.start(t);
            creak.stop(t + 0.17);
        }
    }

    // 6. CREW LEDGER (WALL MANIFEST PAPER)
    playLedger() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;

        // Dry paper rustle
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.18);
        if (!noise.buffer) return;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(2200, t);
        filter.frequency.exponentialRampToValueAtTime(1100, t + 0.14);
        filter.Q.setValueAtTime(1.5, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(t);

        // Pin tack pluck
        const pin = this.ctx.createOscillator();
        const pGain = this.ctx.createGain();
        pin.type = "triangle";
        pin.frequency.setValueAtTime(1250, t);
        pin.frequency.exponentialRampToValueAtTime(400, t + 0.04);
        pGain.gain.setValueAtTime(0.14, t);
        pGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        pin.connect(pGain);
        pGain.connect(this.masterGain);
        pin.start(t);
        pin.stop(t + 0.05);
    }

    // 7. TERMINAL SCREEN OPEN (CRT High-Voltage Whine & Degauss Thrum)
    playTerminalOpen() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;

        // Degauss coil low surge hum
        const hum = this.ctx.createOscillator();
        const hGain = this.ctx.createGain();
        hum.type = "sine";
        hum.frequency.setValueAtTime(150, t);
        hum.frequency.exponentialRampToValueAtTime(55, t + 0.28);
        hGain.gain.setValueAtTime(0.28, t);
        hGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        hum.connect(hGain);
        hGain.connect(this.masterGain);
        hum.start(t);
        hum.stop(t + 0.35);

        // High voltage flyback transformer charge
        const flyback = this.ctx.createOscillator();
        const fGain = this.ctx.createGain();
        flyback.type = "sine";
        flyback.frequency.setValueAtTime(4500, t);
        flyback.frequency.exponentialRampToValueAtTime(12500, t + 0.22);
        fGain.gain.setValueAtTime(0.04, t);
        fGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        flyback.connect(fGain);
        fGain.connect(this.masterGain);
        flyback.start(t);
        flyback.stop(t + 0.26);

        // Power switch click
        this.playKeyClick(t, true);
    }

    // 8. TERMINAL SCREEN CLOSE (CRT Collapse Pop)
    playTerminalClose() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;

        const pop = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        pop.type = "sine";
        pop.frequency.setValueAtTime(800, t);
        pop.frequency.exponentialRampToValueAtTime(75, t + 0.12);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        pop.connect(gain);
        gain.connect(this.masterGain);
        pop.start(t);
        pop.stop(t + 0.14);
    }

    // 9. TERMINAL MECHANICAL KEYSTROKE
    playKeyClick(time = null, isEnter = false) {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = time || this.ctx.currentTime;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.015);
        if (!noise.buffer) return;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(isEnter ? 2400 : 3800 + Math.random() * 800, t);
        filter.Q.setValueAtTime(3.0, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isEnter ? 0.22 : 0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(t);

        // Bottoming-out thud
        const thud = this.ctx.createOscillator();
        const tGain = this.ctx.createGain();
        thud.type = "triangle";
        thud.frequency.setValueAtTime(isEnter ? 140 : 210, t);
        tGain.gain.setValueAtTime(isEnter ? 0.16 : 0.08, t);
        tGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
        thud.connect(tGain);
        tGain.connect(this.masterGain);
        thud.start(t);
        thud.stop(t + 0.03);
    }

    // 10. DOCUMENT RETRIEVAL TELEMETRY STREAM
    // High-speed acoustic telecommunication data packets
    playDataFetch() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;

        const freqs = [1480, 1920, 2600, 1750, 2200];
        freqs.forEach((freq, idx) => {
            const stepT = t + idx * 0.032;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "square";
            osc.frequency.setValueAtTime(freq, stepT);
            gain.gain.setValueAtTime(0.07, stepT);
            gain.gain.exponentialRampToValueAtTime(0.001, stepT + 0.026);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(stepT);
            osc.stop(stepT + 0.03);
        });
    }

    // 11. LAUNCH SEQUENCE / EMERGENCY ALARM KLXON
    playLaunchAlert() {
        this.ensureContext();
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;

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

            gain.gain.setValueAtTime(0.24, sweepT);
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
