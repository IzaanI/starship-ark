/**
 * test_math_rotation_simulation.js
 * Mathematical analysis and simulation of 6-crew rotation cycling at 30% energy over a 400s flight.
 */

const VOYAGE_TARGET = 400; // 06:40 at 1x cruise (exact 400s)

const DRAIN_RATES_BASE = {
    UNMANNED: 0.320,
    MISMATCHED: 0.250,
    STRETCH: 0.198,
    ADJACENT: 0.171,
    CORE: 0.145,
    STACKED: 0.105
};

// Power has 10% reduction, Life Support has 0.85 metabolic mass factor
const DRAIN_RATES = {
    POWER: {
        UNMANNED: DRAIN_RATES_BASE.UNMANNED * 0.90,
        MISMATCHED: DRAIN_RATES_BASE.MISMATCHED * 0.90,
        STRETCH: DRAIN_RATES_BASE.STRETCH * 0.90,
        ADJACENT: DRAIN_RATES_BASE.ADJACENT * 0.90,
        CORE: DRAIN_RATES_BASE.CORE * 0.90,
        STACKED: DRAIN_RATES_BASE.STACKED * 0.90
    },
    LIFE_SUPPORT: {
        UNMANNED: DRAIN_RATES_BASE.UNMANNED * 0.85,
        MISMATCHED: DRAIN_RATES_BASE.MISMATCHED * 0.85,
        STRETCH: DRAIN_RATES_BASE.STRETCH * 0.85,
        ADJACENT: DRAIN_RATES_BASE.ADJACENT * 0.85,
        CORE: DRAIN_RATES_BASE.CORE * 0.85,
        STACKED: DRAIN_RATES_BASE.STACKED * 0.85
    }
};

console.log("================================================================================");
console.log("📊 MATHEMATICAL BREAKDOWN: BALANCED 6-CREW ROTATION OVER 400s FLIGHT (CORRECTED ETA)");
console.log("================================================================================\n");

// 1. CYCLE TIMING
const dutyDeltaEng = 70; // 100% -> 30%
const dutyDrainRate = 0.315; // %/s on active duty (10% lower)
const dutyTime = dutyDeltaEng / dutyDrainRate; // ~222.2s (~3.7m)

const sleepDeltaEng = 70; // 30% -> 100%
const sleepRechargeRate = 3.50; // %/s in sleep pods
const sleepTime = sleepDeltaEng / sleepRechargeRate; // 20.00s

const transitOneWay = 4.0; // average 4s transit duration
const transitTotal = transitOneWay * 2; // 8.0s round trip

const fullCycleDuration = dutyTime + transitTotal + sleepTime; // 250.2s

console.log("--- 1. SINGLE OFFICER TIMING BREAKDOWN ---");
console.log(`• Time on Station Duty (100% -> 30% eng) : ${dutyTime.toFixed(1)}s (~${(dutyTime / 60).toFixed(1)} minutes)`);
console.log(`• Corridor Transit to Sleep Pods        : ${transitOneWay.toFixed(1)}s`);
console.log(`• Sleep Pod Recharge (30% -> 100% eng)  : ${sleepTime.toFixed(1)}s (20.0 seconds)`);
console.log(`• Corridor Transit back to Duty         : ${transitOneWay.toFixed(1)}s`);
console.log(`• Total Rest & Transit Cycle            : ${(sleepTime + transitTotal).toFixed(1)}s`);
console.log(`• Complete Duty + Rest Loop Period      : ${fullCycleDuration.toFixed(1)}s`);
console.log(`• Cycles Needed over 400s Flight        : ${(VOYAGE_TARGET / fullCycleDuration).toFixed(2)} cycles (Officers rest ONCE!)`);
console.log(`• Sleep Pod Duty Ratio                  : Duty ${(dutyTime / fullCycleDuration * 100).toFixed(1)}% | Away ${( (sleepTime + transitTotal) / fullCycleDuration * 100).toFixed(1)}%\n`);

// 2. CAPACITY & ROTATION FEASIBILITY
console.log("--- 2. CREW & SLEEP POD CAPACITY ANALYSIS ---");
console.log("• Total Living Crew: 6 officers max");
console.log("• Core Essential Stations: 4 (Cockpit, Reactor Core, O2 Bay, Hydroponics)");
console.log("• Sleep Pod Capacity: 2 bunks max");
console.log("• Alignment Math: 4 on active stations + 2 resting/floating = 6 crew members (EXACT MATCH!)");
console.log(`• Bunk Turnover Ratio: Sleeping takes ${sleepTime.toFixed(0)}s, working takes ${dutyTime.toFixed(0)}s.`);
console.log("  -> 2 bunks easily service all 6 officers with zero congestion.\n");

