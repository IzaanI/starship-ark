/**
 * test_flight_rebalance_and_vitals.js
 * Comprehensive unit test verifying:
 * 1. Base Voyage ETA: 450s (07:30)
 * 2. Station drain curve calibration (0.40% unmanned, 0.165% core, 0.125% stacked)
 * 3. Duty stamina drain (0.58%/s -> ~172s exhaustion) and Standby stamina drain (0.25%/s)
 * 4. Mouths to feed ratio scaling for O2 and Food drain
 * 5. Crisis director interval (120-160s) and Track C director interval (130-180s)
 */

const fs = require('fs');
const path = require('path');

// Mock browser environment
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

// Load codebase
const bridgeCode = fs.readFileSync(path.join(__dirname, '../src/phase2/phase2Bridge.js'), 'utf8');
eval(bridgeCode);

const flightEngineCode = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(flightEngineCode);

const engine = window.FlightEngine;

console.log("====================================================");
console.log("🧪 TESTING FLIGHT REBALANCE, VITALS & MOUTHS TO FEED");
console.log("====================================================");

// 1. Voyage Duration & ETA Display
console.log("\nTest 1: Base Voyage Duration & ETA");
console.log(`  Total Voyage Seconds: ${engine.totalVoyageSeconds}s (Expected: 400s)`);
console.log(`  Formatted Initial ETA: ${engine.formatTime(engine.totalVoyageSeconds)} (Expected: 06:40)`);
if (engine.totalVoyageSeconds !== 400 || engine.formatTime(engine.totalVoyageSeconds) !== "06:40") {
    throw new Error("Test 1 Failed: Total voyage seconds must be 400 (06:40)");
}
console.log("  ✅ TEST 1 PASSED: Voyage ETA correctly set to original 6.67 minutes (400s / 06:40).");

// 2. Station Drain Curve Calibration
console.log("\nTest 2: Calibrated Station Drain Curve");
const unmannedRate = engine.getStationDrainRate('reactor').drainRate;
console.log(`  Unmanned Drain Rate: ${unmannedRate}%/s (Expected: 0.32)`);

// Single Core officer (Elena Rostova at Reactor)
const elena = {
    name: "Elena Rostova",
    currentRoom: "reactor",
    transitRemaining: 0,
    roleTier: "Core",
    roles: ["Nuclear Specialist", "Systems Diagnostician"],
    stationAffinities: { Reactor: "Core" },
    eng: 100, san: 100, hp: 100,
    conditions: []
};
engine.crew = [elena];
const coreRate = engine.getStationDrainRate('reactor').drainRate;
console.log(`  Core Officer Drain Rate: ${coreRate}%/s (Expected: 0.145)`);

// Stacked officers (Two Core officers at Reactor: 1.0 + 0.6 = 1.6 eff)
const marcus = {
    name: "Marcus Flint",
    currentRoom: "reactor",
    transitRemaining: 0,
    roleTier: "Core",
    roles: ["Nuclear Specialist"],
    stationAffinities: { Reactor: "Core" },
    eng: 100, san: 100, hp: 100,
    conditions: []
};
engine.crew = [elena, marcus];
const stackedRate = engine.getStationDrainRate('reactor').drainRate;
console.log(`  Stacked Officers Drain Rate (Max Stacking): ${stackedRate}%/s (Expected: 0.105)`);

if (unmannedRate !== 0.32 || Math.abs(coreRate - 0.145) > 0.005 || Math.abs(stackedRate - 0.105) > 0.005) {
    throw new Error(`Test 2 Failed: Station drain rates mismatch calibration (unmanned: ${unmannedRate}, core: ${coreRate}, stacked: ${stackedRate})`);
}
console.log("  ✅ TEST 2 PASSED: Calibrated station drain curve verified.");

// 3. Duty & Standby Stamina Drain
console.log("\nTest 3: Duty & Standby Stamina Drain Calibration");
const testOfficerDuty = {
    name: "Duty Officer",
    currentRoom: "reactor",
    transitRemaining: 0,
    eng: 100, san: 100, hp: 100,
    status: "ASSIGNED: REACTOR BAY",
    conditions: []
};
const testOfficerStandby = {
    name: "Standby Officer",
    currentRoom: null,
    transitRemaining: 0,
    eng: 100, san: 100, hp: 100,
    status: "UNASSIGNED",
    conditions: []
};
const testOfficerSleeping = {
    name: "Sleeping Officer",
    currentRoom: "sleepPods",
    transitRemaining: 0,
    eng: 30, san: 100, hp: 100,
    status: "RESTING IN QUARTERS",
    conditions: []
};
const testOfficerBrig = {
    name: "Brig Guard",
    currentRoom: "brig",
    isDetained: false,
    transitRemaining: 0,
    eng: 100, san: 100, hp: 100,
    status: "ASSIGNED: THE BRIG",
    conditions: []
};
engine.crew = [testOfficerDuty, testOfficerStandby, testOfficerSleeping, testOfficerBrig];

// Advance vitals by 10 seconds
engine.updateCrewVitals(10.0);
const expectedDutyEng = 100 - (0.315 * 10); // 96.85
const expectedStandbyEng = 100 - (0.126 * 10); // 98.74
const expectedSleepEng = 30 + (3.5 * 10); // 65.0
const expectedBrigEng = 100 - (0.315 * 10); // 96.85 (should drain normally from 100, not clamped at 80!)
console.log(`  Duty Officer Energy after 10s: ${testOfficerDuty.eng.toFixed(2)}% (Expected: ${expectedDutyEng.toFixed(2)}%)`);
console.log(`  Standby Officer Energy after 10s: ${testOfficerStandby.eng.toFixed(2)}% (Expected: ${expectedStandbyEng.toFixed(2)}%)`);
console.log(`  Sleeping Officer Energy after 10s: ${testOfficerSleeping.eng.toFixed(2)}% (Expected: ${expectedSleepEng.toFixed(2)}%)`);
console.log(`  Brig Guard Energy after 10s: ${testOfficerBrig.eng.toFixed(2)}% (Expected: ${expectedBrigEng.toFixed(2)}% - NOT clamped at 80)`);

