// scratch/test_medbay_tier_scaling.js
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
    getElementById: function(id) {
        return {
            id,
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
global.performance = { now: function() { return Date.now(); } };

const code = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(code);

function runTests() {
    console.log('====================================================');
    console.log('🧪 TESTING MEDBAY ATTENDANT TIER SCALING (12s, 18s, 23s)');
    console.log('====================================================\n');

    const engine = window.FlightEngine;
    engine.speedMultiplier = 1;

    // TEST 1: Core Doctor Attendant (~12s cure time, 1.5x speed)
    console.log('Test 1: Core Doctor Attendant');
    const patient1 = {
        name: 'Patient One',
        station: 'Reactor Core',
        roleTier: 'Core',
        hp: 50, san: 80, eng: 80,
        currentRoom: 'medbay',
        transitRemaining: 0,
        status: 'ASSIGNED: MEDBAY',
        conditions: {}
    };
    const doctorAttendant = {
        name: 'Dr. Sarah Lin',
        station: 'Medbay',
        roleTier: 'Core', // Core doctor
        hp: 100, san: 100, eng: 100,
        currentRoom: 'medbay',
        transitRemaining: 0,
        status: 'ASSIGNED: MEDBAY',
        conditions: {}
    };

    engine.crew = [patient1, doctorAttendant];
    engine.addCondition(patient1, 'CONTAGIOUS_INFECTION');

    const alertCardDoctor = window.Phase2Bridge.alerts.find(a => a.id.startsWith('cond-contagious_infection'));
    console.log(`  Initial Timer with Doctor: ${alertCardDoctor.timer} (Expected: 12s)`);
    if (alertCardDoctor.timer !== '12s') throw new Error(`Expected 12s initial timer for doctor, got ${alertCardDoctor.timer}`);

    // Advance 4s
    for (let i = 0; i < 4; i++) engine.updatePersonnelConditions(1.0);
    const cond1 = patient1.conditions['CONTAGIOUS_INFECTION'];
    console.log(`  Treatment progress after 4s: ${cond1.treatmentProgress.toFixed(2)}s (Expected ~6.0s at 1.5x)`);
    if (Math.abs(cond1.treatmentProgress - 6.0) > 0.1) throw new Error("Doctor treatment did not advance at 1.5x");

    // Advance 4s more (total 8s sim -> 12s progress -> 6s remaining)
    for (let i = 0; i < 4; i++) engine.updatePersonnelConditions(1.0);
    const alertCardDoctorMid = window.Phase2Bridge.alerts.find(a => a.id.startsWith('cond-contagious_infection'));
    console.log(`  Timer with Doctor after 8s: ${alertCardDoctorMid.timer} (Expected: 4s)`);

    // Advance 4.1s more -> total 12.1s elapsed -> reaches 18s progress -> cured!
    for (let i = 0; i < 5; i++) engine.updatePersonnelConditions(1.0);
    const curedDoctor = !engine.hasCondition(patient1, 'CONTAGIOUS_INFECTION');
    console.log(`  Patient cured in ~12s real time: ${curedDoctor} (Expected: true)`);
    if (!curedDoctor) throw new Error("Patient should be cured after 12s with doctor");
    console.log('  ✅ TEST 1 PASSED: Core Doctor cures in ~12 seconds.\n');

    // TEST 2: Mismatched Attendant (~23s cure time)
    console.log('Test 2: Mismatched Attendant (Pilot/Security, 23s rate)');
    const patient2 = {
        name: 'Patient Two',
        station: 'Reactor Core',
        roleTier: 'Core',
        hp: 50, san: 80, eng: 80,
        currentRoom: 'medbay',
        transitRemaining: 0,
        status: 'ASSIGNED: MEDBAY',
        conditions: {}
    };
    const mismatchedAttendant = {
        name: 'Pilot Drake',
        station: 'Cockpit',
        roleTier: 'Core', // Core for Cockpit, but Mismatched for Medbay!
        hp: 100, san: 100, eng: 100,
        currentRoom: 'medbay',
        transitRemaining: 0,
        status: 'ASSIGNED: MEDBAY',
        conditions: {}
    };

    engine.crew = [patient2, mismatchedAttendant];
    engine.addCondition(patient2, 'CONTAGIOUS_INFECTION');

    const alertCardMismatched = window.Phase2Bridge.alerts.find(a => a.id.startsWith('cond-contagious_infection'));
    console.log(`  Initial Timer with Mismatched Attendant: ${alertCardMismatched.timer} (Expected: 23s)`);
    if (alertCardMismatched.timer !== '23s') throw new Error(`Expected 23s timer for mismatched attendant, got ${alertCardMismatched.timer}`);

    // Advance 10s
    for (let i = 0; i < 10; i++) engine.updatePersonnelConditions(1.0);
    const cond2 = patient2.conditions['CONTAGIOUS_INFECTION'];
    console.log(`  Treatment progress after 10s: ${cond2.treatmentProgress.toFixed(2)}s (Expected ~7.83s at 18/23x)`);

    // Advance 12s (total 22s elapsed -> ~17.2s progress)
    for (let i = 0; i < 12; i++) engine.updatePersonnelConditions(1.0);
    console.log(`  Patient still under treatment after 22s: ${engine.hasCondition(patient2, 'CONTAGIOUS_INFECTION')} (Expected: true)`);
    if (!engine.hasCondition(patient2, 'CONTAGIOUS_INFECTION')) throw new Error("Should not be cured yet at 22s");

    // Advance 2s more (total 24s elapsed -> reaches 18s progress -> cured!)
    for (let i = 0; i < 2; i++) engine.updatePersonnelConditions(1.0);
    const curedMismatched = !engine.hasCondition(patient2, 'CONTAGIOUS_INFECTION');
    console.log(`  Patient cured at 23-24s real time: ${curedMismatched} (Expected: true)`);
    if (!curedMismatched) throw new Error("Patient should be cured after 23-24s with mismatched attendant");
    console.log('  ✅ TEST 2 PASSED: Mismatched attendant cures in ~23 seconds.\n');

    // TEST 3: Panicked Attendant Pauses Treatment
    console.log('Test 3: Panicked Attendant Pauses Treatment');
    const patient3 = {
        name: 'Patient Three',
        station: 'Reactor Core',
        roleTier: 'Core',
        hp: 50, san: 80, eng: 80,
        currentRoom: 'medbay',
        transitRemaining: 0,
        status: 'ASSIGNED: MEDBAY',
        conditions: {}
    };
    const panickedDoctor = {
        name: 'Dr. Freeze',
        station: 'Medbay',
        roleTier: 'Core',
        hp: 100, san: 20, eng: 100,
        currentRoom: 'medbay',
        transitRemaining: 0,
        status: 'ASSIGNED: MEDBAY',
        conditions: {}
    };

    engine.crew = [patient3, panickedDoctor];
    engine.addCondition(patient3, 'CONTAGIOUS_INFECTION');
    engine.addCondition(panickedDoctor, 'PANIC_ATTACK');

    engine.updatePersonnelConditions(1.0);
    const alertCardPanicked = window.Phase2Bridge.alerts.find(a => a.id.startsWith('cond-contagious_infection'));
    console.log(`  Timer with Panicked Attendant: ${alertCardPanicked.timer} (Expected: 'PAUSED')`);
    console.log(`  Message contains 'incapacitated / panicked': ${alertCardPanicked.message.includes('incapacitated / panicked')}`);

    if (alertCardPanicked.timer !== 'PAUSED' || !alertCardPanicked.message.includes('incapacitated / panicked')) {
        throw new Error("Panicked attendant should pause treatment");
    }
    console.log('  ✅ TEST 3 PASSED: Panicked attendant properly pauses treatment.\n');

    // TEST 4: Passive HP Regen with Doctor vs Standard
    console.log('Test 4: Passive HP Regen Doctor Boost');
    const wounded1 = { name: 'Wounded 1', hp: 50, currentRoom: 'medbay', transitRemaining: 0, status: 'RESTING', conditions: {} };
    const doctor = { name: 'Doctor', station: 'Medbay', roleTier: 'Core', hp: 100, currentRoom: 'medbay', transitRemaining: 0, conditions: {} };
    engine.crew = [wounded1, doctor];
    engine.updateCrewVitals(1.0);
    console.log(`  HP after 1s with Doctor: ${wounded1.hp.toFixed(2)} (Expected 52.20 with +2.2/s boost)`);
    if (Math.abs(wounded1.hp - 52.2) > 0.05) throw new Error("Expected +2.2 HP/s with doctor");
    console.log('  ✅ TEST 4 PASSED: Doctor enhances passive HP regen.\n');

    console.log('====================================================');
    console.log('🎉 ALL TIER SCALING TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');
}

runTests();