// 3. RESOURCE DRAIN PER PLAYSTYLE SCENARIO
function runSimulation(scenarioName, reliefTier, crisesCount = 2) {
    let voyageProgress = 0;
    let clockTime = 0;
    
    let pwr = 100;
    let o2 = 100;
    let food = 100;

    // 4 station primaries + 2 relief floaters
    let crew = [
        { id: "Helm", station: "cockpit", eng: 100, role: "Core", primary: "cockpit" },
        { id: "Reactor", station: "reactor", eng: 90, role: "Core", primary: "reactor" },
        { id: "O2", station: "o2bay", eng: 80, role: "Core", primary: "o2bay" },
        { id: "Hydro", station: "hydroponics", eng: 70, role: "Core", primary: "hydroponics" },
        { id: "Float1", station: null, eng: 100, role: reliefTier, primary: null },
        { id: "Float2", station: null, eng: 100, role: reliefTier, primary: null }
    ];

    let beds = [null, null];
    let dt = 0.5;

    while (voyageProgress < VOYAGE_TARGET && clockTime < 500) {
        clockTime += dt;
        voyageProgress += 1.0 * dt; // Corrected 1:1 speed at 1x cruise

        // Vitals update & rotation
        for (let c of crew) {
            if (c.station) {
                // On duty
                c.eng -= dutyDrainRate * dt;
                if (c.eng <= 30 && c.primary) {
                    // Send primary to sleep if bed open
                    let bedIdx = beds.indexOf(null);
                    if (bedIdx !== -1) {
                        beds[bedIdx] = c;
                        c.station = null;
                        c.isSleeping = true;
                        c.sleepTimer = sleepTime + transitTotal;

                        // Send relief floater to cover if available
                        if (reliefTier !== 'VACANT') {
                            let availableFloat = crew.find(f => !f.station && !f.isSleeping && f.eng >= 40);
                            if (availableFloat) {
                                availableFloat.station = c.primary;
                            }
                        }
                    }
                }
            } else if (c.isSleeping) {
                c.sleepTimer -= dt;
                c.eng = Math.min(100, c.eng + sleepRechargeRate * dt);
                if (c.sleepTimer <= 0 || c.eng >= 100) {
                    c.eng = 100;
                    c.isSleeping = false;
                    let bedIdx = beds.indexOf(c);
                    if (bedIdx !== -1) beds[bedIdx] = null;

                    // Return primary to station
                    if (c.primary) {
                        let relief = crew.find(r => r.station === c.primary && r !== c);
                        if (relief) relief.station = null;
                        c.station = c.primary;
                    }
                }
            } else {
                // Standby floating
                c.eng = Math.max(0, c.eng - 0.126 * dt);
                if (c.eng <= 30 && !c.isSleeping) {
                    let bedIdx = beds.indexOf(null);
                    if (bedIdx !== -1) {
                        beds[bedIdx] = c;
                        c.isSleeping = true;
                        c.sleepTimer = sleepTime + transitTotal;
                    }
                }
            }
        }

        // Stations calculation
        const getOccupantTier = (stId) => {
            let occ = crew.find(c => c.station === stId);
            if (!occ) return 'UNMANNED';
            if (occ.primary === stId) return 'CORE';
            return reliefTier;
        };

        const pwrTier = getOccupantTier('reactor');
        const o2Tier = getOccupantTier('o2bay');
        const hydroTier = getOccupantTier('hydroponics');

        pwr = Math.max(0, pwr - DRAIN_RATES.POWER[pwrTier] * dt);
        o2 = Math.max(0, o2 - DRAIN_RATES.LIFE_SUPPORT[o2Tier] * dt);
        food = Math.max(0, food - DRAIN_RATES.LIFE_SUPPORT[hydroTier] * dt);
    }

    // Crisis penalty over voyage: 2 ambient crises, ~7s duration at +0.25%/s drain = ~3.5% drop
    const crisisPenalty = crisesCount * 7 * 0.25;
    pwr = Math.max(0, pwr - crisisPenalty);
    o2 = Math.max(0, o2 - crisisPenalty);
    food = Math.max(0, food - crisisPenalty);

    return {
        name: scenarioName,
        reliefTier,
        clockTime: clockTime.toFixed(1),
        pwr: pwr.toFixed(1),
        o2: o2.toFixed(1),
        food: food.toFixed(1)
    };
}

console.log("--- 3. EMPIRICAL VOYAGE SIMULATION RESULTS (400s FLIGHT, 2 CRISES INCLUDED) ---");

const scenarios = [
    runSimulation("Tier 1: Expert Play (Adjacent Relief Floaters)", "ADJACENT"),
    runSimulation("Tier 2: Competent Play (Stretch Relief Floaters)", "STRETCH"),
    runSimulation("Tier 3: Scrambled Roster (Mismatched Relief Floaters)", "MISMATCHED"),
    runSimulation("Tier 4: Vacant Stations While Sleeping (Zero Relief Coverage)", "VACANT")
];

for (let s of scenarios) {
    console.log(`\n• ${s.name}`);
    console.log(`  Voyage Clock Time: ${s.clockTime}s (Exact 400.0s / 06:40)`);
    console.log(`  Power Remaining   : ${s.pwr}%`);
    console.log(`  O2 Saturation     : ${s.o2}%`);
    console.log(`  Food Reserves     : ${s.food}%`);
    const lowest = Math.min(parseFloat(s.pwr), parseFloat(s.o2), parseFloat(s.food));
    let status = lowest >= 25 ? "HEALTHY COMFORTABLE MARGIN" : (lowest >= 15 ? "BALANCED SURVIVAL" : (lowest > 0 ? "RAZOR THIN EMERGENCY" : "FAILURE"));
    console.log(`  Status Assessment : ${status}`);
}

console.log("\n================================================================================");
