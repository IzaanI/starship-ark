/**
 * TEST: Transit Reassignment While Paused & Food Consumption Easing
 */

const fs = require('fs');
const path = require('path');

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
    playLaunchAlert: () => {},
    playStationArrival: () => {},
    playPneumaticDoor: () => {}
};

// Load codebase
const bridgeCode = fs.readFileSync(path.join(__dirname, '../src/phase2/phase2Bridge.js'), 'utf8');
eval(bridgeCode);

const flightEngineCode = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(flightEngineCode);

const bridge = window.Phase2Bridge;
const engine = window.FlightEngine;

console.log('====================================================');
console.log('TESTING TRANSIT REASSIGNMENT WHILE PAUSED');
console.log('====================================================');

const testOfficer = {
    name: "Marcus Vance",
    trueIdentity: "INDEPENDENT",
    roleTitle: "Systems Engineer",
    currentRoom: "reactor",
    previousRoom: null,
    transitTarget: null,
    transitRemaining: 0,
    transitTotal: 0,
    roleTier: "Core",
    roles: ["Nuclear Specialist"],
    stationAffinities: { Reactor: "Core" },
    eng: 100, san: 100, hp: 100,
    conditions: {},
    status: "ASSIGNED: REACTOR CORE"
};

bridge.crew = [testOfficer];
engine.crew = bridge.crew;
bridge.activeSpeed = 'pause';
engine.speedMultiplier = 0;

console.log('[TEST 1] Dispatch officer to Cockpit while paused');
bridge.dispatchOfficer(0, 'cockpit');
if (testOfficer.currentRoom !== null || testOfficer.transitTarget !== 'cockpit' || testOfficer.transitRemaining <= 0) {
    throw new Error(`Expected transit to cockpit with duration > 0, got room=${testOfficer.currentRoom}, target=${testOfficer.transitTarget}, rem=${testOfficer.transitRemaining}`);
}
console.log(`  PASSED: Officer dispatched towards cockpit: ${testOfficer.status}`);

console.log('\n[TEST 2] Reassign officer back to original station (Reactor) while paused');
bridge.dispatchOfficer(0, 'reactor');

if (testOfficer.currentRoom !== 'reactor') {
    throw new Error(`Expected officer to be immediately restored to 'reactor', got currentRoom=${testOfficer.currentRoom}`);
}
if (testOfficer.transitTarget !== null) {
    throw new Error(`Expected transitTarget to be null, got ${testOfficer.transitTarget}`);
}
if (testOfficer.transitRemaining !== 0) {
    throw new Error(`Expected transitRemaining to be 0, got ${testOfficer.transitRemaining}`);
}
if (testOfficer.status.includes('TRANSIT')) {
    throw new Error(`Expected status to not be TRANSIT, got: ${testOfficer.status}`);
}
console.log(`  PASSED: Officer immediately restored to reactor with status: "${testOfficer.status}" (No 0s limbo)`);

console.log('\n[TEST 3] Re-clicking current station unassigns officer');
bridge.dispatchOfficer(0, 'reactor');
if (testOfficer.currentRoom !== null || testOfficer.status !== 'UNASSIGNED') {
    throw new Error(`Expected officer to be unassigned, got room=${testOfficer.currentRoom}, status=${testOfficer.status}`);
}
console.log(`  PASSED: Officer successfully unassigned: "${testOfficer.status}"`);

console.log('\n====================================================');
console.log('TESTING FOOD CONSUMPTION EASING (~8% LESS DRAIN)');
console.log('====================================================');

engine.start([testOfficer]);
engine.speedMultiplier = 1;

// Base hydro metrics with 1 crew
const hydroMetrics = engine.getStationDrainRate('hydroponics');
const weightFactor = engine.getMetabolicWeightFactor();
const livingCrewCount = 2; // 1 officer + 1 commander
const crewRationRatio = Number((livingCrewCount / 7).toFixed(3));

const rawDrain = Number((hydroMetrics.drainRate * weightFactor * crewRationRatio).toFixed(3));
const expectedEasedDrain = Number((hydroMetrics.drainRate * weightFactor * crewRationRatio * 0.92).toFixed(3));

engine.updateVesselTelemetry(0);
const actualFoodDrain = engine.telemetry.food.drainRate;

console.log(`Raw unmitigated drain: ${rawDrain}%/s`);
console.log(`Eased drain (0.92x):    ${expectedEasedDrain}%/s`);
console.log(`Engine actual drain:   ${actualFoodDrain}%/s`);

if (actualFoodDrain !== expectedEasedDrain) {
    throw new Error(`Expected actual food drain ${expectedEasedDrain}, got ${actualFoodDrain}`);
}

const percentReduction = ((rawDrain - actualFoodDrain) / rawDrain) * 100;
console.log(`  PASSED: Food drain reduced by ${percentReduction.toFixed(2)}% (~8% lighter).`);

console.log('\nALL TRANSIT & FOOD TESTS PASSED CLEANLY!');
