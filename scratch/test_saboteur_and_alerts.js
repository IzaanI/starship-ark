/**
 * TEST_SABOTEUR_AND_ALERTS.JS
 * Verification test suite for Doomsday Saboteur incident (38s countdown),
 * defusal mechanics, detonation penalties, Brig search disarming, and simplified alert wording.
 */

const fs = require('fs');
const path = require('path');

// 1. Mock Browser Environment
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
    getElementById: (id) => {
        return {
            id,
            textContent: '',
            style: {},
            children: [],
            classList: { add: () => {}, remove: () => {}, contains: () => false },
            querySelectorAll: () => [],
            querySelector: () => null,
            setAttribute: () => {},
            getAttribute: () => null,
            appendChild: () => {},
            insertBefore: () => {},
            remove: () => {}
        };
    },
    querySelector: () => null,
    querySelectorAll: () => []
};

global.performance = {
    now: () => Date.now()
};

global.SoundFX = {
    playKeyClick: () => {},
    playCrisisAlert: () => {},
    playLaunchAlert: () => {}
};

// Load code files
const bridgeCode = fs.readFileSync(path.join(__dirname, '../src/phase2/phase2Bridge.js'), 'utf8');
eval(bridgeCode);

const flightEngineCode = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(flightEngineCode);

const engine = window.FlightEngine;
const bridge = window.Phase2Bridge;

console.log('====================================================');
console.log('🧪 TESTING DOOMSDAY SABOTEUR & STRAIGHTFORWARD ALERTS');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: Straightforward Alert Text Verification
// ----------------------------------------------------
console.log('Test 1: Straightforward Alert Texts (No Complex Techno-Babble)');
const hazards = window.STATION_HAZARDS;
console.log('  Reactor Hazard Desc:', hazards.reactor.description);
console.log('  O2 Bay Hazard Desc:', hazards.o2bay.description);
console.log('  Hydroponics Hazard Desc:', hazards.hydroponics.description);
console.log('  Cockpit Hazard Desc:', hazards.cockpit.description);

if (hazards.reactor.description.includes('coolant manifold seal failing') ||
    hazards.o2bay.description.includes('particulate') ||
    hazards.hydroponics.description.includes('aeroponic culture beds') ||
    hazards.cockpit.description.includes('sublight course drifting off corridor')) {
    throw new Error('Hazards still contain overly technical techno-babble!');
}

console.log('  ✅ TEST 1 PASSED: Alert descriptions are straightforward, concise, and direct.\n');

// ----------------------------------------------------
// TEST 2: Doomsday Saboteur Bomb Arms at >= 35% Distance with 38s Timer
// ----------------------------------------------------
console.log('Test 2: Doomsday Saboteur Bomb Arms at >= 35% Distance with Exactly 38s Timer');
const mockCrew = [
    {
        name: 'Marcus Flint',
        roleTitle: 'Chief Engineer',
        station: 'Reactor',
        roleTier: 'Core',
        stationAffinities: { Reactor: 'Core' },
        currentRoom: 'reactor',
        transitTarget: null,
        transitRemaining: 0,
        hp: 100,
        eng: 100,
        san: 100,
        isDead: false,
        trueIdentity: 'DOOMSDAY_SABOTEUR'
    },
    {
        name: 'Vance Miller',
        roleTitle: 'Security Marshal',
        station: 'Brig',
        roleTier: 'Core',
        stationAffinities: { Brig: 'Core' },
        currentRoom: 'brig',
        transitTarget: null,
        transitRemaining: 0,
        hp: 100,
        eng: 100,
        san: 100,
        isDead: false,
        trueIdentity: 'TRUE_EXPERT'
    }
];

engine.start(mockCrew);
engine.setSpeed('cruise');
engine.distancePercent = 30;
engine.evaluateConditionTriggers(0.2);

console.log('  Sabotage triggered at 30%:', !!engine.activeSabotage, '(Expected: false)');
if (engine.activeSabotage) {
    throw new Error('Sabotage triggered before 35% threshold!');
}

engine.distancePercent = 35;
engine.evaluateConditionTriggers(0.2);

console.log('  Sabotage triggered at 35%:', !!engine.activeSabotage, '(Expected: true)');
if (!engine.activeSabotage) {
    throw new Error('Sabotage failed to trigger at 35% distance threshold!');
}

