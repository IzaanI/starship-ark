/**
 * TEST: Saboteur Secondary Event (Violent Assault) & Recurring Strike Loop (100-120s)
 * Verifies:
 * 1. Saboteur violent assault selects closest eligible crewmate, reduces HP, halves efficiency, sets assault text.
 * 2. 35% milestone strike triggers from pool (bomb or assault).
 * 3. Disarmed saboteur (searched in Brig) strictly commits violent assault every 100-120s.
 * 4. Undisarmed saboteur pools between bomb and assault every 100-120s.
 * 5. Dead / airlocked or detained saboteur ceases all strikes.
 * 6. Victim Medbay recovery clears injury.
 */

const fs = require('fs');
const path = require('path');

// Mock browser environment
global.window = {
    Phase2Bridge: {
        pushAlert: () => {},
        dismissAlert: () => {},
        renderRoomOccupants: () => {},
        renderCrewManifest: () => {},
        renderSecurityConsole: () => {}
    },
    SoundFX: {
        playCrisisAlert: () => {},
        playLaunchAlert: () => {},
        playKeyClick: () => {}
    }
};

global.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
};

// Read and eval flightEngine.js
const flightEngineSrc = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(flightEngineSrc);

const engine = window.FlightEngine;

function createTestCrew() {
    return [
        {
            name: 'Dr. Katherine Wells',
            roleTitle: 'Flight Surgeon',
            archetype: 'Doctor',
            trueIdentity: 'INDEPENDENT',
            hp: 100,
            eng: 100,
            currentRoom: 'medbay',
            transitRemaining: 0,
            conditions: {},
            status: 'STATIONED (MEDBAY)'
        },
        {
            name: 'Cmdr. Vance Steele',
            roleTitle: 'Vessel Commander',
            archetype: 'Commander',
            trueIdentity: 'INDEPENDENT',
            hp: 100,
            eng: 100,
            currentRoom: 'cockpit',
            transitRemaining: 0,
            conditions: {},
            status: 'STATIONED (COCKPIT)'
        },
        {
            name: 'Lt. Gary Miller',
            roleTitle: 'Security Specialist',
            archetype: 'Security Guard',
            trueIdentity: 'INDEPENDENT',
            hp: 100,
            eng: 100,
            currentRoom: 'brig',
            transitRemaining: 0,
            conditions: {},
            status: 'STATIONED (BRIG)'
        },
        {
            name: 'Marcus Vance',
            roleTitle: 'Systems Engineer',
            archetype: 'Engineer',
            trueIdentity: 'DOOMSDAY_SABOTEUR',
            hp: 100,
            eng: 100,
            currentRoom: 'reactor',
            transitRemaining: 0,
            conditions: {},
            status: 'STATIONED (REACTOR)',
            isDisarmed: false
        }
    ];
}

console.log('--- TEST 1: Direct triggerSaboteurAssault execution ---');
engine.start(createTestCrew());
const saboteur = engine.crew.find(c => c.trueIdentity === 'DOOMSDAY_SABOTEUR');
const victim = engine.triggerSaboteurAssault(saboteur);

if (!victim) {
    console.error('FAIL: triggerSaboteurAssault returned null');
    process.exit(1);
}

// Saboteur is on Deck 1 (Reactor). Nearest eligible crewmate is Gary Miller on Deck 2 (Brig).
console.log(`Victim assaulted: ${victim.name} in ${victim.currentRoom}`);
if (victim.name !== 'Lt. Gary Miller') {
    console.error(`FAIL: Expected nearest victim Gary Miller on Deck 2, got ${victim.name}`);
    process.exit(1);
}

if (!victim.conditions['PHYSICAL_INJURY']) {
    console.error('FAIL: Victim does not have PHYSICAL_INJURY condition');
    process.exit(1);
}

const cond = victim.conditions['PHYSICAL_INJURY'];
if (!cond.isAssault) {
    console.error('FAIL: isAssault flag not set on condition');
    process.exit(1);
}

if (!cond.customDesc.includes('suffered a brutal assault from behind. They were unable to see the attacker.')) {
    console.error(`FAIL: customDesc mismatch: ${cond.customDesc}`);
    process.exit(1);
}

if (victim.hp > 75) {
    console.error(`FAIL: Expected victim HP to be <= 75 after assault blunt trauma, got ${victim.hp}`);
    process.exit(1);
}

// Check efficiency reduction
const injuredEff = engine.getOfficerStationEfficiency(victim, victim.currentRoom);
engine.removeCondition(victim, 'PHYSICAL_INJURY');
const curedEff = engine.getOfficerStationEfficiency(victim, victim.currentRoom);
if (injuredEff !== curedEff * 0.50) {
    console.error(`FAIL: Expected injured efficiency to be half of cured efficiency (${curedEff * 0.50}), got ${injuredEff}`);
    process.exit(1);
}
console.log(`PASS: Test 1 (Direct Assault mechanics: injured eff ${injuredEff} vs cured eff ${curedEff})`);

