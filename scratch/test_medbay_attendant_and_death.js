// scratch/test_medbay_attendant_and_death.js
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

// Load flight engine
const code = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(code);

function runTests() {
    console.log('====================================================');
    console.log('🧪 TESTING MEDBAY ATTENDANT RULE & CASUALTY LIFECYCLE');
    console.log('====================================================\n');

    const engine = window.FlightEngine;
    engine.speedMultiplier = 1;

    // Setup 3 test crew members
    const patient = {
        name: 'Patient Alpha',
        roleTitle: 'Technician',
        roleTier: 'Core',
        station: 'Reactor Core',
        hp: 50,
        san: 80,
        eng: 80,
        currentRoom: 'medbay',
        transitRemaining: 0,
        status: 'ASSIGNED: MEDBAY',
        conditions: {}
    };

    const attendant = {
        name: 'Medic Bravo',
        roleTitle: 'Surgeon',
        roleTier: 'Core',
        station: 'Medbay',
        hp: 100,
        san: 100,
        eng: 100,
        currentRoom: 'hydroponics', // Starts elsewhere
        transitRemaining: 0,
        status: 'ASSIGNED: HYDROPONICS',
        conditions: {}
    };

    const bystander = {
        name: 'Officer Charlie',
        roleTitle: 'Security',
        roleTier: 'Core',
        station: 'The Brig',
        hp: 20,
        san: 50,
        eng: 50,
        currentRoom: 'brig',
        transitRemaining: 0,
        status: 'ASSIGNED: THE BRIG',
        conditions: {}
    };

    engine.crew = [patient, attendant, bystander];

    // TEST 1: Patient in Medbay ALONE with Contagion
    console.log('Test 1: Patient in Medbay ALONE with Contagion (No Attendant)');
    engine.addCondition(patient, 'CONTAGIOUS_INFECTION', 'Viral outbreak');

    // Run 5 seconds of sim
    for (let i = 0; i < 5; i++) {
        engine.updateCrewVitals(1.0);
    }

    const patientCond = patient.conditions['CONTAGIOUS_INFECTION'];
    console.log(`  Patient treatmentProgress: ${patientCond.treatmentProgress.toFixed(2)}s (Expected: 0)`);
    console.log(`  Patient HP after 5s: ${patient.hp.toFixed(2)} (Drain -0.35/s, no medbay +1.5/s passive regen)`);

    const alertCard = window.Phase2Bridge.alerts.find(a => a.id.startsWith('cond-contagious_infection'));
    console.log(`  Alert Timer: ${alertCard.timer} (Expected: 'PAUSED')`);
    console.log(`  Alert Message contains 'AWAITING ATTENDANT': ${alertCard.message.includes('AWAITING ATTENDANT')}`);

    if (patientCond.treatmentProgress === 0 && alertCard.timer === 'PAUSED' && alertCard.message.includes('AWAITING ATTENDANT')) {
        console.log('  ✅ TEST 1 PASSED: Treatment paused while alone in Medbay.\n');
    } else {
        console.error('  ❌ TEST 1 FAILED!');
        process.exit(1);
    }

    // TEST 2: Attendant joins Medbay -> Recovery proceeds
    console.log('Test 2: Attendant enters Medbay -> Recovery resumes');
    attendant.currentRoom = 'medbay';
    attendant.status = 'ASSIGNED: MEDBAY';

    // Run 6 seconds of sim (treatment progress will be ~6s out of 18s)
    for (let i = 0; i < 6; i++) {
        engine.updateCrewVitals(1.0);
    }

    console.log(`  Patient treatmentProgress after 6s with attendant: ${patientCond.treatmentProgress.toFixed(2)}s`);
    const alertCard2 = window.Phase2Bridge.alerts.find(a => a.id.startsWith('cond-contagious_infection'));
    console.log(`  Alert Timer: ${alertCard2.timer} (Expected: countdown active, e.g. '12.0s')`);

    if (patientCond.treatmentProgress >= 5.9 && alertCard2.timer !== 'PAUSED') {
        console.log('  ✅ TEST 2 PASSED: Treatment progresses when attendant is present.\n');
    } else {
        console.error('  ❌ TEST 2 FAILED!');
        process.exit(1);
    }

    // TEST 3: Medbay airborne immunity (Attendant does not catch contagion in Medbay)
    console.log('Test 3: Attendant in Medbay is IMMUNE to airborne cross-contamination');
    // Simulate another 30 seconds inside Medbay with contagious patient
    for (let i = 0; i < 30; i++) {
        // Prevent condition from expiring before test by resetting progress slightly if needed
        if (patient.conditions['CONTAGIOUS_INFECTION']) {
            patient.conditions['CONTAGIOUS_INFECTION'].treatmentProgress = 5;
        }
        engine.updatePersonnelConditions(1.0);
    }

    const attendantInfected = engine.hasCondition(attendant, 'CONTAGIOUS_INFECTION');
    console.log(`  Attendant infected: ${attendantInfected} (Expected: false)`);

    if (!attendantInfected) {
        console.log('  ✅ TEST 3 PASSED: Medbay is strictly immune to airborne contagion spread.\n');
    } else {
        console.error('  ❌ TEST 3 FAILED: Attendant caught infection inside Medbay!');
        process.exit(1);
    }

    // TEST 4: Full cure once cureSecRequired (18s) is reached
    console.log('Test 4: Full cure upon completing treatment');
    patient.conditions['CONTAGIOUS_INFECTION'].treatmentProgress = 17.5;
    engine.updatePersonnelConditions(1.0);

    const hasConditionNow = engine.hasCondition(patient, 'CONTAGIOUS_INFECTION');
    console.log(`  Patient has condition after cure threshold: ${hasConditionNow} (Expected: false)`);
    const alertRemoved = !window.Phase2Bridge.alerts.some(a => a.id.startsWith('cond-contagious_infection'));
    console.log(`  Condition alert removed: ${alertRemoved} (Expected: true)`);

    if (!hasConditionNow && alertRemoved) {
        console.log('  ✅ TEST 4 PASSED: Patient fully cured and condition dismissed.\n');
    } else {
        console.error('  ❌ TEST 4 FAILED!');
        process.exit(1);
    }

    // TEST 5: Casualty at 0% Health
    console.log('Test 5: Officer reaching 0% HP dies and is removed from ship');
    bystander.hp = 0.1;
    // Inflict fatal damage
    bystander.hp = 0;
    engine.updateCrewVitals(1.0);

    console.log(`  Bystander isDead: ${bystander.isDead} (Expected: true)`);
    console.log(`  Bystander status: ${bystander.status} (Expected: 'DECEASED')`);
    console.log(`  Bystander currentRoom: ${bystander.currentRoom} (Expected: null)`);

    const fatalityAlert = window.Phase2Bridge.alerts.find(a => a.id.startsWith('fatality-'));
    console.log(`  Fatality Alert Posted: ${!!fatalityAlert} (Title: ${fatalityAlert ? fatalityAlert.title : 'None'})`);

    if (bystander.isDead && bystander.status === 'DECEASED' && bystander.currentRoom === null && !!fatalityAlert) {
        console.log('  ✅ TEST 5 PASSED: Officer flatlines, status becomes DECEASED, and room token unassigned.\n');
    } else {
        console.error('  ❌ TEST 5 FAILED!');
        process.exit(1);
    }

    console.log('====================================================');
    console.log('🎉 ALL MEDBAY & CASUALTY TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');
}

runTests();