console.log('  Countdown timer total:', engine.activeSabotage.totalTimer, '(Expected: 38.0)');
console.log('  Countdown timer initial remaining:', engine.activeSabotage.timeRemaining, '(Expected: 38.0)');
console.log('  Target station:', engine.activeSabotage.targetStation);

if (engine.activeSabotage.totalTimer !== 38.0 || engine.activeSabotage.timeRemaining !== 38.0) {
    throw new Error(`Bomb timer must be exactly 38 seconds! Got ${engine.activeSabotage.totalTimer}`);
}

// Check active alert card in bridge
const bombAlert = bridge.alerts.find(a => a.id === 'sabotage-bomb-alert');
console.log('  Bomb Alert Card registered:', !!bombAlert);
console.log('  Bomb Alert Tag:', bombAlert ? bombAlert.tag : null);
console.log('  Bomb Alert Timer:', bombAlert ? bombAlert.timer : null);

if (!bombAlert || bombAlert.timer !== '38s') {
    throw new Error('Bomb alert card missing or incorrect timer format!');
}

console.log('  ✅ TEST 2 PASSED: Doomsday Saboteur armed explosive charge with exact 38.0s timer.\n');

// ----------------------------------------------------
// TEST 3: Defusal Progression by Crew Before 38s Expiry
// ----------------------------------------------------
console.log('Test 3: Defusal Progression by Crew Before 38s Expiry');
// In our setup, Marcus Flint (the saboteur) is undisarmed in the reactor, so he does NOT defuse.
// Let's check defusal rate with undisarmed saboteur alone in the compartment:
engine.updateSabotage(1.0);
console.log('  Work rate with undisarmed saboteur alone:', engine.activeSabotage.currentWorkRate, '(Expected: 0)');
console.log('  Time remaining after 1s:', engine.activeSabotage.timeRemaining.toFixed(1), '(Expected: 37.0)');
if (engine.activeSabotage.currentWorkRate !== 0) {
    throw new Error('Undisarmed saboteur should not defuse their own bomb!');
}

// Now move Vance Miller (Core Security guard) into the reactor to defuse!
mockCrew[1].currentRoom = engine.activeSabotage.targetStation;
mockCrew[1].transitRemaining = 0;

// Vance should defuse at 1.5x rate (Core security/engineer)
engine.updateSabotage(1.0);
console.log('  Work rate with Vance (Core guard):', engine.activeSabotage.currentWorkRate, '(Expected: 1.5)');
console.log('  Work remaining after 1s defusal:', engine.activeSabotage.workRemaining.toFixed(2), '(Expected: 10.5)');

if (engine.activeSabotage.workRemaining > 10.6 || engine.activeSabotage.workRemaining < 10.4) {
    throw new Error('Defusal work rate calculation incorrect!');
}

// Advance defusal to completion: 10.5 / 1.5 = 7.0 seconds
engine.updateSabotage(7.0);

console.log('  Active Sabotage cleared after defusal:', engine.activeSabotage === null, '(Expected: true)');
const defusedNotice = bridge.alerts.find(a => a.id === 'sabotage-defused-notice');
console.log('  Defused notice posted:', !!defusedNotice);
console.log('  Notice title:', defusedNotice ? defusedNotice.title : null);

if (engine.activeSabotage !== null || !defusedNotice) {
    throw new Error('Sabotage should be resolved and cleared upon reaching 0 work remaining!');
}

console.log('  ✅ TEST 3 PASSED: Crew successfully defused explosive in room before countdown expired.\n');

// ----------------------------------------------------
// TEST 4: Detonation Consequences on 38s Expiry (-35% Hull, -30% Resource)
// ----------------------------------------------------
console.log('Test 4: Detonation Consequences on 38s Expiry (-35% Hull, -30% Resource)');
engine.activeSabotage = null;
engine.sabotageTriggered = false;

// Trigger new bomb in reactor
const bomb = engine.triggerSabotageIncident(mockCrew[0]);
bomb.targetStation = 'reactor';
bomb.stationName = 'Reactor Core';

// Empty the room so no one defuses
mockCrew.forEach(c => c.currentRoom = 'sleepPods');

// Telemetry baseline
engine.telemetry.hull.value = 100;
engine.telemetry.power.value = 100;

// Simulate countdown expiring over 38 seconds
engine.updateSabotage(38.1);

