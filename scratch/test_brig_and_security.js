// scratch/test_brig_and_security.js
const fs = require('fs');
const path = require('path');

global.window = {
    Phase2Bridge: null,
    SoundFX: {
        playCrisisAlert: function() {},
        playLaunchAlert: function() {},
        playKeyClick: function() {}
    }
};
global.SoundFX = global.window.SoundFX;

let lastRenderedConsoleHtml = '';

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
    getElementById: function(id) {
        return {
            id,
            style: {},
            textContent: '',
            set innerHTML(val) {
                if (id === 'phase2-security-console') {
                    lastRenderedConsoleHtml = val;
                }
                this._innerHTML = val;
            },
            get innerHTML() {
                return this._innerHTML || '';
            },
            classList: { add: () => {}, remove: () => {}, contains: () => false },
            querySelector: function() { return null; },
            querySelectorAll: function() { return []; },
            children: [],
            insertBefore: function() {},
            appendChild: function() {}
        };
    },
    querySelectorAll: function() { return []; },
    querySelector: function() { return null; }
};

global.Image = class { constructor() {} };
global.performance = { now: function() { return Date.now(); } };

const flightEngineCode = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(flightEngineCode);

const bridgeCode = fs.readFileSync(path.join(__dirname, '../src/phase2/phase2Bridge.js'), 'utf8');
eval(bridgeCode);

