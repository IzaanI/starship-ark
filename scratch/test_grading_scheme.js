/**
 * TEST: Strict Post-Flight Grading Scheme & S-Rank Prerequisites
 */

const fs = require('fs');
const path = require('path');

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
    playLaunchAlert: () => {},
    playStationArrival: () => {},
    playPneumaticDoor: () => {}
};

// Load codebase
const bridgeCode = fs.readFileSync(path.join(__dirname, '../src/phase2/phase2Bridge.js'), 'utf8');
eval(bridgeCode);

const flightEngineCode = fs.readFileSync(path.join(__dirname, '../src/phase2/flightEngine.js'), 'utf8');
eval(flightEngineCode);

const engine = window.FlightEngine;

function makeCrew(count = 6, casualties = 0) {
    const list = [];
    for (let i = 0; i < count; i++) {
        const isDead = i < casualties;
        list.push({
            name: `Officer ${i + 1}`,
            roleTitle: 'Specialist',
            trueIdentity: 'INDEPENDENT',
            hp: isDead ? 0 : 100,
            eng: 100,
            isDead: isDead,
            status: isDead ? 'DECEASED' : 'ASSIGNED: DUTY'
        });
    }
    return list;
}

console.log('====================================================');
console.log('TESTING POST-FLIGHT GRADING SCHEME & S-RANK PREREQUISITES');
console.log('====================================================');

// TEST 1: Flawless Run -> Rank S
console.log('[TEST 1] Flawless victory with all 6 crew alive, high hull, stable reserves');
engine.isRunning = false;
engine.crew = makeCrew(6, 0);
engine.start(engine.crew);
engine.gameOutcome = 'VICTORY';
engine.distancePercent = 100;
engine.elapsedSeconds = 400;
engine.totalVoyageSeconds = 400;
engine.telemetry.hull.value = 85;
engine.telemetry.power.value = 60;
engine.telemetry.power.kw = 300;
engine.telemetry.o2.value = 55;
engine.telemetry.food.value = 50;
engine.telemetry.food.rations = 25;
engine.telemetry.discipline.value = 75;

let report = engine.generateDebriefReport();
console.log(`  Score: ${report.score}, Rank: ${report.rank} (${report.rankTitle})`);
if (report.rank !== 'S') {
    throw new Error(`Expected Rank S for flawless run, got: ${report.rank}`);
}
console.log('  PASS: Rank S awarded for exemplary performance.');

// TEST 2: High Score BUT 1 Casualty -> Disqualifies Rank S
console.log('\n[TEST 2] High score with 1 casualty -> Mathematically blocked from S');
engine.isRunning = false;
engine.crew = makeCrew(6, 1); // 1 dead
engine.start(engine.crew);
engine.gameOutcome = 'VICTORY';
engine.distancePercent = 100;
engine.telemetry.hull.value = 90;
engine.telemetry.power.value = 70;
engine.telemetry.o2.value = 70;
engine.telemetry.food.value = 70;
engine.telemetry.discipline.value = 80;

report = engine.generateDebriefReport();
console.log(`  Score: ${report.score}, Rank: ${report.rank} (${report.rankTitle}), Casualties: ${report.casualtyCount}`);
if (report.rank === 'S') {
    throw new Error(`Rank S should be impossible with a casualty! Got Rank S`);
}
if (report.rank !== 'A') {
    throw new Error(`Expected Rank A with 1 casualty, got: ${report.rank}`);
}
const casualtyItem = report.breakdown.find(b => b.label.includes('Casualties Incurred'));
if (!casualtyItem || casualtyItem.points >= 0) {
    throw new Error('Expected negative casualty penalty in breakdown');
}
console.log(`  PASS: Rank S denied due to casualty (Rank A awarded with ${casualtyItem.points} PTS penalty).`);

