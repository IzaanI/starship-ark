// scratch/test_anti_loop_and_alerts.js
const fs = require('fs');
const path = require('path');

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
            const idx = this.alerts.findIndex(a => a.id === alert.id);
            if (idx >= 0) {
                this.alerts[idx] = alert;
            } else {
                this.alerts.push(alert);
            }
        },
        dismissAlert: function(alertId) {
            this.alerts = this.alerts.filter(a => a.id !== alertId);
        },
        renderRoomOccupants: function() {},
        renderCrewManifest: function() {}
    },
    SoundFX: {
        playCrisisAlert: function() {},
        playLaunchAlert: function() {},
        playKeyClick: function() {}
    }
};

global.document = {
    getElementById: function() {
        return {
            style: {},
            textContent: '',
            classList: { add: () => {}, remove: () => {} },
            querySelector: function() { return null; },
            querySelectorAll: function() { return []; },
            children: [],
            insertBefore: function() {}
        };
    },
    querySelectorAll: function() { return []; },
    querySelector: function() { return null; }
};

global.Image = class { constructor() {} };

global.performance = {
    now: function() { return Date.now(); }
};

// Load engine and bridge
const engineCode = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(engineCode);

const bridgeCode = fs.readFileSync(path.join(__dirname, '../src/phase2/phase2Bridge.js'), 'utf8');
eval(bridgeCode);

const engine = window.FlightEngine;
const bridge = window.Phase2Bridge;

// Setup fraud officer on reactor
const fraud = {
    name: "Viktor Kane",
    station: "Reactor",
    roleTitle: "Reactor Core Specialist",
    roleTier: "Core",
    stationAffinities: { reactor: "Core" },
    trueIdentity: "DESPERATE_FRAUD",
    hp: 100,
    san: 100,
    eng: 100,
    status: "ASSIGNED: REACTOR CORE",
    currentRoom: "reactor",
    transitRemaining: 0,
    conditions: {}
};

engine.crew = [fraud];
engine.speedMultiplier = 1;

console.log("=== TEST 1: Triggering Crisis on Reactor with Fraud Stationed ===");
engine.triggerCrisis('reactor');

// Evaluate triggers - fraud should panic (50% rule: seed random to trigger)
const origRandom = Math.random;
Math.random = () => 0.1;
engine.evaluateConditionTriggers(1.0);
Math.random = origRandom;

console.log(`Fraud has PANIC_ATTACK: ${engine.hasCondition(fraud, 'PANIC_ATTACK')} (Expected: true)`);
if (!engine.hasCondition(fraud, 'PANIC_ATTACK')) throw new Error("Fraud should panic on first crisis encounter");

console.log(`Total alerts in board: ${bridge.alerts.length}`);
bridge.alerts.forEach(a => console.log(`  - [${a.type.toUpperCase()}] ${a.id}: ${a.title}`));

// Verify: ONLY one crisis alert and ONE condition alert (both critical/red), ZERO warning/orange alerts!
const warningAlerts = bridge.alerts.filter(a => a.type === 'warning');
console.log(`Warning/Orange alert count: ${warningAlerts.length} (Expected: 0)`);
if (warningAlerts.length > 0) throw new Error("There must be NO orange warning alerts for crew panic!");

const panicAlert = bridge.alerts.find(a => a.id.startsWith('cond-panic_attack'));
if (!panicAlert) throw new Error("Expected panic alert card");

console.log(`Panic Alert has noActionBtn: ${panicAlert.noActionBtn} (Expected: true)`);
console.log(`Panic Alert has actionLabel: ${panicAlert.actionLabel} (Expected: null)`);
console.log(`Panic Alert message includes 'crisis-progress-track': ${panicAlert.message.includes('crisis-progress-track')}`);
if (!panicAlert.noActionBtn || panicAlert.actionLabel !== null || !panicAlert.message.includes('crisis-progress-track')) {
    throw new Error("Panic card must have progress bar and NO action button");
}

