/**
 * test_hull_and_time_rounding.js
 * Verification of:
 * 1. Hull integrity has no constant drain when helm is uncrewed.
 * 2. Hull integrity is impacted by space debris and planted explosives.
 * 3. Total flight time displayed in debriefing is properly rounded when extra time is added.
 * 4. Debriefing button is hidden during active flight and only available after game end.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock environment
global.window = global;
global.performance = { now: () => Date.now() };
global.Image = class { constructor() {} };

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
    getElementById: (id) => domElements[id] || createMockElement(id),
    querySelector: () => null,
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

const flightEngineCode = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(flightEngineCode);

const phase2BridgeCode = fs.readFileSync(path.join(__dirname, '../src/phase2/phase2Bridge.js'), 'utf8');
eval(phase2BridgeCode);

console.log('Testing Hull Drain, Time Rounding, & Debrief Visibility...\n');

const engine = window.FlightEngine;
engine.stop();

// TEST 1: Unmanned helm has 0 hull drain during normal flight
console.log('[TEST 1] Verifying unmanned cockpit does NOT drain hull integrity');
engine.crew = [
    { name: 'Elena Rostova', roleTitle: 'Engineer', currentRoom: 'reactor', transitRemaining: 0, hp: 100, isDead: false, status: 'NOMINAL' }
]; // Cockpit is uncrewed
engine.activeCrises = {};
engine.activeSabotage = null;
engine.telemetry.hull.value = 100;

engine.updateVesselTelemetry(1.0);
assert.strictEqual(engine.telemetry.hull.drainRate, 0.00, 'Unmanned helm must have 0 hull drain rate');
assert.strictEqual(engine.telemetry.hull.value, 100, 'Hull value must remain 100% when no hazards are present');
console.log('Passed Test 1: No constant hull drain when helm is uncrewed.');

// TEST 2: Space debris drains hull integrity
console.log('[TEST 2] Verifying Space Debris impacts hull integrity');
engine.activeCrises = {
    cockpit: {
        id: 'hazard_cockpit_debris',
        stationId: 'cockpit',
        penaltyPerSec: 0.35
    }
};
engine.updateVesselTelemetry(1.0);
assert.strictEqual(engine.telemetry.hull.drainRate, 0.35, 'Space debris should set hull drain to 0.35%/s');
assert.strictEqual(engine.telemetry.hull.value, 99.65, 'Hull value should decrease by 0.35% per second of debris');
console.log('Passed Test 2: Space debris damages hull integrity as specified.');

// TEST 3: Active planted explosive stresses hull and detonation breaches hull
console.log('[TEST 3] Verifying planted explosive impacts hull');
engine.activeCrises = {};
engine.activeSabotage = {
    stationName: 'Reactor Core',
    isDefused: false,
    isDetonated: false,
    timeRemaining: 15.0
};
engine.updateVesselTelemetry(1.0);
assert.strictEqual(engine.telemetry.hull.drainRate, 0.25, 'Planted explosive should cause structural hull stress of 0.25%/s');

// Detonation check
engine.activeSabotage.timeRemaining = 0;
engine.checkGameEndConditions();
assert.strictEqual(engine.isGameOver, true, 'Game should end on sabotage detonation');
assert.strictEqual(engine.telemetry.hull.value, 0, 'Detonation must breach hull to 0%');
console.log('Passed Test 3: Planted explosive impacts hull integrity during countdown and causes 0% breach on detonation.');

// TEST 4: Format time and total voyage time rounding in debriefing
console.log('[TEST 4] Verifying total voyage time rounding with added seconds');
const rawFractionalTime = 403.48392; // 6 mins 43.48s
const formatted = engine.formatTime(rawFractionalTime);
assert.strictEqual(formatted, '06:43', `Expected '06:43', got '${formatted}'`);

engine.isGameOver = true;
engine.gameOutcome = 'VICTORY';
engine.totalVoyageSeconds = 403.48392;
engine.elapsedSeconds = 403.48392;
const debrief = engine.generateDebriefReport();
assert.strictEqual(debrief.totalFormatted, '06:43', 'Debrief totalFormatted must be cleanly rounded whole seconds');
assert.strictEqual(debrief.elapsedFormatted, '06:43', 'Debrief elapsedFormatted must be cleanly rounded whole seconds');
console.log('Passed Test 4: Total flight time displayed in debriefing is cleanly rounded to MM:SS without decimals.');

// TEST 5: Debrief button visibility
console.log('[TEST 5] Verifying debrief button is hidden during play and only enabled after mission end');
const debriefBtn = document.getElementById('phase2-btn-debrief');
debriefBtn.classList.add('hidden');

// Mid-game check (not game over)
engine.isGameOver = false;
Phase2Bridge.showDebriefModal();
assert.strictEqual(debriefBtn.classList.contains('hidden'), true, 'Debrief button should remain hidden when game is still running');

// Mission over check
engine.isGameOver = true;
Phase2Bridge.showDebriefModal();
assert.strictEqual(debriefBtn.classList.contains('hidden'), false, 'Debrief button should be revealed once mission has finished');

Phase2Bridge.closeDebriefModal();
assert.strictEqual(debriefBtn.classList.contains('hidden'), false, 'Debrief button should remain available to toggle between bridge inspection and report');
console.log('Passed Test 5: Debrief button remains hidden during gameplay and functions as toggle after mission completion.');

console.log('\nAll 5 hull drain, time rounding, and debrief visibility tests passed successfully!');