// TEST 3: All Crew Alive, BUT Hull < 75% -> Disqualifies Rank S
console.log('\n[TEST 3] All crew alive, but damaged hull (60%) -> Disqualifies S');
engine.isRunning = false;
engine.crew = makeCrew(6, 0);
engine.start(engine.crew);
engine.gameOutcome = 'VICTORY';
engine.distancePercent = 100;
engine.telemetry.hull.value = 60; // < 75
engine.telemetry.power.value = 60;
engine.telemetry.o2.value = 60;
engine.telemetry.food.value = 60;
engine.telemetry.discipline.value = 70;

report = engine.generateDebriefReport();
console.log(`  Score: ${report.score}, Rank: ${report.rank} (${report.rankTitle}), Hull: ${report.telemetry.hull.value}%`);
if (report.rank === 'S') {
    throw new Error(`Rank S should be impossible with 60% hull! Got Rank S`);
}
console.log('  PASS: Rank S denied due to damaged hull (< 75%).');

// TEST 4: All Crew Alive, BUT Food Reserves Depleted (< 25%) -> Disqualifies S
console.log('\n[TEST 4] All crew alive, but depleted food stores (15%) -> Disqualifies S');
engine.isRunning = false;
engine.crew = makeCrew(6, 0);
engine.start(engine.crew);
engine.gameOutcome = 'VICTORY';
engine.distancePercent = 100;
engine.telemetry.hull.value = 85;
engine.telemetry.power.value = 60;
engine.telemetry.o2.value = 60;
engine.telemetry.food.value = 15; // < 25%
engine.telemetry.discipline.value = 70;

report = engine.generateDebriefReport();
console.log(`  Score: ${report.score}, Rank: ${report.rank} (${report.rankTitle}), Food: ${report.telemetry.food.value}%`);
if (report.rank === 'S') {
    throw new Error(`Rank S should be impossible with 15% food! Got Rank S`);
}
console.log('  PASS: Rank S denied due to dangerously low food reserves (< 25%).');

// TEST 5: Multiple Casualties & Damaged Hull -> Rank C
console.log('\n[TEST 5] Multiple casualties (3 dead) and damaged hull (35%) -> Rank C');
engine.isRunning = false;
engine.crew = makeCrew(6, 3); // 3 dead
engine.start(engine.crew);
engine.gameOutcome = 'VICTORY';
engine.distancePercent = 100;
engine.telemetry.hull.value = 35;
engine.telemetry.power.value = 25;
engine.telemetry.o2.value = 25;
engine.telemetry.food.value = 20;
engine.telemetry.discipline.value = 30;

report = engine.generateDebriefReport();
console.log(`  Score: ${report.score}, Rank: ${report.rank} (${report.rankTitle})`);
if (report.rank !== 'C') {
    throw new Error(`Expected Rank C for heavy attrition, got: ${report.rank}`);
}
console.log('  PASS: Rank C awarded for heavy casualty / derelict arrival.');

// TEST 6: Mission Defeat (Hull Breach) -> Rank D / F
console.log('\n[TEST 6] Mission defeat at 70% distance -> Rank D');
engine.isRunning = false;
engine.crew = makeCrew(6, 2);
engine.start(engine.crew);
engine.gameOutcome = 'DEFEAT';
engine.distancePercent = 70;
engine.telemetry.hull.value = 0;
engine.telemetry.power.value = 10;
engine.telemetry.o2.value = 10;
engine.telemetry.food.value = 10;
engine.telemetry.discipline.value = 20;

report = engine.generateDebriefReport();
console.log(`  Score: ${report.score}, Rank: ${report.rank} (${report.rankTitle})`);
if (report.rank !== 'D' && report.rank !== 'F') {
    throw new Error(`Expected Rank D or F for failure, got: ${report.rank}`);
}
console.log(`  PASS: Defeat rank properly assigned (${report.rank}).`);

console.log('\nALL GRADING SCHEME TESTS PASSED CLEANLY!');
