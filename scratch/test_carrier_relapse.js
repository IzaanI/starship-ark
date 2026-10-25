// Test suite for Contagious Carrier Recurring Relapse Lifecycle
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
    playLaunchAlert: () => {},
    playStationArrival: () => {}
};

// Load codebase
const bridgeCode = fs.readFileSync(path.join(__dirname, '../src/phase2/phase2Bridge.js'), 'utf8');
eval(bridgeCode);

const flightEngineCode = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(flightEngineCode);

const engine = window.FlightEngine;

console.log("====================================================");
console.log("TESTING CONTAGIOUS CARRIER RECURRING RELAPSE");
console.log("====================================================");

const carrier = {
    name: "Dr. Arthur Bell",
    trueIdentity: "CONTAGIOUS_CARRIER",
    currentRoom: "hydroponics",
    transitRemaining: 0,
    roleTier: "Core",
    roles: ["Biochemist"],
    stationAffinities: { Hydroponics: "Core" },
    eng: 100, san: 100, hp: 100,
    conditions: {}
};

const roommate = {
    name: "Elena Rostova",
    trueIdentity: "GENUINE_CREW",
    currentRoom: "hydroponics",
    transitRemaining: 0,
    roleTier: "Core",
    roles: ["Nuclear Specialist"],
    stationAffinities: { Reactor: "Core" },
    eng: 100, san: 100, hp: 100,
    conditions: {}
};

engine.crew = [carrier, roommate];
engine.start(engine.crew);
engine.speedMultiplier = 1;

console.log("\n[TEST 1] Verifying no infection before 20% distance");
engine.distancePercent = 15;
engine.evaluateConditionTriggers(1.0);
if (engine.hasCondition(carrier, 'CONTAGIOUS_INFECTION')) {
    throw new Error("Carrier should not flare up before 20% distance.");
}
console.log("  TEST 1 PASSED: Carrier remains asymptomatic before 20% distance.");

console.log("\n[TEST 2] Verifying initial flare-up at 20% distance");
engine.distancePercent = 20;
engine.evaluateConditionTriggers(1.0);
if (!engine.hasCondition(carrier, 'CONTAGIOUS_INFECTION')) {
    throw new Error("Carrier failed to flare up at 20% distance.");
}
console.log("  TEST 2 PASSED: Initial dormant flare-up triggered at 20% distance.");

console.log("\n[TEST 3] Curing carrier in Medbay and verifying 80-100s relapse window");
carrier.currentRoom = "medbay";
engine.removeCondition(carrier, 'CONTAGIOUS_INFECTION');
if (engine.hasCondition(carrier, 'CONTAGIOUS_INFECTION')) {
    throw new Error("Carrier condition was not removed.");
}
if (!engine.carrierRelapseTimer || engine.carrierRelapseTimer < 79 || engine.carrierRelapseTimer > 101) {
    throw new Error(`Carrier relapse timer not set to 80-100s: ${engine.carrierRelapseTimer}`);
}
console.log(`  TEST 3 PASSED: Carrier cured in Medbay. Relapse window set to ${engine.carrierRelapseTimer.toFixed(1)}s.`);

console.log("\n[TEST 4] Simulating time passing and verifying relapse occurs after ~90s");
carrier.currentRoom = "hydroponics"; // Returned to station
engine.evaluateConditionTriggers(30.0);
if (engine.hasCondition(carrier, 'CONTAGIOUS_INFECTION')) {
    throw new Error("Carrier relapsed too early (after only 30s).");
}
console.log("  Carrier still in remission at 30s.");

// Fast-forward remaining timer
engine.evaluateConditionTriggers(75.0);
if (!engine.hasCondition(carrier, 'CONTAGIOUS_INFECTION')) {
    throw new Error("Carrier failed to relapse after relapse timer expired.");
}
console.log("  TEST 4 PASSED: Chronic pathogen relapse triggered after timer expired.");

console.log("\n[TEST 5] Airborne spread to co-occupants in Hydroponics");
// 12s spread interval defined in PERSONNEL_CONDITIONS
engine.updatePersonnelConditions(6.0);
if (engine.hasCondition(roommate, 'CONTAGIOUS_INFECTION')) {
    throw new Error("Roommate infected too fast (before 12s exposure).");
}
engine.updatePersonnelConditions(7.0); // Total 13s
if (!engine.hasCondition(roommate, 'CONTAGIOUS_INFECTION')) {
    throw new Error("Roommate was not contaminated after 13s shared exposure.");
}
console.log("  TEST 5 PASSED: Pathogen successfully spread to roommate after exposure.");

console.log("\nALL 5 CARRIER RELAPSE TESTS PASSED CLEANLY!");
