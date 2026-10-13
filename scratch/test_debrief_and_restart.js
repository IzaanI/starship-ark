/**
 * test_debrief_and_restart.js
 * Verification of Step 8: Mission Debriefing Scorecard modal, Win/Loss Screen, and Play Again Loop
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock browser environment
global.window = global;
global.performance = { now: () => Date.now() };
global.Image = class { constructor() { this.src = ''; } };

let reloaded = false;
global.window.location = {
    reload: () => { reloaded = true; }
};

// Mock DOM elements
const domElements = {};
function createMockElement(id) {
    return {
        id,
        className: '',
        innerHTML: '',
        textContent: '',
        style: {},
        children: [],
        appendChild: function(c) { this.children.push(c); return c; },
        removeChild: function(c) { const idx = this.children.indexOf(c); if (idx >= 0) this.children.splice(idx, 1); return c; },
        insertBefore: function(n, ref) { this.children.push(n); return n; },
        querySelector: () => null,
        querySelectorAll: () => [],
        setAttribute: () => {},
        getAttribute: () => null,
        addEventListener: () => {},
        classList: {
            _classes: new Set(['hidden']),
            add: function(c) { this._classes.add(c); },
            remove: function(c) { this._classes.delete(c); },
            contains: function(c) { return this._classes.has(c); }
        }
    };
}

['debrief-modal', 'debrief-header', 'debrief-body', 'phase2-btn-debrief', 'transition-overlay', 'game-container', 'room-view', 'phase2-viewport', 'phase2-alerts-container', 'alert-counter-badge'].forEach(id => {
    domElements[id] = createMockElement(id);
});

global.document = {
    createElement: (tag) => createMockElement(tag),
    getElementById: (id) => {
        if (!domElements[id]) {
            domElements[id] = createMockElement(id);
        }
        return domElements[id];
    },
    querySelector: (sel) => {
        const id = sel.replace('#', '');
        return global.document.getElementById(id);
    },
    querySelectorAll: () => []
};

global.SoundFX = {
    playLaunchAlert: () => {},
    playCrisisAlert: () => {},
    playKeyClick: () => {},
    sounds: {
        accessGranted: { currentTime: 0, play: () => Promise.resolve() },
        accessDenied: { currentTime: 0, play: () => Promise.resolve() }
    }
};

// 1. Load flightEngine.js
const flightEngineCode = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(flightEngineCode);

// 2. Load phase2Bridge.js
const phase2BridgeCode = fs.readFileSync(path.join(__dirname, '../src/phase2/phase2Bridge.js'), 'utf8');
eval(phase2BridgeCode);

console.log('Testing Debriefing & Play Again Suite...\n');

// Emoji detector regex
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

function runTests() {
    const engine = window.FlightEngine;

    const mockCrew = [
        { name: 'Dr. Aris Thorne', roleTitle: 'Chief Physician', station: 'Medbay', hp: 100, isDead: false, status: 'NOMINAL', trueIdentity: 'LEGITIMATE_EXPERT' },
        { name: 'Elena Rostova', roleTitle: 'Reactor Tech', station: 'Reactor Core', hp: 85, isDead: false, status: 'NOMINAL', trueIdentity: 'LEGITIMATE_EXPERT' },
        { name: 'Marcus Vance', roleTitle: 'Security Officer', station: 'The Brig', hp: 45, isDead: false, status: 'NOMINAL', trueIdentity: 'LEGITIMATE_EXPERT' },
        { name: 'Silas Vane', roleTitle: 'Janitor', station: 'Cockpit (Helm)', hp: 0, isDead: true, status: 'DECEASED', trueIdentity: 'DOOMSDAY_SABOTEUR', saboteurNeutralized: true },
        { name: 'Kaelen Voss', roleTitle: 'Cargo Specialist', station: 'Workshop / Stores', hp: 90, isDead: false, status: 'NOMINAL', trueIdentity: 'RESOURCE_HOARDER', hoardRecovered: true }
    ];

    engine.crew = mockCrew;
    engine.totalVoyageSeconds = 400;
    engine.elapsedSeconds = 400;
    engine.distancePercent = 100.0;
    engine.telemetry.hull.value = 92;
    engine.telemetry.food.value = 80;
    engine.telemetry.food.rations = 48;
    engine.telemetry.power.value = 85;
    engine.telemetry.o2.value = 90;
    engine.telemetry.discipline.value = 78;

    // --- TEST 1: Victory Debrief Modal Population ---
    console.log('[TEST 1] Trigger Victory and verify showDebriefModal output');
    engine.triggerVictory();
    assert.strictEqual(engine.gameOutcome, 'VICTORY');

    Phase2Bridge.showDebriefModal();

    const debriefModal = document.getElementById('debrief-modal');
    const debriefHeader = document.getElementById('debrief-header');
    const debriefBody = document.getElementById('debrief-body');
    const debriefBtn = document.getElementById('phase2-btn-debrief');

    assert.strictEqual(debriefModal.classList.contains('hidden'), false, 'Debrief modal must be visible (hidden class removed)');
    assert.strictEqual(debriefBtn.classList.contains('hidden'), false, 'Top debrief button must be visible (hidden class removed)');
    assert(debriefHeader.className.includes('win'), 'Debrief header should have win class');
    assert(debriefHeader.innerHTML.includes('ORBITAL INSERTION CONFIRMED'), 'Header must state victory insertion title');
    assert(debriefHeader.innerHTML.includes('SCORE:'), 'Header must display final score');
    assert(debriefBody.innerHTML.includes('FLIGHT TELEMETRY & SURVIVAL RECORD'), 'Body must contain telemetry section');
    assert(debriefBody.innerHTML.includes('COMMAND PERFORMANCE BREAKDOWN'), 'Body must contain score breakdown');
    assert(debriefBody.innerHTML.includes('PERSONNEL SERVICE RECORD & SECURITY DOSSIER'), 'Body must contain crew table');
    assert(debriefBody.innerHTML.includes('Dr. Aris Thorne'), 'Crew table must list Dr. Aris Thorne');
    assert(debriefBody.innerHTML.includes('Saboteur Neutralized'), 'Saboteur neutralized dossier note must be displayed');
    assert(debriefBody.innerHTML.includes('Contraband Confiscated'), 'Hoarder recovered contraband note must be displayed');

    // Verify zero emoji policy
    assert(!emojiRegex.test(debriefHeader.innerHTML), 'Debrief header must contain zero emojis');
    assert(!emojiRegex.test(debriefBody.innerHTML), 'Debrief body must contain zero emojis');
    console.log('Passed Test 1: Victory debrief rendered accurately with zero emojis.');

    // --- TEST 2: Close Modal and Inspect Bridge ---
    console.log('[TEST 2] Verify closeDebriefModal hides modal but leaves header debrief button active');
    Phase2Bridge.closeDebriefModal();
    assert.strictEqual(debriefModal.classList.contains('hidden'), true, 'Debrief modal should be hidden');
    assert.strictEqual(debriefBtn.classList.contains('hidden'), false, 'Debrief button in header remains available to re-open');
    console.log('Passed Test 2: Inspect bridge flow successfully hides modal while retaining header button.');

    // --- TEST 3: Defeat Debrief Modal Population ---
    console.log('[TEST 3] Trigger Defeat (MUTINOUS_COLLAPSE) and verify Defeat Debrief');
    engine.isGameOver = false;
    engine.elapsedSeconds = 210;
    engine.distancePercent = 52.5;
    engine.telemetry.discipline.value = 0;
    engine.triggerGameOver('MUTINOUS_COLLAPSE', 'MUTINOUS COLLAPSE: SHIP CONTROL SEIZED', 'Crew discipline collapsed to 0%. Mutineers locked the bridge.');

    Phase2Bridge.showDebriefModal();
    assert.strictEqual(debriefModal.classList.contains('hidden'), false);
    assert(debriefHeader.className.includes('defeat'), 'Debrief header should have defeat class');
    assert(debriefHeader.innerHTML.includes('MUTINOUS COLLAPSE'), 'Header must contain defeat title');
    assert(debriefHeader.innerHTML.includes('EXPEDITION TERMINATED // VESSEL LOST'), 'Badge must indicate vessel loss');
    assert(!emojiRegex.test(debriefHeader.innerHTML), 'Defeat debrief header must contain zero emojis');
    assert(!emojiRegex.test(debriefBody.innerHTML), 'Defeat debrief body must contain zero emojis');
    console.log('Passed Test 3: Defeat debrief rendered with accurate telemetry and zero emojis.');

    // --- TEST 4: Play Again / Restart Expedition Loop ---
    console.log('[TEST 4] Verify restartExpedition immediately triggers page reload');
    reloaded = false;

    Phase2Bridge.restartExpedition();
    assert.strictEqual(reloaded, true, 'window.location.reload must be invoked immediately');
    console.log('Passed Test 4: Restart expedition successfully reloads page directly.');
    console.log('\nAll 4 debriefing and game-end loop tests passed successfully!');
}

runTests();