console.log("\n=== TEST 2: Send Fraud to Sleep Pods, Cure, and Return to Reactor ===");
// Player dispatches fraud to sleep pods
fraud.currentRoom = 'sleepPods';
fraud.transitRemaining = 0;

// Simulate 10.5s in sleep pods
for (let t = 0; t < 11; t++) {
    engine.updatePersonnelConditions(1.0);
}

console.log(`Fraud cured after Sleep Pods: ${!engine.hasCondition(fraud, 'PANIC_ATTACK')} (Expected: true)`);
if (engine.hasCondition(fraud, 'PANIC_ATTACK')) throw new Error("Fraud must be cured after 10s sleep");

console.log(`Fraud panicCooldown remaining: ${fraud.panicCooldown.toFixed(1)}s (Expected ~35-45s)`);
if (!fraud.panicCooldown || fraud.panicCooldown <= 0) throw new Error("Fraud must have composure cooldown");

// Send fraud BACK to the active crisis in reactor!
fraud.currentRoom = 'reactor';
fraud.transitRemaining = 0;

// Simulate multiple ticks in the crisis room
for (let t = 0; t < 5; t++) {
    engine.evaluateConditionTriggers(1.0);
}

console.log(`Fraud re-panicked upon return: ${engine.hasCondition(fraud, 'PANIC_ATTACK')} (Expected: false - no loop!)`);
if (engine.hasCondition(fraud, 'PANIC_ATTACK')) throw new Error("Fraud must NOT instantly re-panic in an infinite loop!");

console.log("\n=== TEST 3: Live Progress Bar & Timer Countdown in Medbay ===");
// Test contagion progress bar
const contagionOfficer = {
    name: "Dr. Aris",
    station: "Medbay",
    roleTitle: "Chief Medical Officer",
    roleTier: "Core",
    trueIdentity: "CONTAGIOUS_CARRIER",
    hp: 100,
    san: 100,
    eng: 100,
    status: "ASSIGNED: MEDBAY",
    currentRoom: "medbay",
    transitRemaining: 0,
    conditions: {}
};

engine.crew.push(contagionOfficer);
const medAttendant = {
    name: "Attendant Dave",
    station: "Medbay",
    roleTitle: "Medic",
    roleTier: "Core",
    hp: 100, san: 100, eng: 100,
    status: "ASSIGNED: MEDBAY",
    currentRoom: "medbay",
    transitRemaining: 0,
    conditions: {}
};
engine.crew.push(medAttendant);
engine.addCondition(contagionOfficer, 'CONTAGIOUS_INFECTION');

const infectAlertBefore = bridge.alerts.find(a => a.id.startsWith('cond-contagious_infection'));
console.log(`Initial Medbay Cure Timer: ${infectAlertBefore.timer} (Expected: 12s)`);
if (infectAlertBefore.timer !== '12s') throw new Error("Expected 12s initial timer for doctor");

// Advance 5 seconds in Medbay
engine.updatePersonnelConditions(5.0);

const infectAlertMid = bridge.alerts.find(a => a.id.startsWith('cond-contagious_infection'));
console.log(`Mid-treatment Medbay Cure Timer: ${infectAlertMid.timer} (Expected: 7s)`);
if (infectAlertMid.timer !== '7s') throw new Error("Expected timer to count down to 7s");

// Advance another 10s -> cured and dismissed
engine.updatePersonnelConditions(10.0);

setTimeout(() => {
    const infectAlertAfter = bridge.alerts.find(a => a.id.startsWith('cond-contagious_infection'));
    console.log(`Infection alert dismissed after cure: ${infectAlertAfter === undefined} (Expected: true)`);
    if (infectAlertAfter !== undefined) throw new Error("Infection alert must dismiss after cure");

    console.log("\n=== ALL ANTI-LOOP AND ALERT POLISH TESTS PASSED! ===");
}, 250);
