// scratch/test_personnel_conditions.js
const fs = require('fs');
const path = require('path');

// Mock browser environment
global.window = {
    Phase2Bridge: {
        compartments: {
            cockpit: { id: 'cockpit', name: 'Flight Deck', tag: 'NAV', deck: 5, maxOccupants: 1 },
            reactor: { id: 'reactor', name: 'Reactor Core', tag: 'PWR', deck: 1, maxOccupants: 2 },
            o2bay: { id: 'o2bay', name: 'Life Support / O2', tag: 'LS', deck: 4, maxOccupants: 2 },
            hydroponics: { id: 'hydroponics', name: 'Hydroponics Bay', tag: 'BIO', deck: 3, maxOccupants: 2 },
            medbay: { id: 'medbay', name: 'Medbay', tag: 'MED', deck: 2, maxOccupants: 2 },
            sleepPods: { id: 'sleepPods', name: 'Crew Quarters', tag: 'QTR', deck: 2, maxOccupants: 2 },
            workshop: { id: 'workshop', name: 'Workshop', tag: 'ENG', deck: 1, maxOccupants: 2 },
            brig: { id: 'brig', name: 'The Brig', tag: 'SEC', deck: 4, maxOccupants: 2 }
        },
        alerts: [],
        pushAlert: function(alert) {
            this.alerts.push(alert);
        },
        dismissAlert: function(alertId) {
            this.alerts = this.alerts.filter(a => a.id !== alertId);
        },
        renderRoomOccupants: function() {},
        renderCrewManifest: function() {},
        dispatchOfficer: function(idx, roomId) {
            if (global.window.FlightEngine && global.window.FlightEngine.crew[idx]) {
                const off = global.window.FlightEngine.crew[idx];
                off.currentRoom = roomId;
                off.transitRemaining = 0;
            }
        }
    },
    SoundFX: {
        playCrisisAlert: function() {},
        playLaunchAlert: function() {},
        playKeyClick: function() {}
    }
};

global.document = {
    getElementById: function() { return { style: {}, textContent: '', classList: { add: () => {}, remove: () => {} } }; },
    querySelectorAll: function() { return []; },
    querySelector: function() { return null; }
};

global.performance = {
    now: function() { return Date.now(); }
};

// Load flightEngine.js
const engineCode = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(engineCode);

console.log("=== RUNNING PERSONNEL CONDITIONS & INCIDENTS VERIFICATION ===");

const engine = window.FlightEngine;

// Setup mock test crew
const testCrew = [
    {
        name: "Elena Rostova",
        station: "Reactor",
        roleTitle: "Reactor Core Engineer",
        roleTier: "Core",
        stationAffinities: { reactor: "Core", workshop: "Adjacent" },
        trueIdentity: "LEGITIMATE_EXPERT",
        hp: 100,
        san: 100,
        eng: 100,
        status: "ASSIGNED: REACTOR CORE",
        currentRoom: "reactor",
        transitRemaining: 0,
        conditions: {}
    },
    {
        name: "Marcus Vance",
        station: "O2 Bay",
        roleTitle: "Atmospheric Technician",
        roleTier: "Core",
        stationAffinities: { o2bay: "Core" },
        trueIdentity: "DESPERATE_FRAUD",
        hp: 100,
        san: 100,
        eng: 100,
        status: "ASSIGNED: LIFE SUPPORT / O2",
        currentRoom: "o2bay",
        transitRemaining: 0,
        conditions: {}
    },
    {
        name: "Kaelen Voss",
        station: "Hydroponics",
        roleTitle: "Hydroponic Specialist",
        roleTier: "Core",
        stationAffinities: { hydroponics: "Core" },
        trueIdentity: "CONTAGIOUS_CARRIER",
        hp: 100,
        san: 100,
        eng: 100,
        status: "ASSIGNED: HYDROPONICS BAY",
        currentRoom: "hydroponics",
        transitRemaining: 0,
        conditions: {}
    },
    {
        name: "Sarah Chen",
        station: "Hydroponics",
        roleTitle: "Botanical Assistant",
        roleTier: "Adjacent",
        stationAffinities: { hydroponics: "Adjacent" },
        trueIdentity: "LEGITIMATE_EXPERT",
        hp: 100,
        san: 100,
        eng: 100,
        status: "ASSIGNED: HYDROPONICS BAY",
        currentRoom: "hydroponics",
        transitRemaining: 0,
        conditions: {}
    }
];

engine.crew = testCrew;
engine.speedMultiplier = 1;

// TEST 1: Station Efficiency for healthy officer
const initialEff = engine.getOfficerStationEfficiency(testCrew[0], 'reactor');
console.log(`[TEST 1] Elena Rostova healthy Reactor Efficiency: ${initialEff} (Expected: 1.0)`);
if (initialEff !== 1.0) throw new Error("Expected initial efficiency 1.0");

// TEST 2: Add PANIC_ATTACK condition
const panicAdded = engine.addCondition(testCrew[0], 'PANIC_ATTACK', 'Stress overload');
console.log(`[TEST 2] Add PANIC_ATTACK to Elena: ${panicAdded}`);
if (!panicAdded) throw new Error("Failed to add PANIC_ATTACK");
if (!engine.hasCondition(testCrew[0], 'PANIC_ATTACK')) throw new Error("hasCondition check failed");