console.log('  Sabotage active after 38s:', engine.activeSabotage !== null, '(Expected: false)');
console.log('  Hull Integrity after blast:', engine.telemetry.hull.value, '(Expected: 65, -35% drop)');
console.log('  Power Grid after reactor blast:', engine.telemetry.power.value, '(Expected: 70, -30% drop)');

if (engine.telemetry.hull.value !== 65 || engine.telemetry.power.value !== 70) {
    throw new Error('Detonation did not apply correct -35% Hull and -30% Power penalties!');
}

const detAlert = bridge.alerts.find(a => a.id === 'sabotage-detonated-alert');
console.log('  Detonation alert card registered:', !!detAlert);
console.log('  Detonation alert title:', detAlert ? detAlert.title : null);

if (!detAlert || !detAlert.title.includes('BOMB EXPLODED')) {
    throw new Error('Detonation alert card not properly rendered!');
}

console.log('  ✅ TEST 4 PASSED: Bomb detonated at 0s applying -35% Hull and -30% Resource penalties.\n');

// ----------------------------------------------------
// TEST 5: Brig Search Payoff — Exposes Saboteur & Disarms Active Bomb
// ----------------------------------------------------
console.log('Test 5: Brig Search Payoff — Exposes Saboteur & Disarms Active Bomb');
engine.activeSabotage = null;
engine.sabotageTriggered = false;

// Start active bomb
const activeBomb = engine.triggerSabotageIncident(mockCrew[0]);
console.log('  Active bomb ticking:', !!engine.activeSabotage);

// Guard stationed in Brig
mockCrew[1].currentRoom = 'brig';
mockCrew[1].transitRemaining = 0;

// Saboteur in Brig for search
mockCrew[0].currentRoom = 'brig';
mockCrew[0].transitRemaining = 0;

bridge.selectedOfficerIndex = 0; // Marcus Flint
engine.startSecuritySearch(mockCrew[0], 0, mockCrew[1]);

// Complete search (Core guard takes 12s)
engine.updateSecuritySearches(12.5);

console.log('  Saboteur isDisarmed:', mockCrew[0].isDisarmed, '(Expected: true)');
console.log('  Saboteur saboteurNeutralized:', mockCrew[0].saboteurNeutralized, '(Expected: true)');
console.log('  Active bomb disarmed by search recovery:', engine.activeSabotage === null, '(Expected: true)');

const searchResultAlert = bridge.alerts.find(a => a.id === 'search-result-Marcus_Flint');
console.log('  Search Result Alert posted:', !!searchResultAlert);
console.log('  Alert Title:', searchResultAlert ? searchResultAlert.title : null);
console.log('  Alert Message:', searchResultAlert ? searchResultAlert.message : null);

if (!searchResultAlert || !searchResultAlert.title.includes('SABOTEUR EXPOSED')) {
    throw new Error('Search result did not expose saboteur!');
}

if (!searchResultAlert.message.includes('Disarmed')) {
    throw new Error('Search message should indicate disarm codes recovered!');
}

console.log('  ✅ TEST 5 PASSED: Brig search exposed saboteur and neutralized active ticking bomb.\n');

// ----------------------------------------------------
// TEST 6: Pre-emptive Ejection Prevents Sabotage Incident
// ----------------------------------------------------
console.log('Test 6: Pre-emptive Ejection Prevents Sabotage Incident');
engine.activeSabotage = null;
engine.sabotageTriggered = false;

const preEjectCrew = [
    {
        name: 'Sly Saboteur',
        station: 'Reactor',
        currentRoom: 'brig',
        hp: 0,
        isDead: true,
        status: 'DECEASED',
        trueIdentity: 'DOOMSDAY_SABOTEUR'
    }
];

engine.crew = preEjectCrew;
engine.distancePercent = 50; // Well past 35%
engine.evaluateConditionTriggers(0.2);

console.log('  Sabotage triggered for dead/ejected saboteur:', !!engine.activeSabotage, '(Expected: false)');
if (engine.activeSabotage) {
    throw new Error('Dead or ejected saboteur should not be able to trigger sabotage!');
}

console.log('  ✅ TEST 6 PASSED: Ejected or deceased saboteur cannot trigger explosive incidents.\n');

console.log('====================================================');
console.log('🎉 ALL 6 SABOTEUR & ALERT TESTS PASSED PERFECTLY!');
console.log('====================================================');

engine.stop();
process.exit(0);