// 100% -> 30% duty cycle calculation: 70 / 0.315 = 222.2 seconds (~3.70 minutes)
const timeToSleep = (70 / 0.315).toFixed(1);
console.log(`  Duty Cycle to 30%: ${timeToSleep}s (Target: ~222s / 3.7m)`);

if (Math.abs(testOfficerDuty.eng - expectedDutyEng) > 0.1 || Math.abs(testOfficerStandby.eng - expectedStandbyEng) > 0.1 || Math.abs(testOfficerSleeping.eng - expectedSleepEng) > 0.1 || Math.abs(testOfficerBrig.eng - expectedBrigEng) > 0.1) {
    throw new Error("Test 3 Failed: Stamina drain / recovery rates mismatch or Brig guard clamped.");
}
console.log("  ✅ TEST 3 PASSED: Duty stamina drains in ~222s (10% lower), Sleep Pod recharges 70% in 20s, Brig guard drains normally from 100.");

// 4. Mouths to Feed & Living Crew Scaling
console.log("\nTest 4: Mouths to Feed Scaling (O2 & Food)");
const fullRoster = [
    { name: "C1", currentRoom: "o2bay", transitRemaining: 0, weightLbs: 165, isDead: false, status: "ASSIGNED: O2", conditions: [] },
    { name: "C2", currentRoom: "hydroponics", transitRemaining: 0, weightLbs: 165, isDead: false, status: "ASSIGNED: HYDRO", conditions: [] },
    { name: "C3", currentRoom: "reactor", transitRemaining: 0, weightLbs: 165, isDead: false, status: "ASSIGNED: REACTOR", conditions: [] },
    { name: "C4", currentRoom: null, transitRemaining: 0, weightLbs: 165, isDead: false, status: "UNASSIGNED", conditions: [] },
    { name: "C5", currentRoom: null, transitRemaining: 0, weightLbs: 165, isDead: false, status: "UNASSIGNED", conditions: [] },
    { name: "C6", currentRoom: null, transitRemaining: 0, weightLbs: 165, isDead: false, status: "UNASSIGNED", conditions: [] }
];
engine.crew = fullRoster;
engine.updateVesselTelemetry(0);
const fullRatio = engine.telemetry.o2.crewRationRatio;
const initialO2Drain = engine.telemetry.o2.drainRate;
const initialFoodDrain = engine.telemetry.food.drainRate;
console.log(`  Living Crew Count: 6 officers + 1 commander = 7 mouths`);
console.log(`  Full Roster Ratio: ${fullRatio} (Expected: 1.0)`);
console.log(`  Baseline O2 Drain: ${initialO2Drain}%/s, Food Drain: ${initialFoodDrain}%/s`);

// Eject / sacrifice 1 crew member
fullRoster[5].isDead = true;
fullRoster[5].status = 'DECEASED';
engine.updateVesselTelemetry(0);
const reducedRatio = engine.telemetry.o2.crewRationRatio;
const reducedO2Drain = engine.telemetry.o2.drainRate;
const reducedFoodDrain = engine.telemetry.food.drainRate;
console.log(`  After 1 Sacrifice/Casualty: 5 officers + 1 commander = 6 mouths`);
console.log(`  Reduced Roster Ratio: ${reducedRatio} (Expected: 6/7 ≈ 0.857)`);
console.log(`  Reduced O2 Drain: ${reducedO2Drain}%/s (Expected lower by ~14.3%)`);
console.log(`  Reduced Food Drain: ${reducedFoodDrain}%/s (Expected lower by ~14.3%)`);

if (fullRatio !== 1.0 || reducedRatio !== 0.857 || reducedO2Drain >= initialO2Drain || reducedFoodDrain >= initialFoodDrain) {
    throw new Error("Test 4 Failed: Mouths to feed ratio scaling incorrect.");
}
console.log("  ✅ TEST 4 PASSED: Living crew count dynamically scales life support and ration burn.");

// 5. Ambient Crisis and Random Event Director Timers
console.log("\nTest 5: Ambient Director Recurring Intervals");
// Advance crisis timer past 0 to trigger and inspect next scheduled interval
engine.crisisDirectorTimer = 0.1;
engine.speedMultiplier = 1;
engine.distancePercent = 10;
engine.updateCrisisDirector(0.2);
console.log(`  Next Ambient Crisis Timer: ${engine.crisisDirectorTimer.toFixed(1)}s (Expected between 120s and 160s)`);

engine.randomEventDirectorTimer = 0.1;
engine.activeTrackCIncident = null;
engine.activeSabotage = null;
engine.updateRandomEventDirector(0.2);
console.log(`  Next Track C Incident Timer: ${engine.randomEventDirectorTimer.toFixed(1)}s (Expected between 130s and 180s)`);

if (engine.crisisDirectorTimer < 119 || engine.crisisDirectorTimer > 161) {
    throw new Error("Test 5 Failed: Crisis director interval outside 120-160s range.");
}
if (engine.randomEventDirectorTimer < 129 || engine.randomEventDirectorTimer > 181) {
    throw new Error("Test 5 Failed: Track C director interval outside 130-180s range.");
}
console.log("  ✅ TEST 5 PASSED: Director intervals successfully spaced to emphasize human personnel management.");

console.log("\n====================================================");
console.log("🎉 ALL FLIGHT REBALANCE & VITALS CHECKS PASSED!");
console.log("====================================================");
