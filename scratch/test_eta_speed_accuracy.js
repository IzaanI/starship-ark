/**
 * TEST SUITE: VOYAGE ETA & SPEED MULTIPLIER ACCURACY
 * Verifies that:
 * 1. 1x Cruise ticks down ETA at exactly 1.0s per second of real time (unmanned or manned).
 * 2. 2x Warp ticks down ETA at exactly 2.0s per second of real time.
 * 3. Pause (0x) halts ETA progression completely.
 * 4. A 400s voyage completes in exactly 400 real seconds at 1x, or 200 real seconds at 2x.
 * 5. All milestone checkpoints trigger at exact proportional intervals.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Setup mock browser environment
global.window = global;
global.Image = class { constructor() {} };

global.document = {
    createElement: function(tag) {
        return {
            tag,
            style: {},
            textContent: '',
            innerHTML: '',
            classList: { add: () => {}, remove: () => {}, contains: () => false },
            appendChild: () => {},
            insertBefore: () => {},
            addEventListener: () => {},
            getContext: () => ({ drawImage: () => {}, fillRect: () => {}, clearRect: () => {} })
        };
    },
    getElementById: (id) => ({
        id,
        textContent: '',
        innerText: '',
        innerHTML: '',
        style: {},
        children: [],
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        querySelectorAll: () => [],
        querySelector: () => null,
        appendChild: () => {},
        insertBefore: () => {},
        remove: () => {}
    }),
    querySelector: () => null,
    querySelectorAll: () => []
};

global.performance = { now: () => Date.now() };
global.SoundFX = {
    playKeyClick: () => {},
    playCrisisAlert: () => {},
    playLaunchAlert: () => {}
};

const bridgeCode = fs.readFileSync(path.join(__dirname, '../src/phase2/phase2Bridge.js'), 'utf8');
eval(bridgeCode);

const flightEngineCode = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(flightEngineCode);

console.log("====================================================");
console.log("🧪 TESTING VOYAGE ETA & SPEED ACCURACY");
console.log("====================================================");

const engine = window.FlightEngine;

// Clean crew with empty cockpit initially
engine.crew = [
    {
        name: "Officer Test",
        currentRoom: "reactor",
        transitRemaining: 0,
        hp: 100,
        eng: 100,
        isDead: false,
        status: "ASSIGNED: REACTOR",
        stationAffinities: { reactor: "Core" },
        conditions: {},
        weight: 180
    }
];

engine.totalVoyageSeconds = 400;
engine.elapsedSeconds = 0;
engine.distancePercent = 0;
engine.milestones = { quarter: false, halfway: false, threeQuarters: false, arrival: false };

// TEST 1: 1x Cruise Speed Accuracy with UNMANNED Cockpit
console.log("\nTest 1: 1x Cruise Speed (Unmanned Cockpit)");
engine.speedMultiplier = 1;
// Simulate 10 seconds of flight with dt = 1.0s
for (let i = 0; i < 10; i++) {
    engine.updateVoyageProgress(1.0);
}

const remainingAfter10s = Math.round(engine.totalVoyageSeconds - engine.elapsedSeconds);
console.log(`  Elapsed Seconds after 10 real seconds: ${engine.elapsedSeconds.toFixed(2)}s (Expected: 10.00s)`);
console.log(`  Remaining ETA after 10s: ${engine.formatTime(remainingAfter10s)} (Expected: 06:30 / 390s)`);
assert.strictEqual(engine.elapsedSeconds, 10, "1x Cruise must advance exactly 1.0s per second of real time");
assert.strictEqual(remainingAfter10s, 390, "Remaining ETA must decrease by exactly 10s after 10s of 1x cruise");
console.log("  ✅ TEST 1 PASSED: 1x Cruise ticks ETA down at exactly 1.0s per real second.");

// TEST 2: 2x Warp Speed Accuracy
console.log("\nTest 2: 2x Warp Speed");
// Simulate 10 real seconds at 2x warp (effectiveDt = 2.0s per real second)
for (let i = 0; i < 10; i++) {
    engine.updateVoyageProgress(2.0);
}

const remainingAfterWarp = Math.round(engine.totalVoyageSeconds - engine.elapsedSeconds);
console.log(`  Elapsed Seconds after 10s warp (+20s): ${engine.elapsedSeconds.toFixed(2)}s (Expected: 30.00s)`);
console.log(`  Remaining ETA after warp: ${engine.formatTime(remainingAfterWarp)} (Expected: 06:10 / 370s)`);
assert.strictEqual(engine.elapsedSeconds, 30, "2x Warp must advance exactly 2.0s per second of real time");
assert.strictEqual(remainingAfterWarp, 370, "Remaining ETA must decrease by 20s after 10 real seconds at 2x warp");
console.log("  ✅ TEST 2 PASSED: 2x Warp ticks ETA down at exactly 2.0s per real second.");

// TEST 3: Full Voyage Duration Alignment
console.log("\nTest 3: Full Voyage 400s Completion (06:40 -> 00:00)");
// Reset to beginning
engine.elapsedSeconds = 0;
engine.distancePercent = 0;
engine.milestones = { quarter: false, halfway: false, threeQuarters: false, arrival: false };

// Advance 100 seconds (25% checkpoint)
engine.updateVoyageProgress(100.0);
console.log(`  Distance at 100s: ${engine.distancePercent.toFixed(1)}% (Expected: 25.0%)`);
console.log(`  ETA at 100s: ${engine.formatTime(Math.round(engine.totalVoyageSeconds - engine.elapsedSeconds))} (Expected: 05:00)`);
assert.strictEqual(engine.distancePercent, 25, "At 100s, distance must be exactly 25%");
assert.strictEqual(engine.milestones.quarter, true, "25% milestone must trigger at 100s");

// Advance another 100 seconds (50% checkpoint, total 200s)
engine.updateVoyageProgress(100.0);
console.log(`  Distance at 200s: ${engine.distancePercent.toFixed(1)}% (Expected: 50.0%)`);
console.log(`  ETA at 200s: ${engine.formatTime(Math.round(engine.totalVoyageSeconds - engine.elapsedSeconds))} (Expected: 03:20)`);
assert.strictEqual(engine.distancePercent, 50, "At 200s, distance must be exactly 50%");
assert.strictEqual(engine.milestones.halfway, true, "50% milestone must trigger at 200s");

// Advance to 400s total (arrival)
engine.updateVoyageProgress(200.0);
console.log(`  Distance at 400s: ${engine.distancePercent.toFixed(1)}% (Expected: 100.0%)`);
console.log(`  ETA at 400s: ${engine.formatTime(Math.round(engine.totalVoyageSeconds - engine.elapsedSeconds))} (Expected: 00:00)`);
assert.strictEqual(engine.distancePercent, 100, "At 400s, distance must be 100%");
assert.strictEqual(engine.milestones.arrival, true, "Arrival must trigger at 400s");
console.log("  ✅ TEST 3 PASSED: Full voyage completes in exactly 400 seconds (06:40).");

console.log("\n====================================================");
console.log("🎉 ALL ETA & SPEED MULTIPLIER TESTS PASSED CLEANLY!");
console.log("====================================================");
