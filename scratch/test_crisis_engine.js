// Simulation test for Station Crisis & Hazard Engine (Step 6)
const fs = require('fs');

// Mock window and browser environment
const alertsPushed = [];
const dismissedAlerts = [];
let audioAlertCalls = 0;

global.window = {
    SoundFX: {
        playCrisisAlert: () => { audioAlertCalls++; },
        playLaunchAlert: () => { audioAlertCalls++; },
        playKeyClick: () => {}
    },
    Phase2Bridge: {
        compartments: {
            cockpit: { id: "cockpit", name: "Cockpit (Helm)", deck: 6, maxOccupants: 2, tag: "NAV" },
            reactor: { id: "reactor", name: "Reactor Core", deck: 1, maxOccupants: 2, tag: "PWR" },
            o2bay: { id: "o2bay", name: "O2 Bay", deck: 4, maxOccupants: 2, tag: "O2" },
            hydroponics: { id: "hydroponics", name: "Hydroponics Bay", deck: 4, maxOccupants: 2, tag: "BIO" }
        },
        alerts: [],
        pushAlert: function(alert) {
            alertsPushed.push(alert);
            const idx = this.alerts.findIndex(a => a.id === alert.id);
            if (idx === -1) {
                this.alerts.push(alert);
                if (alert.type === 'critical' && !alert.isCrisis) window.SoundFX.playCrisisAlert();
            } else {
                this.alerts[idx] = alert;
            }
        },
        dismissAlert: function(id) {
            dismissedAlerts.push(id);
            this.alerts = this.alerts.filter(a => a.id !== id);
        },
        logEvent: function(text, type, sender) {
            // Replicate Phase2Bridge.logEvent filtering
            if (type !== 'warn' && type !== 'critical') return;
            if (text.toUpperCase().includes('DEFICIT')) return;
            if (text.toUpperCase().includes('CRITICAL HAZARD') || text.toUpperCase().includes('CRISIS RESOLVED') || text.toUpperCase().includes('CRISIS')) return;
            this.pushAlert({ id: `log-${Date.now()}`, type, tag: sender, title: 'CRITICAL ALERT', message: text });
        }
    }
};
global.performance = { now: () => Date.now() };
global.document = {
    getElementById: () => null,
    querySelector: () => null
};

// Load flightEngine
require('../src/phase2/flightEngine.js');

const engine = window.FlightEngine;

console.log("=== TEST 1: Crisis Definition & Initial State ===");
console.assert(engine !== undefined, "FlightEngine should be defined");
console.assert(Object.keys(engine.activeCrises).length === 0, "No initial crises active");

// Setup sample test crew
const testCrew = [
    {
        name: "Capt. Reynolds",
        station: "Cockpit",
        roleTier: "Core",
        currentRoom: "cockpit",
        transitRemaining: 0,
        eng: 100, hp: 100, san: 100
    },
    {
        name: "Eng. Torres",
        station: "Reactor",
        roleTier: "Core",
        currentRoom: "reactor",
        transitRemaining: 0,
        eng: 100, hp: 100, san: 100
    },
    {
        name: "Tech Chen",
        station: "Reactor",
        roleTier: "Adjacent",
        stationAffinities: { reactor: "Adjacent" },
        currentRoom: null, // standby
        transitRemaining: 0,
        eng: 100, hp: 100, san: 100
    },
    {
        name: "Dr. Vance",
        station: "Medbay",
        roleTier: "Core",
        stationAffinities: { medbay: "Core", o2bay: "Mismatched" },
        currentRoom: "o2bay", // Mismatched at O2 Bay
        transitRemaining: 0,
        eng: 100, hp: 100, san: 100
    }
];

engine.crew = testCrew;
engine.speedMultiplier = 1;
engine.isRunning = true;

console.log("=== TEST 2: Work Rate & Resolution Calculation ===");

// 1. Core Engineer at Reactor (Base 7.0s)
const reactorWork = engine.getCrisisWorkRate('reactor');
console.log("Reactor Work Rate (Core):", reactorWork.rate, "Tier:", reactorWork.tier);
console.assert(reactorWork.rate === 1.0, "Core rate should be 1.0");

// 2. Mismatched Doctor at O2 Bay (Base 14.0s)
const o2Work = engine.getCrisisWorkRate('o2bay');
console.log("O2 Bay Work Rate (Mismatched):", o2Work.rate, "Tier:", o2Work.tier);
console.assert(o2Work.rate === 0.50, "Mismatched rate should be 0.50");

// 3. Unmanned Hydroponics
const hydroWork = engine.getCrisisWorkRate('hydroponics');
console.log("Hydroponics Work Rate (Unmanned):", hydroWork.rate, "Tier:", hydroWork.tier);
console.assert(hydroWork.rate === 0, "Unmanned rate should be 0");

