/**
 * test_win_loss_conditions.js
 * Verification suite for Starship Ark Phase 2 Win and Loss Conditions (Step 8)
 *
 * Verifies:
 * 1. Hull Breach: Hull Integrity reaches 0% -> DEFEAT (HULL_BREACH)
 * 2. Cold Grid Collapse: Power reaches 0 kW -> DEFEAT (COLD_GRID_COLLAPSE)
 * 3. Asphyxiation: O2 reaches 0% -> DEFEAT (ASPHYXIATION)
 * 4. Starvation / Total Casualties: All crew members die -> DEFEAT (TOTAL_CASUALTIES)
 * 5. Catastrophic Sabotage: Saboteur bomb timer expires -> DEFEAT (CATASTROPHIC_SABOTAGE)
 * 6. Mutinous Collapse: Discipline reaches 0% -> DEFEAT (MUTINOUS_COLLAPSE)
 * 7. Victory Trigger & Orbital Insertion: Voyage progress reaches 100% -> VICTORY
 * 8. Immutability: Once game over triggers, simulation halts and speed cannot unpause.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock browser environment
global.window = global;
global.performance = { now: () => Date.now() };

let lastPushedAlert = null;
let lastSoundAlert = null;

global.Phase2Bridge = {
    pushAlert: (alert) => {
        lastPushedAlert = alert;
    },
    dismissAlert: () => {},
    logEvent: (msg, type, sender) => {},
    setSpeed: (mode) => {},
    renderCrewManifest: () => {},
    renderRoomOccupants: () => {}
};

global.SoundFX = {
    playLaunchAlert: () => { lastSoundAlert = 'launch_alert'; },
    playCrisisAlert: () => { lastSoundAlert = 'crisis_alert'; },
    playKeyClick: () => { lastSoundAlert = 'key_click'; }
};

// Mock DOM
global.document = {
    getElementById: (id) => ({
        textContent: '',
        style: {},
        classList: { add: () => {}, remove: () => {} }
    }),
    querySelector: () => ({
        classList: { add: () => {}, remove: () => {} },
        getBoundingClientRect: () => ({ top: 0, left: 0, width: 100, height: 100 })
    }),
    querySelectorAll: () => []
};

// Load flightEngine.js
const flightEngineCode = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(flightEngineCode);

const engine = window.FlightEngine;

function resetSimulation() {
    engine.stop();
    lastPushedAlert = null;
    lastSoundAlert = null;

    const testCrew = [
        {
            name: "Elena Rostova",
            roleTitle: "Chief Engineer",
            station: "Reactor",
            currentRoom: "reactor",
            transitRemaining: 0,
            hp: 100,
            eng: 100,
            isDead: false,
            status: "ASSIGNED: REACTOR",
            stationAffinities: { reactor: "Core", workshop: "Adjacent" },
            conditions: {},
            weight: 140
        },
        {
            name: "Marcus Vance",
            roleTitle: "Security Officer",
            station: "Brig",
            currentRoom: "brig",
            transitRemaining: 0,
            hp: 100,
            eng: 100,
            isDead: false,
            status: "ASSIGNED: BRIG",
            stationAffinities: { brig: "Core" },
            conditions: {},
            weight: 185
        }
    ];

    engine.start(testCrew);
    engine.telemetry = {
        power: { value: 100, max: 100, kw: 500, label: "Nominal" },
        o2: { value: 100, max: 100, label: "Nominal" },
        food: { value: 100, max: 100, rations: 60, maxRations: 60, label: "Plentiful" },
        hull: { value: 100, max: 100, label: "Pressurized", drainRate: 0 },
        discipline: { value: 100, max: 100, label: "Stable", rate: 0 }
    };
    engine.totalVoyageSeconds = 400;
    engine.elapsedSeconds = 0;
    engine.distancePercent = 0;
    engine.setSpeed('cruise');
}

console.log("====================================================");
console.log("🧪 TESTING PHASE 2 WIN & LOSS CONDITIONS");
console.log("====================================================");

// -------------------------------------------------------------
// TEST 1: Loss Condition - Hull Breach (0% Hull)
// -------------------------------------------------------------
console.log("\nTest 1: Hull Breach (0% Hull Integrity)");
resetSimulation();
engine.telemetry.hull.value = 0;
engine.checkGameEndConditions();

assert.strictEqual(engine.isGameOver, true, "isGameOver must be true upon Hull Breach");
assert.strictEqual(engine.gameOutcome, 'DEFEAT', "gameOutcome must be DEFEAT");
assert.strictEqual(engine.failureReason, 'HULL_BREACH', "failureReason must be HULL_BREACH");
assert.strictEqual(engine.speedMultiplier, 0, "Simulation speed must halt to 0");
assert.ok(lastPushedAlert, "Alert card pushed");
assert.strictEqual(lastPushedAlert.tag, 'FATAL');
assert.ok(lastPushedAlert.title.includes('HULL BREACH'));
console.log("  ✅ TEST 1 PASSED: Hull Breach triggers immediate defeat and halts simulation.");

// -------------------------------------------------------------
// TEST 2: Loss Condition - Cold Grid Collapse (0 kW Power)
// -------------------------------------------------------------
console.log("\nTest 2: Cold Grid Collapse (0 kW Power Grid)");
resetSimulation();
engine.telemetry.power.value = 0;
engine.telemetry.power.kw = 0;
engine.checkGameEndConditions();

assert.strictEqual(engine.isGameOver, true);
assert.strictEqual(engine.gameOutcome, 'DEFEAT');
assert.strictEqual(engine.failureReason, 'COLD_GRID_COLLAPSE');
assert.ok(lastPushedAlert.title.includes('COLD GRID COLLAPSE'));
console.log("  ✅ TEST 2 PASSED: Cold Grid Collapse triggers immediate defeat.");

// -------------------------------------------------------------
// TEST 3: Loss Condition - Asphyxiation (0% O2)
// -------------------------------------------------------------
console.log("\nTest 3: Asphyxiation (0% Oxygen Saturation)");
resetSimulation();
engine.telemetry.o2.value = 0;
engine.checkGameEndConditions();

assert.strictEqual(engine.isGameOver, true);
assert.strictEqual(engine.gameOutcome, 'DEFEAT');
assert.strictEqual(engine.failureReason, 'ASPHYXIATION');
assert.ok(lastPushedAlert.title.includes('LIFE SUPPORT COLLAPSE'));
console.log("  ✅ TEST 3 PASSED: Life Support Collapse / Asphyxiation triggers immediate defeat.");

// -------------------------------------------------------------
// TEST 4: Loss Condition - Mutinous Collapse (0% Discipline)
// -------------------------------------------------------------
console.log("\nTest 4: Mutinous Collapse (0% Discipline)");
resetSimulation();
engine.telemetry.discipline.value = 0;
engine.checkGameEndConditions();

assert.strictEqual(engine.isGameOver, true);
assert.strictEqual(engine.gameOutcome, 'DEFEAT');
assert.strictEqual(engine.failureReason, 'MUTINOUS_COLLAPSE');
assert.ok(lastPushedAlert.title.includes('MUTINOUS COLLAPSE'));
console.log("  ✅ TEST 4 PASSED: Mutinous Collapse triggers immediate defeat.");

// -------------------------------------------------------------
// TEST 5: Loss Condition - Total Crew Casualties (All Crew Dead)
// -------------------------------------------------------------
console.log("\nTest 5: Total Casualties (All Officers Deceased)");
resetSimulation();
engine.killOfficer(engine.crew[0], 0, 'Test trauma');
assert.strictEqual(engine.isGameOver, false, "Must not trigger total casualties while other crew alive");

engine.killOfficer(engine.crew[1], 1, 'Test trauma');
assert.strictEqual(engine.isGameOver, true, "Must trigger when all officers deceased");
assert.strictEqual(engine.gameOutcome, 'DEFEAT');
assert.strictEqual(engine.failureReason, 'TOTAL_CASUALTIES');
assert.ok(lastPushedAlert.title.includes('TOTAL CREW CASUALTIES'));
console.log("  ✅ TEST 5 PASSED: Total Crew Casualties triggers when all officers are deceased.");

// -------------------------------------------------------------
// TEST 6: Loss Condition - Catastrophic Sabotage Detonation
// -------------------------------------------------------------
console.log("\nTest 6: Catastrophic Sabotage (Bomb Timer Reaches 0)");
resetSimulation();
engine.crew[0].trueIdentity = 'DOOMSDAY_SABOTEUR';
engine.triggerSabotageIncident(engine.crew[0]);
assert.ok(engine.activeSabotage);
assert.strictEqual(engine.activeSabotage.isDetonated, false);

// Advance sabotage timer to 0
engine.activeSabotage.timeRemaining = 0.1;
engine.updateSabotage(0.2); // expires

assert.strictEqual(engine.isGameOver, true, "Detonation must trigger game over");
assert.strictEqual(engine.gameOutcome, 'DEFEAT');
assert.strictEqual(engine.failureReason, 'CATASTROPHIC_SABOTAGE');
assert.ok(lastPushedAlert.title.includes('CATASTROPHIC SABOTAGE'));
console.log("  ✅ TEST 6 PASSED: Catastrophic Sabotage bomb detonation triggers defeat.");

// -------------------------------------------------------------
// TEST 7: Victory Condition - Orbital Insertion (100% Progress / ETA 0)
// -------------------------------------------------------------
console.log("\nTest 7: Victory Condition (100% Voyage Progress / Arrival)");
resetSimulation();
engine.elapsedSeconds = 400;
engine.distancePercent = 100;
engine.checkGameEndConditions();

assert.strictEqual(engine.isGameOver, true, "isGameOver must be true upon arrival");
assert.strictEqual(engine.gameOutcome, 'VICTORY', "gameOutcome must be VICTORY");
assert.strictEqual(engine.failureReason, null, "failureReason must be null on victory");
assert.strictEqual(engine.speedMultiplier, 0, "Simulation speed must halt to 0 upon arrival");
assert.ok(lastPushedAlert, "Victory alert card pushed");
assert.strictEqual(lastPushedAlert.tag, 'HAVEN');
assert.ok(lastPushedAlert.title.includes('TITAN HAVEN 4'));
console.log("  ✅ TEST 7 PASSED: 100% distance triggers victory and orbital docking.");

// -------------------------------------------------------------
// TEST 8: State Immutability After Game Over
// -------------------------------------------------------------
console.log("\nTest 8: State Immutability After Game Over");
resetSimulation();
engine.telemetry.hull.value = 0;
engine.checkGameEndConditions();
assert.strictEqual(engine.isGameOver, true);

// Attempting to unpause via setSpeed must be ignored
engine.setSpeed('cruise');
assert.strictEqual(engine.speedMultiplier, 0, "Speed must remain 0 when game is over");
engine.setSpeed('warp');
assert.strictEqual(engine.speedMultiplier, 0, "Speed must remain 0 when game is over");

// Ticking must do nothing
const elapsedBefore = engine.elapsedSeconds;
engine.tick();
assert.strictEqual(engine.elapsedSeconds, elapsedBefore, "Tick must be a no-op when game is over");
console.log("  ✅ TEST 8 PASSED: Game Over state is strictly immutable and cannot be resumed.");

console.log("\n====================================================");
console.log("🎉 ALL 8 WIN & LOSS CONDITION TESTS PASSED!");
console.log("====================================================");