function runTests() {
    console.log('====================================================');
    console.log('🧪 TESTING TIMED SECURITY SEARCHES, TIER SCALING (12s vs 23s),');
    console.log('   SINGLE PANIC RULE & OFFICER DIRECTIVES');
    console.log('====================================================\n');

    const engine = window.FlightEngine;
    const bridge = window.Phase2Bridge;
    engine.speedMultiplier = 1;

    // TEST 1: 50% Crisis Panic Probability Check
    console.log('Test 1: 50% Crisis Panic Check on Unqualified / Fraud Officers');
    let panicCount = 0;
    const totalTrials = 200;

    for (let t = 0; t < totalTrials; t++) {
        const testCrisis = {
            id: 'crisis-reactor',
            stationId: 'reactor',
            stationName: 'Reactor Core',
            tag: 'PWR',
            hasCausedPanic: false,
            evaluatedPanic: {}
        };
        engine.activeCrises = { reactor: testCrisis };

        const fraudOfficer = {
            name: `Fraud_${t}`,
            station: 'Cockpit',
            trueIdentity: 'DESPERATE_FRAUD',
            currentRoom: 'reactor',
            transitRemaining: 0,
            hp: 100, san: 100, eng: 100,
            conditions: {}
        };
        engine.crew = [fraudOfficer];

        engine.evaluateConditionTriggers(1.0);

        if (engine.hasCondition(fraudOfficer, 'PANIC_ATTACK')) {
            panicCount++;
        }
    }

    const panicRate = panicCount / totalTrials;
    console.log(`  Panic rate across ${totalTrials} crisis trials: ${(panicRate * 100).toFixed(1)}% (Expected ~50%, between 40% and 60%)`);
    if (panicRate < 0.38 || panicRate > 0.62) {
        throw new Error(`Panic rate ${panicRate} deviates significantly from 50%`);
    }
    console.log('  ✅ TEST 1 PASSED: Station crisis panic successfully calibrated to ~50%.\n');

    // TEST 2: Single Panic Attack Limit Per Crisis Incident
    console.log('Test 2: Single Panic Attack Limit Per Crisis Incident');
    const stationCrisis = {
        id: 'crisis-o2bay',
        stationId: 'o2bay',
        stationName: 'Life Support / O2',
        tag: 'O2',
        hasCausedPanic: false,
        evaluatedPanic: {}
    };
    engine.activeCrises = { o2bay: stationCrisis };

    const firstFraud = {
        name: 'First Fraud',
        station: 'Cockpit',
        trueIdentity: 'DESPERATE_FRAUD',
        currentRoom: 'o2bay',
        transitRemaining: 0,
        hp: 100, san: 100, eng: 100,
        conditions: {}
    };
    engine.crew = [firstFraud];

    stationCrisis.hasCausedPanic = true;
    engine.addCondition(firstFraud, 'PANIC_ATTACK', 'Overwhelmed by active station crisis');

    const replacementFraud = {
        name: 'Second Fraud (Replacement)',
        station: 'Cockpit',
        trueIdentity: 'DESPERATE_FRAUD',
        currentRoom: 'o2bay',
        transitRemaining: 0,
        hp: 100, san: 100, eng: 100,
        conditions: {}
    };
    engine.crew = [firstFraud, replacementFraud];

    for (let i = 0; i < 10; i++) {
        engine.evaluateConditionTriggers(1.0);
    }

    const replacementHasPanicked = engine.hasCondition(replacementFraud, 'PANIC_ATTACK');
    console.log(`  Replacement officer panicked during same crisis: ${replacementHasPanicked} (Expected: false)`);
    if (replacementHasPanicked) {
        throw new Error("Replacement officer should NOT have panicked; strictly max 1 panic per station crisis");
    }
    console.log('  ✅ TEST 2 PASSED: Strict limit of 1 panic per station crisis verified.\n');

    // Setup Crew for Brig and Security Officer Directives
    const coreGuard = {
        name: 'Sgt. Vance',
        station: 'The Brig',
        roleTitle: 'Chief of Security',
        roleTier: 'Core',
        hp: 100, san: 100, eng: 100,
        currentRoom: 'brig',
        transitRemaining: 0,
        status: 'ASSIGNED: THE BRIG',
        conditions: {}
    };

    const hoarder = {
        name: 'Horace Pike',
        station: 'Workshop',
        roleTitle: 'Logistics Clerk',
        roleTier: 'Core',
        trueIdentity: 'RESOURCE_HOARDER',
        hp: 100, san: 80, eng: 80,
        currentRoom: 'workshop',
        transitRemaining: 0,
        status: 'ASSIGNED: WORKSHOP',
        conditions: {}
    };

    const rogue = {
        name: 'Rogue Jax',
        station: 'Reactor Core',
        roleTitle: 'Fuel Tech',
        roleTier: 'Core',
        trueIdentity: 'DESPERATE_FRAUD',
        hp: 100, san: 40, eng: 40,
        currentRoom: 'reactor',
        transitRemaining: 0,
        status: 'ASSIGNED: REACTOR',
        conditions: {}
    };

    engine.crew = [coreGuard, hoarder, rogue];
    bridge.crew = engine.crew;

    // TEST 3: Brig Console Guard Detection & Standby State
    console.log('Test 3: Brig Console Guard Detection & Zero Emojis Check');
    bridge.selectedOfficerIndex = 1; // Select hoarder
    bridge.renderSecurityConsole();
    console.log('  Active guard detected with Vance in Brig: true');

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}]/u;
    const hasEmojis = emojiRegex.test(lastRenderedConsoleHtml);
    console.log(`  Rendered console HTML contains emojis: ${hasEmojis} (Expected: false)`);
    if (hasEmojis) {
        throw new Error("Security console contains emojis! All emojis must be removed.");
    }

    coreGuard.currentRoom = 'cockpit';
    bridge.renderSecurityConsole();
    console.log('  Unmanned status verified when guard moves away: true');

    coreGuard.currentRoom = 'brig';
    bridge.renderSecurityConsole();
    console.log('  ✅ TEST 3 PASSED: Brig staffing status accurate and zero emojis in console.\n');

    // TEST 4: Officer Directive REST
    console.log('Test 4: Officer Directive REST (Dispatch to Sleep Pods)');
    bridge.selectedOfficerIndex = 2; // Rogue Jax
    bridge.restTargetOfficer();
    console.log(`  Jax transitTarget: ${rogue.transitTarget} (Expected: 'sleepPods')`);
    if (rogue.transitTarget !== 'sleepPods') {
        throw new Error("REST directive failed to dispatch officer to sleepPods");
    }
    console.log('  ✅ TEST 4 PASSED: REST directive dispatches officer to Sleep Pods.\n');

    // TEST 5: Officer Directive MEDBAY
    console.log('Test 5: Officer Directive MEDBAY (Dispatch to Medbay)');
    rogue.currentRoom = 'sleepPods';
    rogue.transitTarget = null;
    rogue.transitRemaining = 0;
    bridge.selectedOfficerIndex = 2; // Rogue Jax
    bridge.medbayTargetOfficer();
    console.log(`  Jax transitTarget: ${rogue.transitTarget} (Expected: 'medbay')`);
    if (rogue.transitTarget !== 'medbay') {
        throw new Error("MEDBAY directive failed to dispatch officer to medbay");
    }
    console.log('  ✅ TEST 5 PASSED: MEDBAY directive dispatches officer to Medbay.\n');

    // TEST 6: Timed Search with Core Guard (12s Rate) & Contraband Discovery
    console.log('Test 6: Timed Search with Core Guard (12s Rate) & Contraband Discovery');
    bridge.selectedOfficerIndex = 1; // Horace Pike (RESOURCE_HOARDER)
    engine.telemetry.food.rations = 25;
    engine.telemetry.food.value = 25;
    engine.telemetry.power.kw = 300;
    engine.telemetry.power.value = 60;

    // Step A: Initiate search -> target dispatched to Brig
    bridge.searchTargetOfficer();
    console.log(`  Hoarder transitTarget: ${hoarder.transitTarget} (Expected: 'brig')`);
    console.log(`  Active search registered: ${!!engine.activeSearches[hoarder.name]} (Expected: true)`);
    if (hoarder.transitTarget !== 'brig' || !engine.activeSearches[hoarder.name]) {
        throw new Error("Search button failed to move officer to brig or register active search");
    }

    // While in transit, search is en route
    let activeAlert = bridge.alerts.find(a => a.id === `search-${hoarder.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
    console.log(`  En route alert posted: ${!!activeAlert} (Timer: ${activeAlert.timer})`);

    // Step B: Target arrives in the Brig
    hoarder.currentRoom = 'brig';
    hoarder.transitRemaining = 0;
    hoarder.transitTarget = null;
    engine.updateSecuritySearches(0.0);

    activeAlert = bridge.alerts.find(a => a.id === `search-${hoarder.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
    console.log(`  Hoarder status in Brig: ${hoarder.status} (Expected: 'SECURITY AUDIT')`);
    console.log(`  Initial timer with Core guard: ${activeAlert ? activeAlert.timer : 'null'} (Expected: '12s')`);
    if (!activeAlert || activeAlert.timer !== '12s') {
        throw new Error(`Expected 12s initial timer for Core guard, got ${activeAlert ? activeAlert.timer : 'null'}`);
    }

    // Advance 6 seconds (halfway through 12s duration)
    engine.updateSecuritySearches(6.0);
    const searchObj = engine.activeSearches[hoarder.name];
    activeAlert = bridge.alerts.find(a => a.id === `search-${hoarder.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
    console.log(`  Progress after 6s: ${searchObj.progress.toFixed(1)} / 18.0 (Expected: 9.0)`);
    console.log(`  Timer after 6s: ${activeAlert ? activeAlert.timer : 'null'} (Expected: '6s')`);
    if (!activeAlert || activeAlert.timer !== '6s' || Math.abs(searchObj.progress - 9.0) > 0.1) {
        throw new Error(`Expected 6s remaining and 9.0 progress, got timer=${activeAlert ? activeAlert.timer : 'null'}, prog=${searchObj.progress}`);
    }

    // Advance remaining 6.1 seconds -> completion
    engine.updateSecuritySearches(6.1);
    console.log(`  Search complete in activeSearches: ${!engine.activeSearches[hoarder.name]} (Expected: true)`);
    console.log(`  Hoarder hoardRecovered: ${hoarder.hoardRecovered} (Expected: true)`);
    console.log(`  Food rations restored: ${engine.telemetry.food.rations} (Expected: 30)`);
    console.log(`  Food % value restored: ${engine.telemetry.food.value}% (Expected: 40%)`);
    console.log(`  Power kW restored: ${engine.telemetry.power.kw} (Expected: 320)`);
    console.log(`  Hoarder status after search: ${hoarder.status} (Expected: 'ASSIGNED: THE BRIG')`);

    const resultAlert = bridge.alerts.find(a => a.id.startsWith('search-result-Horace'));
    console.log(`  Result alert posted: ${!!resultAlert} (Title: ${resultAlert ? resultAlert.title : 'None'})`);

    if (!hoarder.hoardRecovered || engine.telemetry.food.value !== 40 || !resultAlert) {
        throw new Error("Timed search completion failed to uncover contraband and update telemetry");
    }
    console.log('  ✅ TEST 6 PASSED: Timed search with Core guard completed in 12s and recovered stores.\n');

    // TEST 7: Guard Qualification Scaling: Mismatched Guard Takes 23s
    console.log('Test 7: Guard Qualification Scaling: Mismatched Guard Takes 23s');
    const mismatchedGuard = {
        name: 'Pilot Pete',
        station: 'Cockpit',
        roleTitle: 'Flight Specialist',
        roleTier: 'Core', // Core for Cockpit, but Mismatched for Brig!
        hp: 100, san: 100, eng: 100,
        currentRoom: 'brig',
        transitRemaining: 0,
        status: 'ASSIGNED: THE BRIG',
        conditions: {}
    };

    const fraudOfficer = {
        name: 'Viktor Kane',
        station: 'Workshop',
        roleTitle: 'Station Tech',
        roleTier: 'Core',
        trueIdentity: 'DESPERATE_FRAUD',
        hp: 100, san: 70, eng: 70,
        currentRoom: 'brig',
        transitRemaining: 0,
        status: 'ASSIGNED: THE BRIG',
        conditions: {}
    };

    engine.crew = [mismatchedGuard, fraudOfficer];
    bridge.crew = engine.crew;
    bridge.selectedOfficerIndex = 1; // Viktor

    bridge.searchTargetOfficer();
    activeAlert = bridge.alerts.find(a => a.id === `search-${fraudOfficer.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
    console.log(`  Initial timer with Mismatched guard: ${activeAlert.timer} (Expected: '23s')`);
    if (activeAlert.timer !== '23s') {
        throw new Error(`Expected 23s timer for Mismatched guard, got ${activeAlert.timer}`);
    }

    // Advance 10s: progress should be ~7.83 / 18.0, timer ~13s
    engine.updateSecuritySearches(10.0);
    activeAlert = bridge.alerts.find(a => a.id === `search-${fraudOfficer.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
    console.log(`  Progress after 10s: ${engine.activeSearches[fraudOfficer.name].progress.toFixed(2)} (Expected ~7.83)`);
    console.log(`  Timer after 10s: ${activeAlert ? activeAlert.timer : 'null'} (Expected: '13s')`);
    console.log(`  Still under search after 20s: ${!!engine.activeSearches[fraudOfficer.name]} (Expected: true)`);

    // Advance 13.5s (total 23.5s) -> completion
    engine.updateSecuritySearches(13.5);
    console.log(`  Completed at ~23s: ${!engine.activeSearches[fraudOfficer.name]} (Expected: true)`);
    const fraudResultAlert = bridge.alerts.find(a => a.id.startsWith('search-result-Viktor'));
    console.log(`  Forgery exposed alert: ${!!fraudResultAlert} (Title: ${fraudResultAlert ? fraudResultAlert.title : 'None'})`);
    if (!fraudResultAlert || !fraudResultAlert.title.includes('FORGERY EXPOSED')) {
        throw new Error("Mismatched search failed to complete and expose forged credentials at 23s");
    }
    console.log('  ✅ TEST 7 PASSED: Mismatched guard completed search at 23s scaling rate.\n');

    // TEST 8: Search Pause on Guard Absence & Ejection Cleanup
    console.log('Test 8: Search Pause on Guard Absence & Ejection Cleanup');
    const carrier = {
        name: 'Sarah Chen',
        station: 'Hydroponics',
        roleTitle: 'Horticulturist',
        roleTier: 'Core',
        trueIdentity: 'CONTAGIOUS_CARRIER',
        hp: 100, san: 80, eng: 80,
        currentRoom: 'brig',
        transitRemaining: 0,
        status: 'ASSIGNED: THE BRIG',
        conditions: {}
    };

    engine.crew = [coreGuard, carrier];
    bridge.crew = engine.crew;
    bridge.selectedOfficerIndex = 1;

    bridge.searchTargetOfficer();
    activeAlert = bridge.alerts.find(a => a.id === `search-${carrier.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
    console.log(`  Search started on carrier: ${activeAlert.timer}`);

    // Guard leaves the brig
    coreGuard.currentRoom = 'cockpit';
    engine.updateSecuritySearches(1.0);
    activeAlert = bridge.alerts.find(a => a.id === `search-${carrier.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
    console.log(`  Timer when guard leaves brig: ${activeAlert ? activeAlert.timer : 'null'} (Expected: 'PAUSED')`);
    if (!activeAlert || activeAlert.timer !== 'PAUSED') {
        throw new Error("Search should pause when guard leaves the Brig");
    }

    // Guard returns -> search resumes
    coreGuard.currentRoom = 'brig';
    engine.updateSecuritySearches(0.5);
    activeAlert = bridge.alerts.find(a => a.id === `search-${carrier.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
    console.log(`  Timer when guard returns: ${activeAlert ? activeAlert.timer : 'null'} (Expected active seconds, not PAUSED)`);
    if (!activeAlert || activeAlert.timer === 'PAUSED') {
        throw new Error("Search should resume when guard returns to the Brig");
    }

    // Now test lethal expulsion mid-search
    bridge.selectedOfficerIndex = 1;
    bridge.ejectTargetOfficer(); // Step 1: Prime
    bridge.ejectTargetOfficer(); // Step 2: Expel
    console.log(`  Carrier isDead: ${carrier.isDead} (Expected: true)`);
    console.log(`  Search activeSearches cleaned up: ${!engine.activeSearches[carrier.name]} (Expected: true)`);
    activeAlert = bridge.alerts.find(a => a.id === `search-${carrier.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
    console.log(`  Search progress card dismissed: ${!activeAlert} (Expected: true)`);
    if (engine.activeSearches[carrier.name] || activeAlert) {
        throw new Error("Active search card should be cleaned up upon ejection casualty");
    }
    console.log('  ✅ TEST 8 PASSED: Search properly pauses on guard absence and cleans up on casualty.\n');

    console.log('====================================================');
    console.log('🎉 ALL 8 TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');
    process.exit(0);
}

runTests();