// Check efficiency dropped to 0%
const panickedEff = engine.getOfficerStationEfficiency(testCrew[0], 'reactor');
console.log(`[TEST 2] Elena Rostova Panicked Efficiency: ${panickedEff} (Expected: 0.0)`);
if (panickedEff !== 0.0) throw new Error("Panicked efficiency must be 0.0");

// TEST 3: Station Crisis Repair with panicked officer
engine.triggerCrisis('reactor');
const crisisWorkInfo = engine.getCrisisWorkRate('reactor');
console.log(`[TEST 3] Reactor Crisis Work Rate with Panicked Officer: ${crisisWorkInfo.rate} (Expected: 0.0)`);
console.log(`[TEST 3] Crisis isPanicked flag: ${crisisWorkInfo.isPanicked} (Expected: true)`);
if (crisisWorkInfo.rate !== 0.0 || !crisisWorkInfo.isPanicked) throw new Error("Panicked officer must produce 0.0 crisis work");

// Check crisis alert message shows CREW PANICKED notice
const crisisAlert = window.Phase2Bridge.alerts.find(a => a.id === 'crisis-reactor');
console.log(`[TEST 3] Crisis Alert message contains 'CREW PANICKED': ${crisisAlert && crisisAlert.message.includes('CREW PANICKED')}`);
if (!crisisAlert || !crisisAlert.message.includes('CREW PANICKED')) throw new Error("Crisis alert must show CREW PANICKED notice");

// TEST 4: Sleep Pods Panic Cure
// Move Elena to Sleep Pods
engine.crew[0].currentRoom = 'sleepPods';
engine.crew[0].transitRemaining = 0;

// Simulate 5s of resting in sleep pods (halfway to 10s)
engine.updatePersonnelConditions(5.0);
console.log(`[TEST 4] Elena still panicked after 5s rest: ${engine.hasCondition(testCrew[0], 'PANIC_ATTACK')}`);
if (!engine.hasCondition(testCrew[0], 'PANIC_ATTACK')) throw new Error("Should still be panicked at 5s");

// Simulate remaining 5.5s of resting (total > 10s)
engine.updatePersonnelConditions(5.5);
console.log(`[TEST 4] Elena cured after 10.5s rest in Sleep Pods: ${!engine.hasCondition(testCrew[0], 'PANIC_ATTACK')}`);
if (engine.hasCondition(testCrew[0], 'PANIC_ATTACK')) throw new Error("Panic should be cured after 10s in sleep pods");

// TEST 5: Contagious Infection & Airborne Compartment Spreading
// Kaelen Voss and Sarah Chen both in hydroponics
engine.addCondition(testCrew[2], 'CONTAGIOUS_INFECTION', 'Incubation flare');
const kaelenInitialHp = testCrew[2].hp;

// Simulate 6s
engine.updatePersonnelConditions(6.0);
console.log(`[TEST 5] Kaelen HP after 6s (-0.35/s): ${testCrew[2].hp.toFixed(2)} (Expected ~97.9)`);
if (testCrew[2].hp >= kaelenInitialHp) throw new Error("Contagion must drain HP");
console.log(`[TEST 5] Sarah infected after 6s: ${engine.hasCondition(testCrew[3], 'CONTAGIOUS_INFECTION')} (Expected: false, interval is 12s)`);
if (engine.hasCondition(testCrew[3], 'CONTAGIOUS_INFECTION')) throw new Error("Sarah should not be infected before 12s");

// Simulate another 7s (total 13s > 12s spread interval)
engine.updatePersonnelConditions(7.0);
console.log(`[TEST 5] Sarah cross-infected after 13s in same room: ${engine.hasCondition(testCrew[3], 'CONTAGIOUS_INFECTION')} (Expected: true)`);
if (!engine.hasCondition(testCrew[3], 'CONTAGIOUS_INFECTION')) throw new Error("Sarah should have caught contagion after 12s shared room exposure");

// TEST 6: Medbay Quarantine Cure
// Move Kaelen to Medbay with an attendant (requires 2 crewmates in Medbay)
testCrew[2].currentRoom = 'medbay';
testCrew[2].transitRemaining = 0;
testCrew[0].currentRoom = 'medbay';
testCrew[0].transitRemaining = 0;

// Simulate 24s in Medbay (mismatched attendant threshold is 23s)
engine.updatePersonnelConditions(24.0);
console.log(`[TEST 6] Kaelen cured after Medbay quarantine with mismatched attendant: ${!engine.hasCondition(testCrew[2], 'CONTAGIOUS_INFECTION')}`);
if (engine.hasCondition(testCrew[2], 'CONTAGIOUS_INFECTION')) throw new Error("Contagion should be cured after 24s in Medbay with mismatched attendant");

// TEST 7: Decoupled Systemic Stressor Trigger (Acute exhaustion: eng <= 5, san < 35)
testCrew[1].eng = 4;
testCrew[1].san = 25;
testCrew[1].currentRoom = 'workshop';
engine.evaluateConditionTriggers(1.0);
console.log(`[TEST 7] Sleep-deprived officer automatically panicked: ${engine.hasCondition(testCrew[1], 'PANIC_ATTACK')} (Expected: true)`);
if (!engine.hasCondition(testCrew[1], 'PANIC_ATTACK')) throw new Error("Exhausted officer must suffer panic attack");

console.log("\n=== ALL PERSONNEL CONDITION CHECKS PASSED PERFECTLY ===");