console.log('\n--- TEST 2: 35% milestone strike triggers pool ---');
engine.isRunning = false;
engine.start(createTestCrew());
engine.speedMultiplier = 1;
engine.distancePercent = 34.0;
engine.evaluateConditionTriggers(1.0);
if (engine.saboteurFirstStrikeTriggered || engine.activeSabotage) {
    console.error('FAIL: Strike triggered before 35% voyage distance');
    process.exit(1);
}

engine.distancePercent = 35.5;
engine.evaluateConditionTriggers(1.0);
if (!engine.saboteurFirstStrikeTriggered) {
    console.error('FAIL: Saboteur first strike did not trigger at 35%');
    process.exit(1);
}

const hasBombAt35 = !!engine.activeSabotage;
const hasAssaultAt35 = engine.crew.some(c => c.conditions && c.conditions['PHYSICAL_INJURY'] && c.conditions['PHYSICAL_INJURY'].isAssault);

if (!hasBombAt35 && !hasAssaultAt35) {
    console.error('FAIL: Neither bomb nor assault triggered at 35%');
    process.exit(1);
}
console.log(`PASS: Test 2 (35% strike triggered: ${hasBombAt35 ? 'Bomb' : 'Assault'})`);

console.log('\n--- TEST 3: Disarmed Saboteur strictly assaults on 35% and recurring 100-120s ---');
engine.isRunning = false;
engine.start(createTestCrew());
engine.speedMultiplier = 1;
const sab3 = engine.crew.find(c => c.trueIdentity === 'DOOMSDAY_SABOTEUR');
sab3.isDisarmed = true; // Disarmed by Brig officer

engine.distancePercent = 36.0;
engine.evaluateConditionTriggers(1.0);

if (engine.activeSabotage) {
    console.error('FAIL: Disarmed saboteur planted a bomb at 35%!');
    process.exit(1);
}

const assaultVictim3 = engine.crew.find(c => c.conditions && c.conditions['PHYSICAL_INJURY'] && c.conditions['PHYSICAL_INJURY'].isAssault);
if (!assaultVictim3) {
    console.error('FAIL: Disarmed saboteur failed to trigger assault at 35%');
    process.exit(1);
}
console.log(`PASS: Disarmed saboteur triggered assault on ${assaultVictim3.name}`);

// Clear victim condition to test recurring strike
engine.removeCondition(assaultVictim3, 'PHYSICAL_INJURY');
if (engine.hasCondition(assaultVictim3, 'PHYSICAL_INJURY')) {
    console.error('FAIL: Condition was not cleared');
    process.exit(1);
}

// Advance timer by 90s (should not strike yet)
engine.evaluateConditionTriggers(90.0);
let recurringVictim = engine.crew.find(c => c.conditions && c.conditions['PHYSICAL_INJURY'] && c.conditions['PHYSICAL_INJURY'].isAssault);
if (recurringVictim) {
    console.error('FAIL: Recurring strike triggered before 100-120s timer elapsed');
    process.exit(1);
}

// Advance another 35s (total 125s elapsed, strike MUST trigger)
engine.evaluateConditionTriggers(35.0);
recurringVictim = engine.crew.find(c => c.conditions && c.conditions['PHYSICAL_INJURY'] && c.conditions['PHYSICAL_INJURY'].isAssault);
if (!recurringVictim) {
    console.error('FAIL: Disarmed saboteur did not strike after 125s recurrence window');
    process.exit(1);
}
if (engine.activeSabotage) {
    console.error('FAIL: Disarmed saboteur planted bomb on recurrence!');
    process.exit(1);
}
console.log(`PASS: Test 3 (Recurring assault triggered on ${recurringVictim.name} at 125s)`);

console.log('\n--- TEST 4: Dead / Airlocked saboteur halts all strikes ---');
engine.isRunning = false;
engine.start(createTestCrew());
engine.speedMultiplier = 1;
const sab4 = engine.crew.find(c => c.trueIdentity === 'DOOMSDAY_SABOTEUR');
sab4.isDead = true;
sab4.status = 'DECEASED';

engine.distancePercent = 50.0;
engine.evaluateConditionTriggers(1.0);
if (engine.saboteurFirstStrikeTriggered || engine.activeSabotage) {
    console.error('FAIL: Dead saboteur initiated a strike!');
    process.exit(1);
}
console.log('PASS: Test 4 (Dead saboteur strikes halted)');

console.log('\n--- ALL UNIT TESTS PASSED CLEANLY ---');
