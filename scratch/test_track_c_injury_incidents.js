/**
 * TEST_TRACK_C_INJURY_INCIDENTS.JS
 * Verification test suite for Track C Day-to-Day incidents:
 * - Workplace injury: falls, twists, sprains with array of body parts
 * - Exact description: "While working in the {station}, {crewmate name} tripped and injured their {body part}."
 * - Efficiency penalty (-50%) and health drain (-0.35/s) until Medbay treatment with attendant
 * - Strict anti-stacking rules (no multi-condition stacking, no concurrent Track C incidents)
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
const bridge = window.Phase2Bridge;

console.log('====================================================');
console.log('🧪 TESTING TRACK C: WORKPLACE INJURIES & ANTI-STACKING');
console.log('====================================================\n');

const mockCrew = [
    {
        name: 'Elena Rostova',
        roleTitle: 'Lead Fusion Specialist',
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
        trueIdentity: 'TRUE_EXPERT'
    },
    {
        name: 'Tariq Vance',
        roleTitle: 'Flight Medic',
        station: 'Medbay',
        roleTier: 'Core',
        stationAffinities: { Medbay: 'Core' },
        currentRoom: 'medbay',
        transitTarget: null,
        transitRemaining: 0,
        hp: 100,
        eng: 100,
        san: 100,
        isDead: false,
        trueIdentity: 'TRUE_EXPERT'
    },
    {
        name: 'Viktor Kane',
        roleTitle: 'Chief Navigator',
        station: 'Cockpit',
        roleTier: 'Core',
        stationAffinities: { Cockpit: 'Core' },
        currentRoom: 'cockpit',
        transitTarget: null,
        transitRemaining: 0,
        hp: 100,
        eng: 100,
        san: 100,
        isDead: false,
        trueIdentity: 'DESPERATE_FRAUD'
    },
    {
        name: 'Marcus Flint',
        roleTitle: 'Security Guard',
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
        trueIdentity: 'DOOMSDAY_SABOTEUR'
    }
];

engine.start(mockCrew);
engine.setSpeed('cruise');

// ----------------------------------------------------
// TEST 1: Trigger Workplace Injury & Description Format
// ----------------------------------------------------
console.log('Test 1: Workplace Injury Event Format & Description');
const incident = engine.triggerWorkplaceInjury(mockCrew[0], 'wrist');
console.log('  Incident created:', !!incident);
console.log('  Officer Name:', incident.officerName);
console.log('  Body Part:', incident.bodyPart);
console.log('  Station Name:', incident.stationName);

const injuryCond = mockCrew[0].conditions['PHYSICAL_INJURY'];
console.log('  Officer has PHYSICAL_INJURY condition:', !!injuryCond);
console.log('  Condition reason:', injuryCond.reason);

const expectedPhrase = `While working in the Reactor Core, Elena Rostova tripped and injured their wrist.`;
if (!injuryCond.reason.includes('tripped and injured their wrist') || !injuryCond.reason.includes('Reactor Core')) {
    throw new Error(`Incident reason does not match expected format! Got: ${injuryCond.reason}`);
}

const injuryAlert = bridge.alerts.find(a => a.id === 'cond-physical_injury-Elena_Rostova');
console.log('  Alert card generated:', !!injuryAlert);
console.log('  Alert card title:', injuryAlert.title);
console.log('  Alert message includes expected description:', injuryAlert.message.includes('tripped and injured their wrist'));

if (!injuryAlert || !injuryAlert.message.includes('tripped and injured their wrist')) {
    throw new Error('Alert card missing or does not contain required injury description!');
}

console.log('  ✅ TEST 1 PASSED: Workplace injury event description matches specification perfectly.\n');

// ----------------------------------------------------
// TEST 2: Efficiency Penalty (-50%) & Health Drain (-0.35/s)
// ----------------------------------------------------
console.log('Test 2: Efficiency Penalty (-50%) & Health Drain (-0.35/s)');
const baselineEff = 1.00; // Core engineer
const injuredEff = engine.getOfficerStationEfficiency(mockCrew[0], 'reactor');
console.log('  Injured Efficiency:', injuredEff, '(Expected: 0.50, halved from 1.00)');

if (injuredEff !== 0.50) {
    throw new Error(`Injured efficiency not properly penalized! Expected 0.50, got ${injuredEff}`);
}

// Crisis work rate penalty
const workInfo = engine.getCrisisWorkRate('reactor');
console.log('  Injured Crisis Work Rate:', workInfo.rate, '(Expected: 0.50)');
if (workInfo.rate !== 0.50) {
    throw new Error(`Crisis repair rate should be 0.50 for injured Core officer! Got ${workInfo.rate}`);
}

// Health drain over 4 seconds
const startHp = mockCrew[0].hp;
engine.updatePersonnelConditions(4.0);
const expectedHp = startHp - (0.35 * 4.0); // 100 - 1.4 = 98.6
console.log('  HP after 4s drain:', mockCrew[0].hp.toFixed(2), `(Expected: ${expectedHp.toFixed(2)})`);

if (Math.abs(mockCrew[0].hp - expectedHp) > 0.05) {
    throw new Error(`Health drain mismatch! Got ${mockCrew[0].hp}`);
}

console.log('  ✅ TEST 2 PASSED: 50% efficiency penalty and -0.35 HP/s drain applied.\n');

// ----------------------------------------------------
// TEST 3: Strict Anti-Stacking Rules
// ----------------------------------------------------
console.log('Test 3: Strict Anti-Stacking & Exclusivity Rules');
// 3a. Injured officer CANNOT suffer panic attack
const panicAdded = engine.addCondition(mockCrew[0], 'PANIC_ATTACK', 'Stress test');
console.log('  Can add PANIC_ATTACK to already-injured officer:', panicAdded, '(Expected: false)');
if (panicAdded) {
    throw new Error('Injured officer should not be able to stack a panic attack!');
}

// 3b. Injured officer CANNOT catch contagious infection
const contagionAdded = engine.addCondition(mockCrew[0], 'CONTAGIOUS_INFECTION', 'Exposure test');
console.log('  Can add CONTAGIOUS_INFECTION to already-injured officer:', contagionAdded, '(Expected: false)');
if (contagionAdded) {
    throw new Error('Injured officer should not be able to stack an infection!');
}

// 3c. Second Track C incident CANNOT trigger while first is active
const secondInjury = engine.triggerWorkplaceInjury(mockCrew[2], 'knee');
console.log('  Can trigger 2nd Track C incident concurrently:', !!secondInjury, '(Expected: false)');
if (secondInjury) {
    throw new Error('Cannot run multiple Track C incidents at the same time!');
}

// 3d. Panicked officer CANNOT suffer an injury
engine.addCondition(mockCrew[2], 'PANIC_ATTACK', 'Fraud panic');
console.log('  Viktor has PANIC_ATTACK:', engine.hasCondition(mockCrew[2], 'PANIC_ATTACK'));
const panicInjury = engine.triggerWorkplaceInjury(mockCrew[2], 'ankle');
console.log('  Can injure an already-panicked officer:', !!panicInjury, '(Expected: false)');
if (panicInjury) {
    throw new Error('Panicked officer should not be eligible for workplace injury!');
}
engine.removeCondition(mockCrew[2], 'PANIC_ATTACK', true);

// 3e. Saboteur with active bomb CANNOT suffer an injury
engine.triggerSabotageIncident(mockCrew[3]);
console.log('  Bomb active on ship:', !!engine.activeSabotage);
const sabInjury = engine.triggerWorkplaceInjury(mockCrew[3], 'elbow');
console.log('  Can injure saboteur while bomb is ticking:', !!sabInjury, '(Expected: false)');
if (sabInjury) {
    throw new Error('Saboteur with ticking bomb should not be eligible for random injury!');
}

// 3f. Track C incident CANNOT trigger on ANYONE while bomb is ticking
const anyInjuryDuringBomb = engine.triggerWorkplaceInjury();
console.log('  Can trigger any workplace injury while bomb is ticking:', !!anyInjuryDuringBomb, '(Expected: false)');
if (anyInjuryDuringBomb) {
    throw new Error('No random incidents may trigger during active bomb countdown!');
}

// Clear the bomb to proceed
engine.resolveSabotage(true, 'Test clear');

console.log('  ✅ TEST 3 PASSED: Strict anti-stacking and event exclusivity fully verified.\n');

// ----------------------------------------------------
// TEST 4: Medbay Treatment Requirement (2nd Crewmate Required)
// ----------------------------------------------------
console.log('Test 4: Medbay Treatment (2nd Crewmate / Attendant Required)');
// Move Elena (injured) into Medbay ALONE (move Tariq out to Sleep Pods first)
mockCrew[1].currentRoom = 'sleepPods';
mockCrew[1].transitRemaining = 0;

mockCrew[0].currentRoom = 'medbay';
mockCrew[0].transitRemaining = 0;

// Update conditions in Medbay while alone
engine.updatePersonnelConditions(2.0);
console.log('  Treatment progress while alone in Medbay:', injuryCond.treatmentProgress, '(Expected: 0)');

const alertAlone = bridge.alerts.find(a => a.id === 'cond-physical_injury-Elena_Rostova');
console.log('  Alert timer while alone in Medbay:', alertAlone.timer, '(Expected: PAUSED)');
console.log('  Alert message contains AWAITING ATTENDANT:', alertAlone.message.includes('AWAITING ATTENDANT'));

if (injuryCond.treatmentProgress !== 0 || alertAlone.timer !== 'PAUSED' || !alertAlone.message.includes('AWAITING ATTENDANT')) {
    throw new Error('Treatment must be paused when patient is alone in Medbay!');
}

// Now move Tariq (Core Flight Medic) into Medbay with Elena!
mockCrew[1].currentRoom = 'medbay';
mockCrew[1].transitRemaining = 0;

// Core Doctor treats at 1.50x rate (18s / 1.50 = 12.0s total)
engine.updatePersonnelConditions(4.0); // 4s * 1.50 = 6.0 units
console.log('  Treatment progress after 4s with Doctor:', injuryCond.treatmentProgress.toFixed(2), '(Expected: 6.00)');

const alertWithDoc = bridge.alerts.find(a => a.id === 'cond-physical_injury-Elena_Rostova');
console.log('  Alert timer with Doctor:', alertWithDoc.timer, '(Expected: countdown active, e.g. 8s)');

if (Math.abs(injuryCond.treatmentProgress - 6.0) > 0.1) {
    throw new Error('Treatment progress rate mismatch with Core Doctor!');
}

// Advance treatment to completion (8.0 more seconds at 1.50x = 12.0 units -> total 18.0)
engine.updatePersonnelConditions(8.1);

console.log('  Elena has PHYSICAL_INJURY after completion:', engine.hasCondition(mockCrew[0], 'PHYSICAL_INJURY'), '(Expected: false)');
console.log('  Active Track C incident cleared:', engine.activeTrackCIncident === null, '(Expected: true)');
const alertCleared = bridge.alerts.find(a => a.id === 'cond-physical_injury-Elena_Rostova');
console.log('  Injury alert card dismissed:', !alertCleared, '(Expected: true)');

// Efficiency fully restored
const restoredEff = engine.getOfficerStationEfficiency(mockCrew[0], 'reactor');
console.log('  Elena Efficiency restored:', restoredEff, '(Expected: 1.00)');

if (engine.hasCondition(mockCrew[0], 'PHYSICAL_INJURY') || engine.activeTrackCIncident !== null || alertCleared || restoredEff !== 1.00) {
    throw new Error('Injury condition not properly resolved upon completing Medbay treatment!');
}

console.log('  ✅ TEST 4 PASSED: Medbay treatment with attendant successfully cured injury and restored efficiency.\n');

console.log('====================================================');
console.log('🎉 ALL TRACK C WORKPLACE INJURY TESTS PASSED!');
console.log('====================================================');

if (engine.tickInterval) clearInterval(engine.tickInterval);
process.exit(0);
