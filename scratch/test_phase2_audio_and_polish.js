/**
 * test_phase2_audio_and_polish.js
 * Verification of Phase II Audio Atmosphere, Procedural Synthesis & Tactical Polish
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock Web Audio Context
class MockAudioNode {
    constructor() {
        this.gain = {
            setValueAtTime: () => {},
            linearRampToValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {}
        };
        this.frequency = {
            setValueAtTime: () => {},
            linearRampToValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {}
        };
        this.Q = { setValueAtTime: () => {} };
    }
    connect() {}
    disconnect() {}
    start() {}
    stop() {}
}

class MockAudioContext {
    constructor() {
        this.currentTime = 0;
        this.sampleRate = 44100;
        this.state = 'running';
        this.destination = new MockAudioNode();
    }
    createGain() { return new MockAudioNode(); }
    createOscillator() { return new MockAudioNode(); }
    createBiquadFilter() { return new MockAudioNode(); }
    createBufferSource() { return new MockAudioNode(); }
    createBuffer(channels, size, rate) {
        return {
            getChannelData: () => new Float32Array(size)
        };
    }
    resume() { return Promise.resolve(); }
}

global.window = global;
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;
global.Audio = class {
    constructor() {
        this.play = () => Promise.resolve();
        this.pause = () => {};
        this.addEventListener = () => {};
        this.cloneNode = () => new global.Audio();
        this.volume = 0;
        this.playbackRate = 1.0;
        this.currentTime = 0;
        this.paused = true;
    }
};
global.performance = { now: () => Date.now() };
global.Image = class { constructor() {} };

const domElements = {};
function createMockElement(id, tag = 'div') {
    const el = {
        id,
        tag,
        className: '',
        innerHTML: '',
        textContent: '',
        style: {},
        children: [],
        parentElement: null,
        appendChild: function(c) { c.parentElement = this; this.children.push(c); return c; },
        removeChild: function(c) { const idx = this.children.indexOf(c); if (idx >= 0) this.children.splice(idx, 1); return c; },
        insertBefore: function(n, ref) { n.parentElement = this; this.children.push(n); return n; },
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        getContext: () => ({ drawImage: () => {}, fillRect: () => {}, clearRect: () => {} }),
        classList: {
            _classes: new Set(),
            add: function(c) { this._classes.add(c); },
            remove: function(c) { this._classes.delete(c); },
            contains: function(c) { return this._classes.has(c); }
        }
    };
    domElements[id] = el;
    return el;
}

['phase2-viewport', 'phase2-ship-container', 'phase2-btn-pause', 'phase2-btn-cruise', 'phase2-btn-warp',
 'gauge-bar-power', 'gauge-txt-power', 'gauge-bar-hull', 'gauge-txt-hull',
 'gauge-bar-o2', 'gauge-txt-o2', 'gauge-bar-food', 'gauge-txt-food',
 'gauge-bar-discipline', 'gauge-txt-discipline'].forEach(id => {
    const el = createMockElement(id);
    if (id.startsWith('gauge-bar-')) {
        const track = createMockElement(`${id}-track`);
        track.appendChild(el);
    }
});

global.document = {
    createElement: (tag) => createMockElement(`anon-${Math.random()}`, tag),
    getElementById: (id) => domElements[id] || createMockElement(id),
    querySelector: (sel) => {
        const clean = sel.replace('#', '');
        return domElements[clean] || null;
    },
    querySelectorAll: () => []
};

// Load audio.js
const audioCode = fs.readFileSync(path.join(__dirname, '../src/shared/audio.js'), 'utf8');
eval(audioCode);

// Load flightEngine.js
const flightEngineCode = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(flightEngineCode);

// Load phase2Bridge.js
const phase2BridgeCode = fs.readFileSync(path.join(__dirname, '../src/phase2/phase2Bridge.js'), 'utf8');
eval(phase2BridgeCode);

console.log('Testing Phase II Audio Atmosphere & Polish Suite...\n');

// Audio call monitors
let audioCalls = {
    speedRelay: 0,
    speedBoost: [],
    pneumatics: 0,
    arrivalChime: 0,
    commsChirp: 0,
    warningSonar: 0,
    engineUpdates: []
};

const originalPlaySpeedRelay = SoundFX.playSpeedRelay;
SoundFX.playSpeedRelay = function(mode) { audioCalls.speedRelay++; originalPlaySpeedRelay.call(this, mode); };

const originalPlaySpeedBoost = SoundFX.playSpeedBoost;
SoundFX.playSpeedBoost = function(mode) { audioCalls.speedBoost.push(mode); if (originalPlaySpeedBoost) originalPlaySpeedBoost.call(this, mode); };

const originalPlayPneumaticDoor = SoundFX.playPneumaticDoor;
SoundFX.playPneumaticDoor = function() { audioCalls.pneumatics++; originalPlayPneumaticDoor.call(this); };

const originalPlayStationArrival = SoundFX.playStationArrival;
SoundFX.playStationArrival = function() { audioCalls.arrivalChime++; originalPlayStationArrival.call(this); };

const originalPlayCommsTelemetryChirp = SoundFX.playCommsTelemetryChirp;
SoundFX.playCommsTelemetryChirp = function() { audioCalls.commsChirp++; originalPlayCommsTelemetryChirp.call(this); };

const originalPlayResourceWarningBeep = SoundFX.playResourceWarningBeep;
SoundFX.playResourceWarningBeep = function() { audioCalls.warningSonar++; originalPlayResourceWarningBeep.call(this); };

const originalUpdateEngineSpeed = SoundFX.updateEngineSpeed;
SoundFX.updateEngineSpeed = function(mode, ramp) { audioCalls.engineUpdates.push(mode); originalUpdateEngineSpeed.call(this, mode, ramp); };

function runTests() {
    // TEST 1: Procedural Engine Ambience lifecycle
    console.log('[TEST 1] Procedural Space Engine ambience startup, throttle shifts, and stop');
    SoundFX.startSpaceEngine('pause');
    assert.strictEqual(SoundFX.isEnginePlaying, true, 'Space engine should be active');
    assert.strictEqual(SoundFX.currentEngineMode, 'pause');

    SoundFX.updateEngineSpeed('cruise');
    assert.strictEqual(SoundFX.currentEngineMode, 'cruise');

    SoundFX.updateEngineSpeed('warp');
    assert.strictEqual(SoundFX.currentEngineMode, 'warp');

    SoundFX.stopSpaceEngine();
    console.log('Passed Test 1: Space engine procedural Web Audio lifecycle verified.');

    // TEST 2: Speed shift controls trigger relay click and engine update
    console.log('[TEST 2] Verifying Phase2Bridge.setSpeed triggers engine and relay audio');
    audioCalls.speedRelay = 0;
    audioCalls.engineUpdates = [];

    Phase2Bridge.setSpeed('cruise');
    assert.strictEqual(audioCalls.speedRelay, 1, 'Changing speed must play mechanical relay audio');
    assert(audioCalls.engineUpdates.includes('cruise'), 'Changing speed must adjust engine throttle');

    Phase2Bridge.setSpeed('warp');
    assert.strictEqual(audioCalls.speedRelay, 2, 'Warp speed must trigger second relay switch');
    assert(audioCalls.engineUpdates.includes('warp'), 'Warp speed must adjust engine throttle');

    Phase2Bridge.setSpeed('pause');
    assert.strictEqual(audioCalls.speedRelay, 3, 'Pause speed must trigger relay switch');
    assert(audioCalls.engineUpdates.includes('pause'), 'Pause speed must throttle down engine');
    console.log('Passed Test 2: Speed shift controls dynamically update audio engine and procedural frequencies.');

    // TEST 3: Pneumatic bulkhead doors on dispatch
    console.log('[TEST 3] Verifying crew dispatch plays pneumatic bulkhead door hiss');
    audioCalls.pneumatics = 0;
    Phase2Bridge.crew = [
        { name: 'Elena Rostova', currentRoom: 'reactor', status: 'DUTY', hp: 100, isDead: false, roleTier: 'Core' }
    ];
    Phase2Bridge.selectedOfficerIndex = 0;
    Phase2Bridge.dispatchOfficer(0, 'cockpit');
    assert.strictEqual(audioCalls.pneumatics, 1, 'Dispatching officer must play pneumatic door sound');
    console.log('Passed Test 3: Pneumatic door sound triggers on dispatch.');

    // TEST 4: Station check-in chime upon transit completion
    console.log('[TEST 4] Verifying station check-in arrival chime on arrival');
    audioCalls.arrivalChime = 0;
    const engine = window.FlightEngine;
    engine.crew = Phase2Bridge.crew;
    engine.crew[0].transitRemaining = 1.0;
    engine.crew[0].transitTarget = 'cockpit';

    // Simulate tick to complete transit
    engine.speedMultiplier = 1;
    engine.isRunning = true;
    engine.isGameOver = false;
    engine.updateCrewVitals(1.5); // dt > 1.0 finishes transit

    assert.strictEqual(engine.crew[0].transitRemaining, 0, 'Transit should be complete');
    assert.strictEqual(engine.crew[0].currentRoom, 'cockpit');
    assert.strictEqual(audioCalls.arrivalChime, 1, 'Completing transit must play station check-in chime');
    console.log('Passed Test 4: Station arrival chime triggers on check-in.');

    // TEST 5: Telemetry comms chirp on dialogue and notices
    console.log('[TEST 5] Verifying comms log triggers telemetry chirp for dialogue');
    audioCalls.commsChirp = 0;
    engine.logComms('Coolant pressure normalized on primary conduit.', 'normal', 'ENG');
    assert.strictEqual(audioCalls.commsChirp, 1, 'Comms line from station officer must trigger telemetry chirp');
    console.log('Passed Test 5: Telemetry data chirp triggers on bridge comms lines.');

    // TEST 6: Critical gauge pulse (<25%) and sonar warning blip
    console.log('[TEST 6] Verifying critical resource pulse (<25%) and tactical sonar beep');
    audioCalls.warningSonar = 0;
    engine.telemetry.power.value = 18; // Under 25%
    engine.renderHUD();

    const pwrBar = document.getElementById('gauge-bar-power');
    const pwrTrack = pwrBar.parentElement;
    assert.strictEqual(pwrTrack.classList.contains('critical-pulse'), true, 'Gauge track must pulse when resource < 25%');

    // Telemetry tick triggers sonar beep
    engine.updateVesselTelemetry(1.0);
    assert.strictEqual(audioCalls.warningSonar, 1, 'Critical resource must trigger tactical sonar warning beep');

    // Restoration above 25% clears pulse
    engine.telemetry.power.value = 50;
    engine.renderHUD();
    assert.strictEqual(pwrTrack.classList.contains('critical-pulse'), false, 'Gauge track must stop pulsing when above 25%');
    console.log('Passed Test 6: Critical gauge pulse and tactical warning sonar verified.');

    console.log('\nAll 6 Phase II Audio Atmosphere & Polish tests passed cleanly!');
}

runTests();
