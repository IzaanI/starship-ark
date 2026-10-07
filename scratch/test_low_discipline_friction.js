/**
 * TEST SUITE: TRACK D - LOW DISCIPLINE INTERPERSONAL CREW FRICTION
 * Tests:
 * 1. Discipline Threshold Guard: Never triggers above 85% discipline
 * 2. Director Scaling: Scales progress from rare at 80% to rapid at <35%
 * 3. Strict Exclusion: Excludes crew in crisis, in crisis compartments, or recovering (crisisCooldown > 0)
 * 4. Heated Argument: Station efficiency drops to 0%, resolves cleanly on separation
 * 5. Physical Brawl: Initial -10 HP hit, ongoing -0.2 HP/s drain, resolves on separation or guard intervention
 * 6. Paranoid Accusation: Ridiculous claim, 80% accuser efficiency penalty, resolves on Brig/Pods/audit/separation
 * 7. Anti-stacking: Only 1 active friction event, zero friction during active bomb
 * 8. Fatal casualty during brawl cleans up incident cleanly
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Setup mock browser environment
global.window = global;
global.Image = class { constructor() {} };

let lastPushedAlert = null;
let dismissedAlertId = null;

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

// Spy on pushAlert and dismissAlert
const origPushAlert = window.Phase2Bridge.pushAlert.bind(window.Phase2Bridge);
window.Phase2Bridge.pushAlert = function(data) {
    lastPushedAlert = data;
    return origPushAlert(data);
};

const origDismissAlert = window.Phase2Bridge.dismissAlert.bind(window.Phase2Bridge);
window.Phase2Bridge.dismissAlert = function(id, manual) {
    dismissedAlertId = id;
    return origDismissAlert(id, manual);
};

console.log("====================================================");
console.log("🧪 TESTING TRACK D: LOW DISCIPLINE CREW FRICTION");
console.log("====================================================");

const engine = window.FlightEngine;
engine.speedMultiplier = 1.0;

function resetCrew() {
    engine.crew = [
        {
            name: "Elena Rostova",
            roleTitle: "Lead Reactor Engineer",
            station: "Reactor",
            currentRoom: "reactor",
            transitRemaining: 0,
            hp: 100,
            eng: 100,
            isDead: false,
            status: "ASSIGNED: REACTOR",
            stationAffinities: { reactor: "Core" },
            conditions: {},
            weight: 180
        },
        {
            name: "Marcus Vance",
            roleTitle: "Senior Systems Specialist",
            station: "Reactor",
            currentRoom: "reactor",
            transitRemaining: 0,
            hp: 100,
            eng: 100,
            isDead: false,
            status: "ASSIGNED: REACTOR",
            stationAffinities: { reactor: "Core" },
            conditions: {},
            weight: 185
        },
        {
            name: "Jax Briggs",
            roleTitle: "Chief Security Officer",
            station: "Brig",
            currentRoom: "brig",
            transitRemaining: 0,
            hp: 100,
            eng: 100,
            isDead: false,
            status: "ASSIGNED: THE BRIG",
            stationAffinities: { brig: "Core" },
            conditions: {},
            weight: 195
        },
        {
            name: "Dr. Catherine Hayes",
            roleTitle: "Chief Medical Officer",
            station: "Medbay",
            currentRoom: "medbay",
            transitRemaining: 0,
            hp: 100,
            eng: 100,
            isDead: false,
            status: "ASSIGNED: MEDBAY",
            stationAffinities: { medbay: "Core" },
            conditions: {},
            weight: 160
        }
    ];
    engine.activeCrises = {};
    engine.activeSabotage = null;
    engine.activeCrewFriction = null;
    engine.activeTrackCIncident = null;
    engine.telemetry.discipline.value = 100;
    lastPushedAlert = null;
    dismissedAlertId = null;
}

// -------------------------------------------------------------
// TEST 1: Strict Discipline Cutoff (>85% Discipline)
// -------------------------------------------------------------
console.log("\nTest 1: Discipline Cutoff Rule (>85% Discipline)");
resetCrew();
engine.telemetry.discipline.value = 100;
engine.frictionDirectorTimer = 1.0;
engine.updateDisciplineFrictionDirector(1.0);
assert.strictEqual(engine.activeCrewFriction, null, "Friction must never trigger at 100% discipline");
assert.strictEqual(engine.frictionDirectorTimer, 1.0, "Timer must not advance at 100% discipline");

engine.telemetry.discipline.value = 86;
engine.updateDisciplineFrictionDirector(1.0);
assert.strictEqual(engine.activeCrewFriction, null, "Friction must never trigger at 86% discipline");

const directTriggerAbove85 = engine.triggerCrewFrictionEvent();
assert.strictEqual(directTriggerAbove85, null, "triggerCrewFrictionEvent() must return null when discipline > 85%");
console.log("  ✅ TEST 1 PASSED: Low discipline friction strictly forbidden above 85% discipline.");

// -------------------------------------------------------------
// TEST 2: Director Scaling Rate Below 85%
// -------------------------------------------------------------
console.log("\nTest 2: Scaling Director Rate (80% vs 50% vs 25%)");
resetCrew();

// At 80% discipline (deficit = 5, very rare)
engine.telemetry.discipline.value = 80;
engine.frictionDirectorTimer = 50.0;
engine.updateDisciplineFrictionDirector(10.0);
const timerAt80 = 50.0 - engine.frictionDirectorTimer;
console.log(`  Progress after 10s at 80% discipline: ${timerAt80.toFixed(2)}s (Rate mult: ${(timerAt80/10).toFixed(2)}x)`);

// At 50% discipline (deficit = 35, tense)
engine.telemetry.discipline.value = 50;
engine.frictionDirectorTimer = 50.0;
engine.updateDisciplineFrictionDirector(10.0);
const timerAt50 = 50.0 - engine.frictionDirectorTimer;
console.log(`  Progress after 10s at 50% discipline: ${timerAt50.toFixed(2)}s (Rate mult: ${(timerAt50/10).toFixed(2)}x)`);

// At 25% discipline (deficit = 60, mutinous panic)
engine.telemetry.discipline.value = 25;
engine.frictionDirectorTimer = 50.0;
engine.updateDisciplineFrictionDirector(10.0);
const timerAt25 = 50.0 - engine.frictionDirectorTimer;
console.log(`  Progress after 10s at 25% discipline: ${timerAt25.toFixed(2)}s (Rate mult: ${(timerAt25/10).toFixed(2)}x)`);

assert.ok(timerAt50 > timerAt80 * 2, "Timer must progress significantly faster at 50% than 80%");
assert.ok(timerAt25 > timerAt50, "Timer must progress even faster at 25% mutinous panic");
console.log("  ✅ TEST 2 PASSED: Director progression scales proportionally with discipline deficit.");

// -------------------------------------------------------------
// TEST 3: Exclusion of Officers in Crisis or Just Recovering
// -------------------------------------------------------------
console.log("\nTest 3: Exclusion of Officers in Crisis or Just Returning");
resetCrew();
engine.telemetry.discipline.value = 60; // Well below 85%

// Case A: Officer in active crisis (PANIC_ATTACK)
engine.addCondition(engine.crew[0], 'PANIC_ATTACK', 'Test panic');
let eligible = engine.getFrictionEligibleOfficers();
assert.ok(!eligible.includes(engine.crew[0]), "Officer with active condition must be excluded from friction");

// Case B: Officer in room with active station hazard
engine.removeCondition(engine.crew[0], 'PANIC_ATTACK', true);
engine.activeCrises['reactor'] = { stationId: 'reactor', title: 'Coolant Leak' };
eligible = engine.getFrictionEligibleOfficers();
assert.ok(!eligible.includes(engine.crew[0]), "Officer in crisis room must be excluded");
assert.ok(!eligible.includes(engine.crew[1]), "Second officer in crisis room must also be excluded");
delete engine.activeCrises['reactor'];

// Case C: Officer just returning from crisis (crisisCooldown > 0 and panicCooldown > 0)
assert.strictEqual(engine.crew[0].crisisCooldown, 30.0, "removeCondition set 30s crisisCooldown");
eligible = engine.getFrictionEligibleOfficers();
assert.ok(!eligible.includes(engine.crew[0]), "Officer recovering with crisisCooldown > 0 must be excluded");

// Cooldown ticks down in vitals
engine.updateCrewVitals(10.0);
assert.strictEqual(engine.crew[0].crisisCooldown, 20.0, "crisisCooldown must decrement by dt");
engine.updateCrewVitals(21.0);
assert.strictEqual(engine.crew[0].crisisCooldown, 0, "crisisCooldown reaches 0 after elapsed time");
// Also wait for remaining panicCooldown to expire (45s total - 31s elapsed = 14s remaining)
engine.updateCrewVitals(15.0);
assert.strictEqual(engine.crew[0].panicCooldown, 0, "panicCooldown reaches 0");
eligible = engine.getFrictionEligibleOfficers();
assert.ok(eligible.includes(engine.crew[0]), "Officer is eligible once cooldowns expire");

console.log("  ✅ TEST 3 PASSED: Active crisis, crisis room, and recovering crew members are strictly excluded.");

// -------------------------------------------------------------
// TEST 4: Heated Argument Incident (Station Halts, Resolves on Separation)
// -------------------------------------------------------------
console.log("\nTest 4: Heated Argument Incident & Resolution");
resetCrew();
engine.telemetry.discipline.value = 60;

// Trigger Heated Argument between Elena and Marcus in Reactor
const argIncident = engine.triggerCrewFrictionEvent('HEATED_ARGUMENT', engine.crew[0], engine.crew[1]);
assert.ok(argIncident, "Argument incident created");
assert.strictEqual(argIncident.type, 'HEATED_ARGUMENT');
assert.strictEqual(engine.activeCrewFriction, argIncident);

// Efficiency check: Both officers in argument have 0.0 efficiency
const elenaEff = engine.getOfficerStationEfficiency(engine.crew[0], 'reactor');
const marcusEff = engine.getOfficerStationEfficiency(engine.crew[1], 'reactor');
console.log(`  Elena efficiency during argument: ${elenaEff} (Expected: 0.0)`);
console.log(`  Marcus efficiency during argument: ${marcusEff} (Expected: 0.0)`);
assert.strictEqual(elenaEff, 0.0, "Officer A efficiency must be 0% during argument");
assert.strictEqual(marcusEff, 0.0, "Officer B efficiency must be 0% during argument");

// Check alert card
assert.ok(lastPushedAlert, "Alert card must be pushed");
assert.strictEqual(lastPushedAlert.id, 'crew-friction-alert');
assert.strictEqual(lastPushedAlert.type, 'warning');

// Resolution by Separation: Marcus is reassigned/moves out of Reactor
engine.crew[1].currentRoom = 'workshop';
engine.updateActiveCrewFriction(0.2);

assert.strictEqual(engine.activeCrewFriction, null, "Incident must resolve immediately upon separation");
assert.strictEqual(dismissedAlertId, 'crew-friction-alert', "Alert card must be dismissed");
assert.strictEqual(engine.crew[0].frictionCooldown, 30.0, "Elena receives 30s friction cooldown");
assert.strictEqual(engine.crew[1].frictionCooldown, 30.0, "Marcus receives 30s friction cooldown");

// Efficiencies restored
const elenaRestoredEff = engine.getOfficerStationEfficiency(engine.crew[0], 'reactor');
console.log(`  Elena efficiency after separation: ${elenaRestoredEff} (Expected: 1.0)`);
assert.strictEqual(elenaRestoredEff, 1.0, "Officer efficiency must be fully restored upon separation");
console.log("  ✅ TEST 4 PASSED: Heated Argument halts station work and resolves cleanly upon separation.");

// -------------------------------------------------------------
// TEST 5: Physical Brawl Incident (Damage & Guard Intervention)
// -------------------------------------------------------------
console.log("\nTest 5: Physical Brawl Incident & Guard Intervention");
resetCrew();
engine.telemetry.discipline.value = 50;

// Elena and Marcus are at 100 HP
assert.strictEqual(engine.crew[0].hp, 100);
assert.strictEqual(engine.crew[1].hp, 100);

const brawlIncident = engine.triggerCrewFrictionEvent('PHYSICAL_BRAWL', engine.crew[0], engine.crew[1]);
assert.ok(brawlIncident, "Brawl incident created");
assert.strictEqual(brawlIncident.type, 'PHYSICAL_BRAWL');

// Immediate -10 HP strike
console.log(`  Elena HP after initial strike: ${engine.crew[0].hp} (Expected: 90)`);
console.log(`  Marcus HP after initial strike: ${engine.crew[1].hp} (Expected: 90)`);
assert.strictEqual(engine.crew[0].hp, 90, "Officer A must take initial -10 HP hit");
assert.strictEqual(engine.crew[1].hp, 90, "Officer B must take initial -10 HP hit");

// Continuous damage over 5 seconds at -0.2 HP/s -> -1.0 HP
for (let i = 0; i < 5; i++) {
    engine.updateActiveCrewFriction(1.0);
}
console.log(`  Elena HP after 5s brawl: ${engine.crew[0].hp.toFixed(1)} (Expected: 89.0)`);
assert.strictEqual(engine.crew[0].hp.toFixed(1), "89.0", "Combatants must lose -0.2 HP/s while brawling");

// Resolution by Security Guard: Jax (Core security officer) enters the Reactor
engine.crew[2].currentRoom = 'reactor'; // Jax enters room
engine.updateActiveCrewFriction(0.2);

assert.strictEqual(engine.activeCrewFriction, null, "Brawl must resolve when security guard intervenes");
console.log("  ✅ TEST 5 PASSED: Physical Brawl causes immediate & continuous damage, quelled by security.");

// -------------------------------------------------------------
// TEST 6: Paranoid Accusation Incident
// -------------------------------------------------------------
console.log("\nTest 6: Paranoid Accusation Incident");
resetCrew();
engine.telemetry.discipline.value = 40;

const accIncident = engine.triggerCrewFrictionEvent('PARANOID_ACCUSATION', engine.crew[0], engine.crew[1]);
assert.ok(accIncident, "Accusation incident created");
assert.strictEqual(accIncident.type, 'PARANOID_ACCUSATION');
assert.ok(accIncident.claim, `Claim generated: ${accIncident.claim}`);

// Accuser (Elena) station efficiency is reduced to 20%
const accuserEff = engine.getOfficerStationEfficiency(engine.crew[0], 'reactor');
console.log(`  Accuser efficiency during outburst: ${accuserEff.toFixed(2)} (Expected: 0.20)`);
assert.strictEqual(accuserEff.toFixed(2), "0.20", "Accuser efficiency must drop to 20%");

// Accused (Marcus) retains full efficiency
const accusedEff = engine.getOfficerStationEfficiency(engine.crew[1], 'reactor');
assert.strictEqual(accusedEff, 1.0, "Accused officer efficiency must remain unaffected");

// Resolution: Accuser is sent to The Brig
engine.crew[0].currentRoom = 'brig';
engine.updateActiveCrewFriction(0.2);

assert.strictEqual(engine.activeCrewFriction, null, "Accusation must resolve when accuser is sent to Brig");
console.log("  ✅ TEST 6 PASSED: Paranoid Accusation applies 80% insubordination penalty and resolves via Brig.");

// -------------------------------------------------------------
// TEST 7: Anti-Stacking Rules
// -------------------------------------------------------------
console.log("\nTest 7: Strict Anti-Stacking & Bomb Protection");
resetCrew();
engine.telemetry.discipline.value = 40;

// Active friction prevents 2nd friction
engine.triggerCrewFrictionEvent('HEATED_ARGUMENT', engine.crew[0], engine.crew[1]);
assert.ok(engine.activeCrewFriction);
const secondFriction = engine.triggerCrewFrictionEvent('PHYSICAL_BRAWL', engine.crew[2], engine.crew[3]);
assert.strictEqual(secondFriction, null, "Cannot start 2nd friction incident while one is active");
engine.resolveCrewFriction('Test cleanup');

// Active bomb prevents friction
engine.triggerSabotageIncident(engine.crew[0]);
assert.ok(engine.activeSabotage);
const frictionDuringBomb = engine.triggerCrewFrictionEvent();
assert.strictEqual(frictionDuringBomb, null, "Cannot start friction incident while bomb is ticking");
engine.resolveSabotage(true, 'Test defuse');

console.log("  ✅ TEST 7 PASSED: Anti-stacking and active bomb protection verified.");

// -------------------------------------------------------------
// TEST 8: Zero Emojis Check
// -------------------------------------------------------------
console.log("\nTest 8: Zero Emojis Check across comms and titles");
resetCrew();
const allComms = [];
const origLogComms = engine.logComms.bind(engine);
engine.logComms = (msg, type, tag) => {
    allComms.push(msg);
    origLogComms(msg, type, tag);
};

engine.telemetry.discipline.value = 60;
engine.triggerCrewFrictionEvent('HEATED_ARGUMENT', engine.crew[0], engine.crew[1]);
engine.resolveCrewFriction('Test');
engine.triggerCrewFrictionEvent('PHYSICAL_BRAWL', engine.crew[0], engine.crew[1]);
engine.resolveCrewFriction('Test');
engine.triggerCrewFrictionEvent('PARANOID_ACCUSATION', engine.crew[0], engine.crew[1]);
engine.resolveCrewFriction('Test');

const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const foundEmoji = allComms.some(c => emojiRegex.test(c));
assert.strictEqual(foundEmoji, false, "Comms logs must contain zero emojis");
console.log("  ✅ TEST 8 PASSED: Zero emojis verified across all event logs.");

console.log("\n====================================================");
console.log("🎉 ALL 8 TRACK D CREW FRICTION TESTS PASSED!");
console.log("====================================================");