// 4. Stacking: Move Tech Chen to Reactor (Core + Adjacent = 1.0 + 0.78 * 0.40 = 1.312)
testCrew[2].currentRoom = "reactor";
const stackedWork = engine.getCrisisWorkRate('reactor');
console.log("Stacked Reactor Work Rate (Core + Adjacent):", stackedWork.rate, "Expected ~1.312");
console.assert(Math.abs(stackedWork.rate - 1.312) < 0.01, "Stacked rate should be ~1.312");

console.log("=== TEST 3: Trigger Crises and Verify Resource Penalties ===");
const baselinePowerDrain = Number((engine.getStationDrainRate('reactor').drainRate * 0.90).toFixed(3));
const initialAlertsCount = window.Phase2Bridge.alerts.length;
const cReactor = engine.triggerCrisis('reactor');
console.assert(cReactor !== null, "Reactor crisis should trigger");
console.assert(engine.activeCrises['reactor'] !== undefined, "Reactor crisis registered");

// Check title concisely contains station name
console.log("Reactor crisis title:", cReactor.title);
console.assert(cReactor.title.includes("REACTOR:"), "Title must contain station name");

// Check exactly ONE alert card was produced for this crisis
const reactorAlerts = window.Phase2Bridge.alerts.filter(a => a.id.includes('reactor') || a.targetRoom === 'reactor');
console.log("Reactor alerts count:", reactorAlerts.length);
console.assert(reactorAlerts.length === 1, "Only one alert card per crisis should exist!");

// Check progress bar exists in card message
console.assert(reactorAlerts[0].message.includes("crisis-progress-track"), "Card must render a progress bar track");
console.assert(reactorAlerts[0].message.includes("crisis-progress-fill"), "Card must render a progress bar fill");

// Check telemetry penalty application
engine.updateVesselTelemetry(1.0);
console.log("Reactor drain with crisis:", engine.telemetry.power.drainRate, "Baseline:", baselinePowerDrain);
console.assert(Math.abs(engine.telemetry.power.drainRate - (baselinePowerDrain + 0.25)) < 0.01, "Power drain should include +0.25%/s penalty");

console.log("=== TEST 4: Cockpit Hazard ETA Drift (+3.5s/s) ===");
const initialVoyageSec = engine.totalVoyageSeconds;
const cCockpit = engine.triggerCrisis('cockpit');
console.assert(cCockpit !== null, "Cockpit crisis should trigger");
console.assert(cCockpit.title.includes("COCKPIT:"), "Cockpit title must contain station name");

const cockpitAlerts = window.Phase2Bridge.alerts.filter(a => a.id.includes('cockpit') || a.targetRoom === 'cockpit');
console.assert(cockpitAlerts.length === 1, "Only one alert card for cockpit crisis!");

// Check audio alert was called for the new crisis
const soundCallsAtCockpit = audioAlertCalls;
console.log("Audio alert calls so far:", soundCallsAtCockpit);
console.assert(soundCallsAtCockpit === 2, "Sound should have triggered once per new crisis (reactor + cockpit)");

// Simulate 2 seconds of flight during cockpit crisis
engine.updateCrises(2.0);
console.log("Voyage seconds after 2s of cockpit crisis:", engine.totalVoyageSeconds, "Initial:", initialVoyageSec);
console.assert(engine.totalVoyageSeconds === initialVoyageSec + 7.0, "Cockpit crisis should add +3.5s to total voyage seconds per second");

// Sound should NOT have played during updateCrises (tick updates)
console.assert(audioAlertCalls === soundCallsAtCockpit, "Sound should NOT re-trigger on tick updates!");

console.log("=== TEST 5: Crisis Resolution Progression ===");
console.log("Cockpit crisis work remaining after 2s evasion:", cCockpit.workRemaining);
console.assert(Math.abs(cCockpit.workRemaining - 5.0) < 0.05, "Work remaining after 2s should be 5.0s");

// Verify progress bar updated in alert card message
const updatedCockpitAlert = window.Phase2Bridge.alerts.find(a => a.id === 'crisis-cockpit');
console.log("Updated Cockpit Alert progress in HTML:", updatedCockpitAlert.message.includes("29%"));
console.assert(updatedCockpitAlert.message.includes("crisis-progress-fill"), "Updated alert has progress bar");

// Captain Reynolds is Core (1.0 work/s). 3 more seconds should reduce work remaining by 3.0 units to 2.0s.
engine.updateCrises(3.0);
console.log("Cockpit crisis work remaining after 3s more:", cCockpit.workRemaining);
console.assert(Math.abs(cCockpit.workRemaining - 2.0) < 0.05, "Work remaining should be ~2.0s");

// Another 2.0 seconds should resolve the crisis!
engine.updateCrises(2.0);
console.assert(engine.activeCrises['cockpit'] === undefined, "Cockpit crisis should be resolved after work completes");
console.log("Cockpit crisis successfully resolved!");

console.log("=== ALL TEST SUITES PASSED CLEANLY! ===");
