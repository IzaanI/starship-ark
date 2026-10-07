/**
 * TEST SUITE: BRIG DISCIPLINE & SIMPLIFIED CREW VITALS
 * Tests:
 * 1. Unmanned Brig: Discipline drains at -0.1%/s
 * 2. Manned Brig (Active Guard): Discipline recovers at +1.0%/s (capped at 100%)
 * 3. Invalid guards (detained prisoners, panicked officers) do not provide discipline recovery
 * 4. Crew members only track physical health (HP) and stamina (ENG), no individual sanity
 * 5. Sleep Pods restore stamina (ENG) rapidly (+3.5/s)
 * 6. Decoupled systemic stress triggers tie to sleep deprivation (eng <= 5) and vessel discipline (< 50)
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
console.log("🧪 TESTING BRIG DISCIPLINE & SIMPLIFIED CREW VITALS");
console.log("====================================================");

const engine = window.FlightEngine;

// Clean crew for controlled testing
engine.crew = [
    {
        name: "Officer Alpha",
        currentRoom: "cockpit",
        transitRemaining: 0,
        hp: 100,
        eng: 100,
        isDead: false,
        status: "ASSIGNED: FLIGHT DECK",
        stationAffinities: { cockpit: "Core" },
        conditions: {},
        weight: 180
    },
    {
        name: "Officer Bravo",
        currentRoom: "brig",
        transitRemaining: 0,
        hp: 100,
        eng: 100,
        isDead: false,
        isDetained: false,
        status: "ASSIGNED: THE BRIG",
        stationAffinities: { brig: "Core" },
        conditions: {},
        weight: 190
    },
    {
        name: "Officer Charlie",
        currentRoom: "sleepPods",
        transitRemaining: 0,
        hp: 100,
        eng: 30,
        isDead: false,
        status: "RESTING IN QUARTERS",
        conditions: {},
        weight: 175
    },
    {
        name: "Officer Delta",
        currentRoom: "brig",
        transitRemaining: 0,
        hp: 100,
        eng: 80,
        isDead: false,
        isDetained: true,
        status: "DETAINED (BRIG)",
        conditions: {},
        weight: 185
    }
];

engine.speedMultiplier = 1.0;

// TEST 1: Unmanned Brig Discipline Drain (-0.135%/s, 35% faster)
console.log("\nTest 1: Unmanned Brig Discipline Decay");
// Move Officer Bravo out of brig so brig is unmanned by active guards
engine.crew[1].currentRoom = "reactor";
engine.telemetry.discipline.value = 100;

// Tick 10 seconds with dt = 1.0s
for (let i = 0; i < 10; i++) {
    engine.updateVesselTelemetry(1.0);
}

const discAfter10s = engine.telemetry.discipline.value;
console.log(`  Discipline after 10s unmanned: ${discAfter10s.toFixed(2)}% (Expected: 98.65%)`);
assert.strictEqual(discAfter10s.toFixed(2), "98.65", "Discipline must drain at exactly -0.135%/s when unmanned");

// Tick another 90s (total 100s)
for (let i = 0; i < 90; i++) {
    engine.updateVesselTelemetry(1.0);
}
const discAfter100s = engine.telemetry.discipline.value;
console.log(`  Discipline after 100s unmanned: ${discAfter100s.toFixed(2)}% (Expected: 86.50%)`);
assert.strictEqual(discAfter100s.toFixed(2), "86.50", "Discipline must drop by 13.5% after 100s unmanned");
console.log("  ✅ TEST 1 PASSED: Unmanned Brig drains discipline at -0.135%/s (35% faster).");

// TEST 2: Detained Prisoner Does NOT Count as Guard
console.log("\nTest 2: Detained Prisoner Alone in Brig");
// Delta is detained in brig (isDetained: true), Bravo is still in reactor
engine.updateVesselTelemetry(1.0);
console.log(`  Discipline rate with only detained prisoner: ${engine.telemetry.discipline.rate}%/s (Expected: -0.135%/s)`);
assert.strictEqual(engine.telemetry.discipline.rate, -0.135, "Detained prisoner must not act as security guard");
console.log("  ✅ TEST 2 PASSED: Detained prisoners do not satisfy Brig staffing.");

// TEST 3: Manned Brig Discipline Recovery (+1.0%/s)
console.log("\nTest 3: Manned Brig Discipline Recovery");
// Place Bravo back in Brig as active guard
engine.crew[1].currentRoom = "brig";
engine.crew[1].isDetained = false;
engine.telemetry.discipline.value = 80;

for (let i = 0; i < 10; i++) {
    engine.updateVesselTelemetry(1.0);
}
const discRecovered10s = engine.telemetry.discipline.value;
console.log(`  Discipline after 10s manned: ${discRecovered10s.toFixed(2)}% (Expected: 90.00%)`);
assert.strictEqual(discRecovered10s.toFixed(2), "90.00", "Discipline must recover at +1.0%/s when manned");

// Tick another 15s (should cap at 100)
for (let i = 0; i < 15; i++) {
    engine.updateVesselTelemetry(1.0);
}
console.log(`  Discipline after 25s manned: ${engine.telemetry.discipline.value.toFixed(2)}% (Expected: 100.00% cap)`);
assert.strictEqual(engine.telemetry.discipline.value, 100, "Discipline must cap cleanly at 100%");
console.log("  ✅ TEST 3 PASSED: Manned Brig recovers discipline at +1.0%/s capped at 100%.");

// TEST 4: Simplified Vitals (HP & ENG Only)
console.log("\nTest 4: Simplified Crew Vitals (HP & ENG Only)");
engine.crew.forEach(officer => {
    assert.strictEqual(officer.san, undefined, `Officer ${officer.name} should not have individual sanity stat`);
    assert.ok(officer.hp !== undefined, `Officer ${officer.name} must have HP`);
    assert.ok(officer.eng !== undefined, `Officer ${officer.name} must have ENG`);
});
console.log("  Officer stats verified: only HP (Physical Health) and ENG (Stamina) tracked on crew members.");
console.log("  ✅ TEST 4 PASSED: Crew vitals cleanly simplified to HP and ENG.");

// TEST 5: Sleep Pods Stamina Rest
console.log("\nTest 5: Sleep Pods Stamina Restoration");
// Charlie starts at eng = 30 in sleep pods
engine.updateCrewVitals(10.0);
console.log(`  Charlie ENG after 10s in Sleep Pods: ${engine.crew[2].eng.toFixed(2)}% (Expected: 65.00%)`);
assert.strictEqual(engine.crew[2].eng.toFixed(2), "65.00", "Sleep Pods must restore stamina (+3.5 ENG/s)");
console.log("  ✅ TEST 5 PASSED: Sleep Pods stamina recovery operational.");

// TEST 6: Decoupled Stressor Triggers (ENG <= 5)
console.log("\nTest 6: Extreme Sleep Deprivation Panic Trigger");
engine.crew[0].eng = 4; // Alpha in cockpit neglected to eng <= 5
engine.evaluateConditionTriggers(1.0);
console.log(`  Alpha PANIC_ATTACK condition present: ${engine.hasCondition(engine.crew[0], 'PANIC_ATTACK')} (Expected: true)`);
assert.ok(engine.hasCondition(engine.crew[0], 'PANIC_ATTACK'), "Neglected officer at eng <= 5 must suffer panic attack breakdown");
console.log("  ✅ TEST 6 PASSED: Stressor trigger fires on extreme sleep deprivation without individual sanity.");

console.log("\n====================================================");
console.log("🎉 ALL BRIG DISCIPLINE & SIMPLIFIED VITALS TESTS PASSED!");
console.log("====================================================");
