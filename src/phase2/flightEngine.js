/**
 * FLIGHTENGINE.JS — Core Flight Simulation, Time Controls & Vitals Engine
 * Starship Ark — Phase II: Flight Operations (Step 3)
 */

const STATION_HAZARDS = {
    reactor: {
        id: 'hazard_reactor_coolant',
        stationId: 'reactor',
        stationName: 'Reactor Core',
        title: 'REACTOR: COOLANT LEAK',
        tag: 'PWR',
        description: 'Coolant pipe is leaking. Power is draining quickly.',
        resolveWorkRequired: 7.0, // 7s base work
        impactType: 'resource_drain',
        resource: 'power',
        penaltyPerSec: 0.25, // Extra -0.25%/s power drain
        impactDesc: '-0.25%/s Power',
        resolveMessage: 'Coolant leak fixed. Power flow back to normal.'
    },
    o2bay: {
        id: 'hazard_o2_scrubber',
        stationId: 'o2bay',
        stationName: 'Life Support / O2 Bay',
        title: 'O2 BAY: SCRUBBER CONTAMINATION',
        tag: 'O2',
        description: 'Air filter is clogged. Oxygen levels are dropping fast.',
        resolveWorkRequired: 7.0,
        impactType: 'resource_drain',
        resource: 'o2',
        penaltyPerSec: 0.30, // Extra -0.30%/s O2 drain
        impactDesc: '-0.30%/s Oxygen',
        resolveMessage: 'Air filter cleaned. Oxygen levels stabilized.'
    },
    hydroponics: {
        id: 'hazard_hydro_blight',
        stationId: 'hydroponics',
        stationName: 'Hydroponics Bay',
        title: 'HYDROPONICS: BLIGHT SPORE',
        tag: 'BIO',
        description: 'Mold is spreading through crops. Food supplies are spoiling.',
        resolveWorkRequired: 7.0,
        impactType: 'resource_drain',
        resource: 'food',
        penaltyPerSec: 0.20, // Extra -0.20%/s Food decay
        impactDesc: '-0.20%/s Food',
        resolveMessage: 'Crop mold cleared. Food production restored.'
    },
    cockpit: {
        id: 'hazard_cockpit_debris',
        stationId: 'cockpit',
        stationName: 'Flight Deck',
        title: 'COCKPIT: DEBRIS DRIFT',
        tag: 'NAV',
        description: 'Space debris in flight path. Ship is losing time and drifting.',
        resolveWorkRequired: 7.0,
        impactType: 'eta_drift',
        penaltyPerSec: 3.5, // Adds 3.5s to ETA per elapsed second
        impactDesc: '+3.5s to Arrival Time per second',
        resolveMessage: 'Flight path cleared. Ship back on course.'
    }
};

/**
 * TRACK B: REUSABLE PERSONNEL CONDITIONS & INCIDENT REGISTRY (Step 6.2)
 * Modular architecture that supports identity flare-ups, stress breakdowns, and contagion.
 */
const PERSONNEL_CONDITIONS = {
    PANIC_ATTACK: {
        id: 'PANIC_ATTACK',
        name: 'Panic Freeze',
        tag: 'PSY',
        badgeText: 'PANICKED (FROZEN)',
        badgeColor: '#f85149',
        efficiencyMult: 0.0, // Station efficiency completely drops to 0%
        workRateMult: 0.0,   // Cannot repair active station crises
        cureRoom: 'sleepPods',
        cureSecRequired: 10.0, // 10s of resting in sleep pods (or medbay) calms them
        description: 'Panicked from stress. Unable to work or fix issues.'
    },
    CONTAGIOUS_INFECTION: {
        id: 'CONTAGIOUS_INFECTION',
        name: 'Pathogen Contagion',
        tag: 'MED',
        badgeText: 'CONTAGIOUS (SYMPTOMATIC)',
        badgeColor: '#e3b341',
        hpDrainPerSec: 0.35,  // Drains personal health over time
        spreadIntervalSec: 12.0, // Spreads to shared room occupants after 12s exposure
        cureRoom: 'medbay',   // Must be quarantined in Medbay
        cureSecRequired: 18.0, // 18s baseline (12s with Core doctor, 23s with Mismatched attendant)
        description: 'Infectious illness. Spreads to anyone in the same room.'
    },
    PHYSICAL_INJURY: {
        id: 'PHYSICAL_INJURY',
        name: 'Workplace Injury',
        tag: 'MED',
        badgeText: 'INJURED',
        badgeColor: '#e3b341',
        efficiencyMult: 0.50, // 50% efficiency penalty from physical injury
        hpDrainPerSec: 0.35,  // Same health drain as other medical crisis (-0.35 HP/s)
        cureRoom: 'medbay',   // Must be treated in Medbay
        cureSecRequired: 18.0, // Same timings as other medical crisis (18s baseline, 12s Core doctor, 23s Mismatched)
        description: 'Physical workplace injury. Drains health and reduces efficiency until treated in Medbay.'
    }
};

const INJURY_BODY_PARTS = ['wrist', 'ankle', 'shoulder', 'knee', 'arm', 'back'];

const RIDICULOUS_ACCUSATIONS = [
    "tampering with oxygen valves to siphon private air",
    "hoarding emergency chocolate rations in the conduit ducts",
    "secretly broadcasting telemetry to Titan syndicate pirates",
    "wearing boots backwards to erase magnetic footsteps",
    "deliberately over-clocking reactor coils to cook rations",
    "re-routing environmental coolant to chill personal energy drinks"
];

class FlightEngineCore {
    constructor() {
        this.isRunning = false;
        this.speedMultiplier = 0; // Starts in PAUSE mode (0 = pause, 1 = 1x cruise, 2 = 2x cruise)
        this.lastTime = 0;
        this.tickInterval = null;

        // Voyage Progression
        this.totalVoyageSeconds = 400; // 06:40 at 1x speed (6.67 minutes)
        this.elapsedSeconds = 0;
        this.distancePercent = 0;

        // Global Vessel Telemetry (0 - 100 scale, starting fully provisioned at 100%)
        this.telemetry = {
            power: { value: 100, max: 100, kw: 500, label: "Nominal", color: "#388bfd" },
            o2: { value: 100, max: 100, label: "Nominal", color: "#56d364" },
            food: { value: 100, max: 100, rations: 60, maxRations: 60, label: "Plentiful", color: "#e3b341" },
            hull: { value: 100, max: 100, label: "Pressurized", color: "#2ea043" },
            discipline: { value: 100, max: 100, label: "Stable", color: "#a371f7" }
        };

        // Milestone flags to prevent duplicate comms logs
        this.milestones = {
            quarter: false,
            halfway: false,
            threeQuarters: false,
            arrival: false
        };

        this.crew = [];
        this.rationAccumulator = 0;
        this.unmannedTimers = { reactor: 0, o2bay: 0, hydroponics: 0, cockpit: 0 };
        this.activeUnmannedAlerts = { reactor: false, o2bay: false, hydroponics: false, cockpit: false };

        // Station-Specific Crisis Engine State (Step 6 Track A)
        this.activeCrises = {};
        this.crisisDirectorTimer = 75.0; // Seconds until first ambient crisis (calm departure)

        // Personnel Conditions & Incident State (Step 6 Track B)
        this.personnelDirectorTimer = 30.0;
        this.carrierFlareUpTriggered = false;

        // Active Security Searches (Step 6.3)
        this.activeSearches = {};

        // Doomsday Saboteur State (Step 6.2 Track B)
        this.activeSabotage = null;
        this.sabotageTriggered = false;

        // Track C Random Day-to-Day Incidents (Workplace injury, etc.)
        this.activeTrackCIncident = null;
        this.randomEventDirectorTimer = 70.0 + Math.random() * 30.0;

        // Track D Low Discipline Consequence: Crew Friction & Interpersonal Incidents
        this.activeCrewFriction = null;
        this.frictionDirectorTimer = 45.0 + Math.random() * 25.0;
    }

    /**
     * Start the real-time flight simulation
     * @param {Array} crewRoster - Array of recruited officer objects from Phase2Bridge
     */
    start(crewRoster = []) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.crew = crewRoster;
        this.activeSearches = {};
        this.activeSabotage = null;
        this.sabotageTriggered = false;
        this.activeTrackCIncident = null;
        this.activeCrewFriction = null;
        this.crisisDirectorTimer = 75.0;
        this.randomEventDirectorTimer = 70.0 + Math.random() * 30.0;
        this.frictionDirectorTimer = 45.0 + Math.random() * 25.0;
        this.lastTime = performance.now();

        // Pre-calculate initial station telemetry and render HUD gauges at 100%
        this.updateVesselTelemetry(0);
        this.renderHUD();

        // 5Hz high-fidelity simulation tick (every 200ms)
        this.tickInterval = setInterval(() => {
            this.tick();
        }, 200);

        console.log(`[FLIGHT ENGINE] Simulation online in STANDBY / PAUSED mode. Destination: TITAN HAVEN 4. ETA: ${this.formatTime(this.totalVoyageSeconds)}.`);
    }

    stop() {
        this.isRunning = false;
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }

    /**
     * Update time acceleration / pause state
     * @param {String} mode - 'pause', 'cruise', or 'warp'
     */
    setSpeed(mode) {
        this.lastTime = performance.now();
        if (mode === 'pause') {
            this.speedMultiplier = 0;
        } else if (mode === 'cruise') {
            this.speedMultiplier = 1;
        } else if (mode === 'warp') {
            this.speedMultiplier = 2;
        }
        console.log(`[FLIGHT ENGINE] Speed multiplier updated: ${this.speedMultiplier}x (${mode})`);
    }

    /**
     * Main Simulation Tick Loop
     */
    tick() {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.5); // Cap delta time at 500ms
        this.lastTime = now;

        if (!this.isRunning || this.speedMultiplier === 0) {
            return; // Paused or stopped
        }

        const effectiveDt = dt * this.speedMultiplier;

        // 1. Advance Voyage Progress & Distance
        this.updateVoyageProgress(effectiveDt);

        // 2. Process Station Crises & Active Repairs (Step 6)
        this.updateCrises(effectiveDt);

        // 2b. Process Active Sabotage Incident (Step 6.2 Track B)
        this.updateSabotage(effectiveDt);

        // 3. Ambient Crisis Director (Step 6)
        this.updateCrisisDirector(effectiveDt);

        // 3b. Ambient Track C Event Director (Day-to-day random incidents & rogue events)
        this.updateRandomEventDirector(effectiveDt);

        // 3c. Track D: Low Discipline Interpersonal Crew Friction & Infighting Director
        this.updateDisciplineFrictionDirector(effectiveDt);
        this.updateActiveCrewFriction(effectiveDt);

        // 4. Simulate Vessel Resources & Telemetry Decay
        this.updateVesselTelemetry(effectiveDt);

        // 5. Simulate Crew Metabolism, Energy & Vitals
        this.updateCrewVitals(effectiveDt);

        // 6. Simulate Active Security Searches (Step 6.3)
        this.updateSecuritySearches(effectiveDt);

        // 7. Update Tactical HUD & Gauges
        this.renderHUD();
    }

    /**
     * Determine an officer's qualification tier for a given room ('Core', 'Adjacent', 'Stretch', or 'Mismatched')
     */
    getOfficerStationTier(officer, roomId) {
        if (!officer) return "Mismatched";

        const stationMap = {
            cockpit: "Cockpit",
            reactor: "Reactor",
            workshop: "Reactor",
            o2bay: "O2 Bay",
            hydroponics: "Hydroponics",
            medbay: "Medbay",
            brig: "Brig"
        };

        const targetStation = stationMap[roomId] || roomId;
        const normalizeStation = s => (s || '').toLowerCase().replace(/^(the\s*)/, '').replace(/\s+/g, '');
        const normalizedTarget = normalizeStation(targetStation);

        // 1. Check station affinities map (supports multi-specialty / cross-station disciplines)
        if (officer.stationAffinities && typeof officer.stationAffinities === 'object') {
            for (const [key, tier] of Object.entries(officer.stationAffinities)) {
                if (normalizeStation(key) === normalizedTarget) {
                    return tier;
                }
            }
        }

        // 2. Check primary designated station
        if (officer.station) {
            const normalizedPrimary = normalizeStation(officer.station);
            if (normalizedPrimary === normalizedTarget) {
                return officer.roleTier || "Core";
            }
        }

        return "Mismatched";
    }

    /**
     * Calculate individual officer efficiency (0.0 to 1.0+) for a given room
     */
    getOfficerStationEfficiency(officer, roomId) {
        if (!officer) return 0;

        // Personnel Conditions (Step 6.2 Track B)
        if (this.hasCondition(officer, 'PANIC_ATTACK')) {
            return 0.0; // Completely paralyzed at console
        }

        const stationMap = {
            cockpit: "Cockpit",
            reactor: "Reactor",
            workshop: "Reactor",
            o2bay: "O2 Bay",
            hydroponics: "Hydroponics",
            medbay: "Medbay",
            brig: "Brig"
        };

        const stationName = stationMap[roomId];
        if (!stationName) return 1.0; // Unmonitored / sleep pods

        // 1. Qualification Base Multiplier
        const tier = this.getOfficerStationTier(officer, roomId);
        let baseTierMult = 0.40; // Default Mismatched (40% output)
        if (tier === "Core") baseTierMult = 1.00;
        else if (tier === "Adjacent") baseTierMult = 0.85;
        else if (tier === "Stretch") baseTierMult = 0.70;

        // 2. Fatigue Multiplier
        // Well-Rested (70-100% Stamina): 100%
        // Fatigued (30-69% Stamina): 80%
        // Exhausted (0-29% Stamina): 50%
        let fatigueMult = 1.00;
        if (officer.eng < 30) {
            fatigueMult = 0.50;
        } else if (officer.eng < 70) {
            fatigueMult = 0.80;
        }

        // 3. Hidden Identity Multipliers (from screening)
        let identityMult = 1.00;
        if (officer.trueIdentity === "DESPERATE_FRAUD") {
            identityMult = 0.60;
        } else if (officer.trueIdentity === "CONTAGIOUS_CARRIER") {
            identityMult = 0.80;
        }

        // 4. Physical Injury Multiplier (Track C)
        let conditionMult = 1.00;
        if (this.hasCondition(officer, 'PHYSICAL_INJURY')) {
            conditionMult = 0.50; // 50% efficiency penalty from injury
        }

        // 5. Interpersonal Crew Friction Multiplier (Track D)
        let frictionMult = 1.00;
        if (this.activeCrewFriction) {
            const f = this.activeCrewFriction;
            if (f.type === 'HEATED_ARGUMENT' || f.type === 'PHYSICAL_BRAWL') {
                if (officer.name === f.officerA || officer.name === f.officerB) {
                    return 0.0; // Completely halted by active argument or brawl
                }
            } else if (f.type === 'PARANOID_ACCUSATION') {
                if (officer.name === f.officerA) {
                    frictionMult = 0.20; // Accuser efficiency reduced to 20%
                }
            }
        }

        return baseTierMult * fatigueMult * identityMult * conditionMult * frictionMult;
    }

    /**
     * Calculate crew metabolic factor based on body weight for Food and O2
     * Baseline: 185 lbs average weight with 0.85 scaling factor to ease consumption.
     * Heavier crew consumes slightly more, lighter consumes less.
     */
    getMetabolicWeightFactor() {
        if (!this.crew || this.crew.length === 0) return 0.85;
        const livingCrew = this.crew.filter(c => !c.isDead && c.status !== 'DECEASED');
        const commanderWeight = 175; // Player commander reference weight
        const totalCrewWeight = livingCrew.reduce((sum, c) => sum + (c.weightLbs || 185), 0) + commanderWeight;
        const totalPersons = livingCrew.length + 1;
        const avgWeight = totalCrewWeight / totalPersons;
        return Number((0.85 * (avgWeight / 185)).toFixed(3));
    }

    /**
     * Calculate station net consumption drain rate (%/sec)
     * Calibrated middle ground for a 400s (06:40) voyage:
     * - Unmanned: 0.32%/sec (drains 32% in 100s, total failure in ~312s)
     * - Single Mismatched (40% eff): ~0.250%/sec (buffer ~70s relief margin)
     * - Single Stretch (70% eff): ~0.198%/sec (buffer ~11% over flight)
     * - Single Adjacent (85% eff): ~0.171%/sec (buffer ~23% over flight)
     * - Single Core (100% eff): ~0.145%/sec (optimal single officer, ~35% buffer)
     * - Flextime Stacking (2 crew, 1.6 eff): ~0.105%/sec (stacking advantage, ~53% buffer)
     */
    getStationDrainRate(roomId) {
        const occupants = this.crew.filter(c => c.currentRoom === roomId && c.transitRemaining <= 0);

        if (occupants.length === 0) {
            return {
                drainRate: 0.32, // -0.32% / sec unmanned
                status: "UNMANNED",
                combinedEff: 0,
                occupantCount: 0
            };
        }

        const effs = occupants.map(o => this.getOfficerStationEfficiency(o, roomId)).sort((a, b) => b - a);
        const eff1 = effs[0] || 0;
        const eff2 = effs[1] || 0;

        // Flextime Stacking: 2nd officer cross-checks and contributes 60% of their efficiency
        const combinedEff = eff1 + (eff2 * 0.6);

        // Continuous drain curve ensuring more/better crew always strictly reduces drain:
        let drainRate = 0.32 - 0.175 * Math.min(1.0, combinedEff) - 0.040 * (Math.max(0, Math.min(0.6, combinedEff - 1.0)) / 0.6);
        drainRate = Math.max(0.105, Math.min(0.32, drainRate));

        let status = "OPTIMAL";
        if (occupants.length >= 2) {
            status = "STACKED";
        } else {
            const tier = this.getOfficerStationTier(occupants[0], roomId);
            if (tier === "Core") {
                status = "OPTIMAL";
            } else if (tier === "Adjacent" || tier === "Stretch") {
                status = "OKAY";
            } else {
                status = "DEFICIT";
            }
        }

        return {
            drainRate: Number(drainRate.toFixed(3)),
            status: status,
            combinedEff: Number(combinedEff.toFixed(2)),
            occupantCount: occupants.length
        };
    }

    checkUnmannedStationAlerts(dt) {
        if (this.speedMultiplier === 0) return; // Do not alert while simulation is paused

        const criticalStations = [
            { id: 'reactor', name: 'Reactor Core', tag: 'PWR', res: 'Power Grid' },
            { id: 'o2bay', name: 'Life Support / O2 Bay', tag: 'O2', res: 'Oxygen Reserves' },
            { id: 'hydroponics', name: 'Hydroponics Bay', tag: 'BIO', res: 'Food Stores' },
            { id: 'cockpit', name: 'Flight Deck', tag: 'NAV', res: 'Navigation & Helm Vector' }
        ];

        criticalStations.forEach(st => {
            // If station is actively suffering a crisis, suppress generic unmanned alert card (crisis card handles it)
            if (this.activeCrises && this.activeCrises[st.id]) {
                if (this.activeUnmannedAlerts[st.id]) {
                    this.activeUnmannedAlerts[st.id] = false;
                    if (window.Phase2Bridge && window.Phase2Bridge.dismissAlert) {
                        window.Phase2Bridge.dismissAlert(`unmanned-${st.id}`, false);
                    }
                }
                this.unmannedTimers[st.id] = 0;
                return;
            }

            const occupants = this.crew.filter(c => c.currentRoom === st.id && c.transitRemaining <= 0);
            if (occupants.length === 0) {
                this.unmannedTimers[st.id] = (this.unmannedTimers[st.id] || 0) + dt;
                // Emit warning card at 25 seconds unmanned during active flight
                if (this.unmannedTimers[st.id] >= 25 && !this.activeUnmannedAlerts[st.id]) {
                    this.activeUnmannedAlerts[st.id] = true;
                    if (window.Phase2Bridge && window.Phase2Bridge.pushAlert) {
                        window.Phase2Bridge.pushAlert({
                            id: `unmanned-${st.id}`,
                            type: 'warning',
                            tag: st.tag,
                            title: `${st.name.toUpperCase()} UNMANNED`,
                            message: `${st.res} bleeding at maximum rate (-0.32%/s). Station an officer to stabilize.`,
                            targetRoom: st.id,
                            actionLabel: `TARGET ${st.name.toUpperCase()}`
                        });
                    }
                }
            } else {
                if (this.activeUnmannedAlerts[st.id]) {
                    this.activeUnmannedAlerts[st.id] = false;
                    if (window.Phase2Bridge && window.Phase2Bridge.dismissAlert) {
                        window.Phase2Bridge.dismissAlert(`unmanned-${st.id}`, false);
                    }
                }
                this.unmannedTimers[st.id] = 0;
            }
        });
    }

    updateVoyageProgress(dt) {
        if (this.distancePercent >= 100) return;

        // Advance voyage progression 1:1 with simulation delta time (1s per real sec at 1x cruise, 2s at 2x warp)
        this.elapsedSeconds += dt;
        this.distancePercent = Math.min(100, (this.elapsedSeconds / this.totalVoyageSeconds) * 100);

        // Milestone Comms Announcements
        if (this.distancePercent >= 25 && !this.milestones.quarter) {
            this.milestones.quarter = true;
            this.logComms("Trans-Martian trajectory locked. Outer gate clear.", "normal", "NAV");
        }
        if (this.distancePercent >= 50 && !this.milestones.halfway) {
            this.milestones.halfway = true;
            this.logComms("Halfway checkpoint reached. Long-range telemetry confirms Haven beacon active.", "normal", "ASTRO");
        }
        if (this.distancePercent >= 75 && !this.milestones.threeQuarters) {
            this.milestones.threeQuarters = true;
            this.logComms("Saturnian gravity-assist corridor established. Vector nominal.", "normal", "NAV");
        }
        if (this.distancePercent >= 100 && !this.milestones.arrival) {
            this.milestones.arrival = true;
            this.onArrival();
        }
    }

    updateVesselTelemetry(dt) {
        const t = this.telemetry;

        // 1. Reactor Bay -> Power Grid (10% drain reduction)
        const reactorMetrics = this.getStationDrainRate('reactor');
        let pwrDrain = Number((reactorMetrics.drainRate * 0.90).toFixed(3));
        if (this.activeCrises['reactor']) {
            pwrDrain = Number((pwrDrain + this.activeCrises['reactor'].penaltyPerSec).toFixed(3));
        }
        t.power.drainRate = pwrDrain;
        t.power.status = reactorMetrics.status;
        t.power.value = Math.max(0, Math.min(100, t.power.value - (pwrDrain * dt)));
        t.power.kw = Math.round(t.power.value * 5);
        if (t.power.value >= 75) t.power.label = "Nominal";
        else if (t.power.value >= 40) t.power.label = "Strained";
        else if (t.power.value >= 20) t.power.label = "Low Power";
        else t.power.label = "BROWNOUT RISK";

        // Calculate living crew count (including player commander) for consumption scaling ("mouths to feed")
        const livingCrewCount = (this.crew || []).filter(c => !c.isDead && c.status !== 'DECEASED').length + 1;
        const crewRationRatio = Number((livingCrewCount / 7).toFixed(3));
        const weightFactor = this.getMetabolicWeightFactor();

        // 2. Life Support / O2 Bay -> Oxygen Saturation (scaled by weight & living breathers, eased calculation)
        const o2Metrics = this.getStationDrainRate('o2bay');
        let o2Drain = Number((o2Metrics.drainRate * weightFactor * crewRationRatio).toFixed(3));
        if (this.activeCrises['o2bay']) {
            o2Drain = Number((o2Drain + this.activeCrises['o2bay'].penaltyPerSec).toFixed(3));
        }
        t.o2.drainRate = o2Drain;
        t.o2.status = o2Metrics.status;
        t.o2.weightFactor = weightFactor;
        t.o2.crewRationRatio = crewRationRatio;
        t.o2.value = Math.max(0, Math.min(100, t.o2.value - (o2Drain * dt)));
        if (t.o2.value >= 85) t.o2.label = "Nominal";
        else if (t.o2.value >= 60) t.o2.label = "Degraded";
        else if (t.o2.value >= 30) t.o2.label = "Low O2 Alert";
        else t.o2.label = "CRITICAL HYPOXIA";

        // Hypoxia health penalty on crew if O2 is low (<35%)
        if (t.o2.value < 35 && this.crew.length > 0) {
            const hypoxiaDrain = (35 - t.o2.value) * 0.03 * dt;
            this.crew.forEach(c => {
                c.hp = Math.max(0, c.hp - hypoxiaDrain);
            });
        }

        // 3. Hydroponics Bay -> Food Reserves (Weighted by Crew Mass, Hydroponics Staffing, & Living Crew Count)
        const hydroMetrics = this.getStationDrainRate('hydroponics');
        let effectiveFoodDrain = Number((hydroMetrics.drainRate * weightFactor * crewRationRatio).toFixed(3));
        if (this.activeCrises['hydroponics']) {
            effectiveFoodDrain = Number((effectiveFoodDrain + this.activeCrises['hydroponics'].penaltyPerSec).toFixed(3));
        }
        t.food.drainRate = effectiveFoodDrain;
        t.food.status = hydroMetrics.status;
        t.food.weightFactor = weightFactor;
        t.food.crewRationRatio = crewRationRatio;
        t.food.value = Math.max(0, Math.min(100, t.food.value - (effectiveFoodDrain * dt)));
        t.food.rations = Math.round((t.food.value / 100) * t.food.maxRations);
        if (t.food.value >= 75) t.food.label = "Plentiful";
        else if (t.food.value >= 40) t.food.label = "Rationed";
        else if (t.food.value >= 15) t.food.label = "Depleted";
        else t.food.label = "STARVATION";

        // 4. Flight Deck / Cockpit Navigation & Hull Integrity
        const cockpitMetrics = this.getStationDrainRate('cockpit');
        t.cockpitMetrics = cockpitMetrics;
        t.hull.drainRate = 0.00;
        if (t.hull.value === undefined) t.hull.value = 100;
        if (t.hull.value >= 85) t.hull.label = "Pressurized";
        else if (t.hull.value >= 50) t.hull.label = "COMPROMISED";
        else t.hull.label = "BREACHED";

        // 5. The Brig -> Crew Discipline & Sanity Protection
        const activeGuards = this.crew.filter(c => 
            !c.isDead && 
            c.status !== 'DECEASED' && 
            c.currentRoom === 'brig' && 
            c.transitRemaining <= 0 && 
            !c.isDetained && 
            !this.hasCondition(c, 'PANIC_ATTACK')
        );
        const hasSecurityGuard = activeGuards.length > 0;
        this.hasSecurityGuard = hasSecurityGuard;

        if (hasSecurityGuard) {
            // Brig manned by active guard: discipline recovers at +1.0%/s
            t.discipline.value = Math.min(100, t.discipline.value + (1.0 * dt));
            t.discipline.rate = 1.0;
        } else {
            // Unmanned Brig: discipline drains 35% faster at -0.135%/s (scaled from base -0.10%/s)
            t.discipline.value = Math.max(0, t.discipline.value - (0.135 * dt));
            t.discipline.rate = -0.135;
        }
        if (t.discipline.value >= 80) t.discipline.label = "Enforced";
        else if (t.discipline.value >= 50) t.discipline.label = "Tense";
        else t.discipline.label = "MUTINOUS PANIC";

        // 6. Check unmanned station alert timers
        this.checkUnmannedStationAlerts(dt);
    }

    updateCrewVitals(dt) {
        let hasActiveTransit = false;

        this.crew.forEach((officer, idx) => {
            // Skip processing for deceased crew
            if (officer.isDead || officer.status === 'DECEASED') {
                return;
            }

            // Decrement composure & post-crisis cooldowns
            if (officer.panicCooldown > 0) {
                officer.panicCooldown = Math.max(0, officer.panicCooldown - dt);
            }
            if (officer.crisisCooldown > 0) {
                officer.crisisCooldown = Math.max(0, officer.crisisCooldown - dt);
            }
            if (officer.frictionCooldown > 0) {
                officer.frictionCooldown = Math.max(0, officer.frictionCooldown - dt);
            }

            // 1. Process En Route Transit Timer
            if (officer.transitRemaining > 0) {
                hasActiveTransit = true;
                officer.transitRemaining = Math.max(0, officer.transitRemaining - dt);
                if (officer.transitRemaining > 0) {
                    officer.status = `TRANSIT (${Math.ceil(officer.transitRemaining)}s)`;
                    this.updateOfficerCard(idx, officer);
                } else {
                    // Transit Completed!
                    officer.currentRoom = officer.transitTarget;
                    officer.transitTarget = null;
                    officer.transitRemaining = 0;
                    officer.previousRoom = null;

                    const comp = (window.Phase2Bridge && window.Phase2Bridge.compartments) ? window.Phase2Bridge.compartments[officer.currentRoom] : null;

                    if (officer.currentRoom === 'sleepPods') {
                        officer.status = 'RESTING IN QUARTERS';
                        this.logComms(`${officer.name} arrived at Sleep Pods. Commencing rest & stamina cycle.`, "normal", "MED");
                    } else if (officer.currentRoom === 'brig' && this.activeSearches && this.activeSearches[officer.name]) {
                        officer.status = 'SECURITY AUDIT';
                        this.logComms(`${officer.name} arrived at The Brig. Security search initiated by guard.`, "normal", "SEC");
                    } else {
                        const metrics = this.getStationDrainRate(officer.currentRoom);
                        officer.status = `ASSIGNED: ${comp ? comp.name.toUpperCase() : 'DUTY'}`;
                        const rateText = `-${metrics.drainRate}%/s`;
                        this.logComms(`${officer.name} arrived at ${comp ? comp.name : 'Station'}. Station operational. Output: ${rateText} (${metrics.status}).`, "normal", comp ? comp.tag : "SYS");
                    }

                    this.updateOfficerCard(idx, officer);
                    if (window.Phase2Bridge) {
                        window.Phase2Bridge.renderRoomOccupants();
                    }

                    // Immediately re-sync crisis card if room is currently under hazard
                    if (this.activeCrises && this.activeCrises[officer.currentRoom]) {
                        this.syncCrisisCard(this.activeCrises[officer.currentRoom]);
                    }
                }
            }

            // 2. Station-Specific Metabolism & Recovery
            if (officer.currentRoom === 'sleepPods' || officer.status === 'RESTING IN QUARTERS') {
                // Sleep Pod: rapid stamina restoration (full 30% -> 100% recovery in 20s)
                officer.eng = Math.min(100, officer.eng + (3.5 * dt));

                if (officer.eng >= 100 && officer.status === 'RESTING IN QUARTERS') {
                    officer.status = 'RESTED (READY)';
                    this.updateOfficerCard(idx, officer);
                }
            } else if (officer.currentRoom === 'brig' && officer.isDetained) {
                // Brig detention: solitary / protective custody for detained prisoner
                officer.status = 'DETAINED (BRIG)';
                // Detained prisoner experiences light standby drain, not strenuous duty
                officer.eng = Math.max(0, officer.eng - (0.126 * dt));
            } else {
                // Active crew: Medbay, Corridors, Assigned Stations, Standby
                if (officer.currentRoom === 'medbay') {
                    // Medbay: health recovery and slow energy drain
                    // If afflicted with contagion or physical injury, recovery only proceeds if another attendant is present in Medbay
                    const hasMedicalCondition = this.hasCondition(officer, 'CONTAGIOUS_INFECTION') || this.hasCondition(officer, 'PHYSICAL_INJURY');
                    const medbayCrew = this.crew.filter(c => !c.isDead && c.currentRoom === 'medbay' && c.transitRemaining <= 0);
                    const activeAttendants = medbayCrew.filter(c => c !== officer && !this.hasCondition(c, 'PANIC_ATTACK'));
                    const hasAttendant = activeAttendants.length > 0;

                    if (!hasMedicalCondition || hasAttendant) {
                        const hasDoctor = medbayCrew.some(c => this.getOfficerStationTier(c, 'medbay') === 'Core');
                        const hpRegenRate = hasDoctor ? 2.2 : 1.5;
                        officer.hp = Math.min(100, officer.hp + (hpRegenRate * dt));
                    }
                    officer.eng = Math.max(0, officer.eng - (0.09 * dt));
                } else if (officer.transitRemaining > 0) {
                    // In transit through corridors: light stamina drain
                    officer.eng = Math.max(0, officer.eng - (0.09 * dt));
                } else {
                    // On active station duty or unassigned: duty stamina drain calibrated for manageable rotation (10% lower: 0.315 duty, 0.126 standby)
                    const drainRate = officer.currentRoom ? 0.315 : 0.126;
                    officer.eng = Math.max(0, officer.eng - (drainRate * dt));

                    // Fatigue and Exhaustion logic
                    if (officer.eng === 0) {
                        // Total exhaustion: begins degrading physical health
                        officer.hp = Math.max(0, officer.hp - (0.2 * dt));
                        if (officer.hp <= 0) {
                            this.killOfficer(officer, idx, 'Fatal exhaustion collapse');
                            return;
                        }
                        if (officer.status !== 'EXHAUSTED') {
                            officer.status = 'EXHAUSTED';
                            this.updateOfficerCard(idx, officer);
                            this.logComms(`${officer.name} has collapsed from physical exhaustion! Rotate to Sleep Pods to rest.`, "normal", "MED");
                        }
                    } else if (officer.eng < 30 && officer.status && officer.status.startsWith('ASSIGNED') && !officer.status.includes('EXHAUSTED')) {
                        // Officer working while exhausted
                    } else if (officer.eng < 25 && (!officer.status || officer.status === 'UNASSIGNED')) {
                        officer.status = 'FATIGUED';
                        this.updateOfficerCard(idx, officer);
                    } else if (officer.eng >= 30 && officer.status === 'FATIGUED') {
                        officer.status = 'UNASSIGNED';
                        this.updateOfficerCard(idx, officer);
                    }
                }
            }

            // General health fatality check
            if (officer.hp <= 0 && !officer.isDead) {
                this.killOfficer(officer, idx, 'Critical trauma / vital failure');
                return;
            }
        });

        // 3. Process Active Personnel Conditions & Trigger Checks (Step 6.2 Track B)
        this.updatePersonnelConditions(dt);
        this.evaluateConditionTriggers(dt);

        // Keep room occupant tags in sync while officers are moving
        if (hasActiveTransit && window.Phase2Bridge) {
            window.Phase2Bridge.renderRoomOccupants();
        }
    }

    renderHUD() {
        // 1. Top ETA & Distance Bar
        const remainingSec = Math.max(0, Math.round(this.totalVoyageSeconds - this.elapsedSeconds));
        const etaEl = document.getElementById('flight-eta-display');
        const progressFill = document.getElementById('flight-progress-fill');

        if (etaEl) {
            etaEl.textContent = `ETA: ${this.formatTime(remainingSec)}`;
        }
        if (progressFill) {
            progressFill.style.width = `${this.distancePercent.toFixed(1)}%`;
        }

        // 2. Telemetry Gauges on Right HUD with Live Drain Rates
        const pwrRate = `[-${this.telemetry.power.drainRate !== undefined ? this.telemetry.power.drainRate.toFixed(2) : '0.04'}%/s]`;
        const o2Rate = `[-${this.telemetry.o2.drainRate !== undefined ? this.telemetry.o2.drainRate.toFixed(2) : '0.04'}%/s]`;
        const foodRate = `[-${this.telemetry.food.drainRate !== undefined ? this.telemetry.food.drainRate.toFixed(2) : '0.04'}%/s]`;

        this.updateGaugeDOM('power', `${Math.round(this.telemetry.power.value)}% (${this.telemetry.power.kw} kW) ${pwrRate}`, this.telemetry.power.value);
        this.updateGaugeDOM('o2', `${Math.round(this.telemetry.o2.value)}% (${this.telemetry.o2.label}) ${o2Rate}`, this.telemetry.o2.value);
        this.updateGaugeDOM('food', `${Math.round(this.telemetry.food.value)}% (${this.telemetry.food.rations} Rations) ${foodRate}`, this.telemetry.food.value);
        this.updateGaugeDOM('hull', `${Math.round(this.telemetry.hull.value)}% (${this.telemetry.hull.label})`, this.telemetry.hull.value);
        const discRateStr = this.telemetry.discipline.rate !== undefined 
            ? `[${this.telemetry.discipline.rate > 0 ? '+' : ''}${this.telemetry.discipline.rate.toFixed(1)}%/s]` 
            : '';
        this.updateGaugeDOM('discipline', `${Math.round(this.telemetry.discipline.value)}% (${this.telemetry.discipline.label}) ${discRateStr}`.trim(), this.telemetry.discipline.value);

        // Update overall vessel status badge
        const statusEl = document.getElementById('flight-telemetry-status');
        if (statusEl) {
            const minResource = Math.min(
                this.telemetry.power.value,
                this.telemetry.o2.value,
                this.telemetry.food.value,
                this.telemetry.hull.value,
                this.telemetry.discipline.value
            );
            if (minResource < 30) {
                statusEl.textContent = 'CRITICAL';
                statusEl.className = 'telemetry-status-badge critical';
            } else if (minResource < 60) {
                statusEl.textContent = 'CAUTION';
                statusEl.className = 'telemetry-status-badge warning';
            } else {
                statusEl.textContent = 'NOMINAL';
                statusEl.className = 'telemetry-status-badge nominal';
            }
        }

        // 3. Mini Crew Vitals in Left Manifest
        this.crew.forEach((officer, idx) => {
            const hpFill = document.getElementById(`vital-hp-fill-${idx}`);
            const engFill = document.getElementById(`vital-eng-fill-${idx}`);
            const hpBox = document.getElementById(`vital-hp-box-${idx}`);
            const engBox = document.getElementById(`vital-eng-box-${idx}`);

            if (hpFill) hpFill.style.width = `${Math.round(officer.hp)}%`;
            if (engFill) engFill.style.width = `${Math.round(officer.eng)}%`;

            if (hpBox) hpBox.title = `Physical Health: ${Math.round(officer.hp)}%`;
            if (engBox) engBox.title = `Stamina: ${Math.round(officer.eng)}%`;

            const hpVal = document.getElementById(`vital-hp-val-${idx}`);
            const engVal = document.getElementById(`vital-eng-val-${idx}`);

            if (hpVal) {
                const val = Math.round(officer.hp);
                hpVal.textContent = val < 10 ? `0${val}` : String(val);
                if (hpVal.classList) {
                    if (val < 35) hpVal.classList.add('vital-blinking');
                    else hpVal.classList.remove('vital-blinking');
                }
            }
            if (engVal) {
                const val = Math.round(officer.eng);
                engVal.textContent = val < 10 ? `0${val}` : String(val);
                if (engVal.classList) {
                    if (val < 35) engVal.classList.add('vital-blinking');
                    else engVal.classList.remove('vital-blinking');
                }
            }
        });
    }

    updateGaugeDOM(key, textVal, percent) {
        const txtEl = document.getElementById(`gauge-txt-${key}`);
        const barEl = document.getElementById(`gauge-bar-${key}`);

        if (txtEl) {
            txtEl.textContent = textVal;
            if (percent < 30) txtEl.style.color = '#c85a53'; // Critical Red
            else if (percent < 60) txtEl.style.color = '#cf9f54'; // Warning Amber
            else txtEl.style.color = ''; // Reset to class styling
        }
        if (barEl) {
            barEl.style.width = `${Math.max(0, Math.min(100, percent))}%`;
            if (percent < 30) barEl.style.background = '#c85a53';
            else if (percent < 60) barEl.style.background = '#cf9f54';
            else barEl.style.background = ''; // Reset to class styling
        }
    }

    updateOfficerCard(idx, officer) {
        const badge = document.getElementById(`officer-status-badge-${idx}`);
        if (!badge) return;

        const unassignBtn = document.getElementById(`btn-unassign-${idx}`);
        if (unassignBtn) {
            unassignBtn.style.display = (!officer.isDead && (officer.currentRoom || officer.transitTarget)) ? 'inline-block' : 'none';
        }

        // Priority 0: Deceased Crew
        if (officer.isDead || officer.status === 'DECEASED') {
            badge.textContent = 'DECEASED';
            badge.style.color = '#f85149';
            badge.style.fontWeight = '700';
            badge.style.letterSpacing = '0.5px';
            const card = document.getElementById(`officer-card-${idx}`);
            if (card) {
                card.classList.add('crew-card-deceased');
                card.onclick = null;
                card.style.cursor = 'default';
            }
            if (unassignBtn) unassignBtn.style.display = 'none';
            return;
        }

        // Priority 1: In Transit through corridors
        if (officer.status && officer.status.startsWith('TRANSIT')) {
            badge.textContent = officer.status;
            badge.style.color = '#f0883e';
            badge.style.fontWeight = '600';
            badge.style.letterSpacing = 'normal';
            return;
        }

        // Priority 2: Personnel Conditions (Step 6.2 Track B)
        if (this.hasCondition(officer, 'PANIC_ATTACK')) {
            badge.textContent = 'PANICKED (FROZEN)';
            badge.style.color = '#f85149';
            badge.style.fontWeight = '700';
            badge.style.letterSpacing = '0.5px';
            return;
        }

        if (this.hasCondition(officer, 'CONTAGIOUS_INFECTION')) {
            badge.textContent = 'CONTAGIOUS (SYMPTOMATIC)';
            badge.style.color = '#e3b341';
            badge.style.fontWeight = '700';
            badge.style.letterSpacing = '0.5px';
            return;
        }

        if (this.hasCondition(officer, 'PHYSICAL_INJURY')) {
            const cond = officer.conditions['PHYSICAL_INJURY'];
            const part = cond && cond.bodyPart ? cond.bodyPart.toUpperCase() : 'SPRAIN';
            badge.textContent = `INJURED (${part})`;
            badge.style.color = '#e3b341';
            badge.style.fontWeight = '700';
            badge.style.letterSpacing = '0.5px';
            return;
        }

        // Priority 3: Routine Vessel Statuses
        let displayStatus = officer.status || (officer.currentRoom ? `ASSIGNED: ${officer.currentRoom.toUpperCase()}` : 'UNASSIGNED');
        if (displayStatus && displayStatus.startsWith('ASSIGNED: ')) {
            displayStatus = displayStatus.replace(/^ASSIGNED:\s*/, '');
        }
        badge.textContent = displayStatus;
        if (!officer.status || officer.status === 'UNASSIGNED') {
            badge.style.color = '#ff3333';
            badge.style.fontWeight = '700';
            badge.style.letterSpacing = '0.5px';
        } else if (officer.status.startsWith('ASSIGNED')) {
            badge.style.color = '#38bdf8';
            badge.style.fontWeight = '500';
            badge.style.letterSpacing = 'normal';
        } else if (officer.status === 'EXHAUSTED') {
            badge.style.color = '#f85149';
            badge.style.fontWeight = '600';
            badge.style.letterSpacing = 'normal';
        } else if (officer.status === 'FATIGUED') {
            badge.style.color = '#d29922';
            badge.style.fontWeight = '500';
            badge.style.letterSpacing = 'normal';
        } else if (officer.status === 'RESTING IN QUARTERS') {
            badge.style.color = '#58a6ff';
            badge.style.fontWeight = '500';
            badge.style.letterSpacing = 'normal';
        } else if (officer.status === 'RESTED (READY)') {
            badge.style.color = '#3fb950';
            badge.style.fontWeight = '600';
            badge.style.letterSpacing = 'normal';
        } else if (officer.status === 'SECURITY AUDIT') {
            badge.textContent = 'SECURITY AUDIT';
            badge.style.color = '#d29922';
            badge.style.fontWeight = '700';
            badge.style.letterSpacing = '0.5px';
        } else if (officer.isDetained || (officer.status && officer.status.startsWith('DETAINED'))) {
            badge.textContent = officer.status || 'DETAINED (BRIG)';
            badge.style.color = '#d29922';
            badge.style.fontWeight = '700';
            badge.style.letterSpacing = '0.5px';
        } else {
            badge.style.color = '#8b949e';
            badge.style.fontWeight = '500';
            badge.style.letterSpacing = 'normal';
        }
    }

    onArrival() {
        this.logComms("=========================================================", "cmd-echo", "HELM");
        this.logComms("ORBITAL INSERTION CONFIRMED: ARRIVED AT TITAN HAVEN 4!", "normal", "HELM");
        this.logComms("Atmospheric docking corridor open. All survival quotas satisfied.", "normal", "SYS");
        this.logComms("=========================================================", "cmd-echo", "HELM");

        if (window.Phase2Bridge && window.Phase2Bridge.setSpeed) {
            window.Phase2Bridge.setSpeed('pause');
        }
    }

    logComms(msg, type = "normal", sender = "SYS") {
        if (window.Phase2Bridge && window.Phase2Bridge.logEvent) {
            window.Phase2Bridge.logEvent(msg, type, sender);
        }
    }

    formatTime(totalSec) {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    /**
     * =========================================================================
     * STEP 6: STATION-SPECIFIC CRISIS & EVENT ENGINE
     * =========================================================================
     */

    /**
     * Calculate effective crisis resolution work rate (work units / second)
     * Core: 1.00 work/s (7.0s base)
     * Adjacent: 0.78 work/s (~9.0s)
     * Stretch: 0.64 work/s (~10.9s)
     * Mismatched: 0.50 work/s (14.0s)
     * Flextime Stacking: 2nd officer contributes +40% of their tier work rate
     */
    getCrisisWorkRate(stationId) {
        const occupants = this.crew.filter(c => c.currentRoom === stationId && c.transitRemaining <= 0);
        if (occupants.length === 0) {
            return { rate: 0, primaryOfficer: null, tier: 'UNMANNED', count: 0, secondaryOfficer: null, isPanicked: false };
        }

        const tierRates = {
            Core: 1.00,      // 7.0s base
            Adjacent: 0.78,  // ~9.0s
            Stretch: 0.64,   // ~10.9s
            Mismatched: 0.50 // 14.0s
        };

        const ratedOccupants = occupants.map(o => {
            const isPanicked = this.hasCondition(o, 'PANIC_ATTACK');
            const isInjured = this.hasCondition(o, 'PHYSICAL_INJURY');
            const tier = this.getOfficerStationTier(o, stationId);
            let rate = tierRates[tier] || 0.50;
            if (isPanicked) {
                rate = 0.0;
            } else if (isInjured) {
                rate *= 0.50; // 50% crisis repair work penalty from physical injury
            }

            if (this.activeCrewFriction) {
                const f = this.activeCrewFriction;
                if ((f.type === 'HEATED_ARGUMENT' || f.type === 'PHYSICAL_BRAWL') && (o.name === f.officerA || o.name === f.officerB)) {
                    rate = 0.0;
                } else if (f.type === 'PARANOID_ACCUSATION' && o.name === f.officerA) {
                    rate *= 0.20;
                }
            }
            return { officer: o, tier, rate, isPanicked };
        }).sort((a, b) => b.rate - a.rate);

        const primary = ratedOccupants[0];
        let totalRate = primary.rate;

        // Flextime stacking: 2nd officer adds +40% of their work rate
        if (ratedOccupants.length > 1) {
            totalRate += ratedOccupants[1].rate * 0.40;
        }

        const allPanicked = occupants.length > 0 && ratedOccupants.every(r => r.isPanicked);

        return {
            rate: Number(totalRate.toFixed(3)),
            primaryOfficer: primary.officer,
            tier: primary.tier,
            count: occupants.length,
            secondaryOfficer: ratedOccupants[1] ? ratedOccupants[1].officer : null,
            isPanicked: allPanicked
        };
    }

    /**
     * Advance resolution work and apply active crisis penalties
     */
    updateCrises(dt) {
        if (this.speedMultiplier === 0) return;

        for (const [stationId, crisis] of Object.entries(this.activeCrises)) {
            const workInfo = this.getCrisisWorkRate(stationId);
            crisis.currentWorkRate = workInfo.rate;
            crisis.primaryOfficer = workInfo.primaryOfficer;
            crisis.officerTier = workInfo.tier;
            crisis.occupantCount = workInfo.count;
            crisis.isPanicked = workInfo.isPanicked;

            // Cockpit Debris Penalty: adds +3.5s directly to voyage ETA per second unresolved
            if (crisis.impactType === 'eta_drift') {
                this.totalVoyageSeconds += crisis.penaltyPerSec * dt;
            }

            // Progress repairs if station is manned
            if (workInfo.rate > 0) {
                crisis.workRemaining = Math.max(0, crisis.workRemaining - (workInfo.rate * dt));
                if (crisis.workRemaining <= 0) {
                    this.resolveCrisis(stationId);
                    continue;
                }
            }

            // Update live alert card & room highlight
            this.syncCrisisCard(crisis);
        }
    }

    /**
     * Push or update live tactical alert card and room hazard glow
     */
    syncCrisisCard(crisis) {
        if (!window.Phase2Bridge || !window.Phase2Bridge.pushAlert) return;

        const progressPercent = Math.max(0, Math.min(100, Math.round(((crisis.resolveWorkRequired - crisis.workRemaining) / crisis.resolveWorkRequired) * 100)));

        let statusLine = '';
        let timerVal = null;

        if (crisis.currentWorkRate <= 0) {
            const isPanicked = crisis.isPanicked || (crisis.occupantCount > 0 && crisis.primaryOfficer && this.hasCondition(crisis.primaryOfficer, 'PANIC_ATTACK'));
            const statusNotice = isPanicked
                ? 'CRITICAL: CREW PANICKED — Officer frozen at console'
                : 'CRITICAL: UNMANNED — Assign officer to initiate repairs';

            statusLine = `
                <div style="margin-top: 5px; color: #ff7b72; font-weight: 700; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#f85149; box-shadow:0 0 6px #f85149;"></span>
                    ${statusNotice}
                </div>
                <div class="crisis-progress-row">
                    <div class="crisis-progress-track">
                        <div class="crisis-progress-fill unmanned" style="width: ${progressPercent}%;"></div>
                    </div>
                    <span class="crisis-progress-percent unmanned">${progressPercent}%</span>
                </div>
            `;
        } else {
            const estSec = (crisis.workRemaining / crisis.currentWorkRate).toFixed(1);
            timerVal = `${Math.ceil(estSec)}s`;
            const officerName = crisis.primaryOfficer ? crisis.primaryOfficer.name.split(' ')[0] : 'Officer';

            let tierLabel = "UNQUALIFIED";
            let tierColor = "#d29922";
            if (crisis.officerTier === 'Core') {
                tierLabel = "OPTIMAL";
                tierColor = "#3fb950";
            } else if (crisis.officerTier === 'Adjacent' || crisis.officerTier === 'Stretch') {
                tierLabel = "TRAINED";
                tierColor = "#58a6ff";
            }

            const stackNote = crisis.occupantCount > 1 ? ` (+Stack)` : '';

            statusLine = `
                <div style="margin-top: 5px; color: #38bdf8; font-weight: 600; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#38bdf8; box-shadow:0 0 6px #38bdf8;"></span>
                    Repairing: ${estSec}s remaining (${officerName} · <span style="color:${tierColor}; font-weight:700;">${tierLabel}</span>${stackNote})
                </div>
                <div class="crisis-progress-row">
                    <div class="crisis-progress-track">
                        <div class="crisis-progress-fill" style="width: ${progressPercent}%;"></div>
                    </div>
                    <span class="crisis-progress-percent">${progressPercent}%</span>
                </div>
            `;
        }

        const messageHtml = `
            <div style="margin-bottom: 2px;">${crisis.description}</div>
            <div style="font-size: 10px; color: #e3b341; font-weight: 600;">IMPACT: ${crisis.impactDesc}</div>
            ${statusLine}
        `;

        const comp = (window.Phase2Bridge.compartments) ? window.Phase2Bridge.compartments[crisis.stationId] : null;
        const actionLabel = comp ? `TARGET ${comp.name.toUpperCase()}` : `TARGET STATION`;

        window.Phase2Bridge.pushAlert({
            id: `crisis-${crisis.stationId}`,
            type: 'critical',
            tag: crisis.tag,
            title: crisis.title,
            message: messageHtml,
            targetRoom: crisis.stationId,
            actionLabel: actionLabel,
            timer: timerVal,
            isCrisis: true
        });

        // Ensure room cutaway overlay has pulsing hazard highlight
        const roomEl = document.querySelector(`.room-interactive-overlay[data-room-id="${crisis.stationId}"]`);
        if (roomEl && !roomEl.classList.contains('room-crisis-active')) {
            roomEl.classList.add('room-crisis-active');
        }
    }

    /**
     * Trigger a station crisis event by station ID ('reactor', 'o2bay', 'hydroponics', 'cockpit', or 'random')
     */
    triggerCrisis(target = 'random') {
        let hazard = null;
        if (target === 'random') {
            const available = Object.keys(STATION_HAZARDS).filter(id => !this.activeCrises[id] && (!this.activeSabotage || this.activeSabotage.targetStation !== id));
            if (available.length === 0) return null;
            const chosen = available[Math.floor(Math.random() * available.length)];
            hazard = STATION_HAZARDS[chosen];
        } else if (STATION_HAZARDS[target]) {
            hazard = STATION_HAZARDS[target];
        } else {
            hazard = Object.values(STATION_HAZARDS).find(h => h.id === target || h.stationId === target);
        }

        if (!hazard) {
            console.warn(`[FLIGHT ENGINE] Unknown crisis hazard: ${target}`);
            return null;
        }

        const stationId = hazard.stationId;
        if (this.activeCrises[stationId]) {
            console.log(`[FLIGHT ENGINE] Crisis already active on station: ${stationId}`);
            return this.activeCrises[stationId];
        }

        // Dismiss any existing generic unmanned warning card for this station so only ONE card is shown
        if (window.Phase2Bridge && window.Phase2Bridge.dismissAlert) {
            window.Phase2Bridge.dismissAlert(`unmanned-${stationId}`, false);
        }
        if (this.activeUnmannedAlerts) {
            this.activeUnmannedAlerts[stationId] = false;
        }

        const workInfo = this.getCrisisWorkRate(stationId);
        const crisis = {
            ...hazard,
            workRemaining: hazard.resolveWorkRequired,
            currentWorkRate: workInfo.rate,
            primaryOfficer: workInfo.primaryOfficer,
            officerTier: workInfo.tier,
            occupantCount: workInfo.count,
            isPanicked: workInfo.isPanicked,
            hasCausedPanic: false,
            startTime: performance.now()
        };

        this.activeCrises[stationId] = crisis;

        // Comms log notification (normal type so logEvent doesn't create duplicate generic card)
        this.logComms(`[CRITICAL HAZARD] ${hazard.title}: ${hazard.description}`, "normal", hazard.tag);

        // Emergency alarm klaxon audio (deep naval pitch, played once on hazard trigger)
        if (window.SoundFX && window.SoundFX.playCrisisAlert) {
            window.SoundFX.playCrisisAlert();
        } else if (window.SoundFX && window.SoundFX.playLaunchAlert) {
            window.SoundFX.playLaunchAlert();
        }

        // Render card and hazard highlights immediately
        this.syncCrisisCard(crisis);

        console.log(`[FLIGHT ENGINE] Hazard triggered: ${hazard.id} on ${stationId}. Base work: ${hazard.resolveWorkRequired}s.`);
        return crisis;
    }

    /**
     * Resolve and clear an active crisis on a station
     */
    resolveCrisis(stationId) {
        const crisis = this.activeCrises[stationId];
        if (!crisis) return;

        delete this.activeCrises[stationId];

        // Grant 30s post-crisis composure cooldown to all crew stationed in the resolved compartment
        const resolvedCrew = this.crew.filter(c => c.currentRoom === stationId);
        resolvedCrew.forEach(c => {
            c.crisisCooldown = 30.0;
        });

        // Comms log announcement
        this.logComms(`[CRISIS RESOLVED] ${crisis.stationName.toUpperCase()}: ${crisis.resolveMessage}`, "normal", crisis.tag);

        // Success audio cue
        if (window.SoundFX && window.SoundFX.playKeyClick) {
            window.SoundFX.playKeyClick(null, false);
        }

        // Dismiss the critical alert card
        if (window.Phase2Bridge && window.Phase2Bridge.dismissAlert) {
            window.Phase2Bridge.dismissAlert(`crisis-${stationId}`, false);
        }

        // Remove room cutaway hazard border
        const roomEl = document.querySelector(`.room-interactive-overlay[data-room-id="${stationId}"]`);
        if (roomEl) {
            roomEl.classList.remove('room-crisis-active');
        }

        // Re-render HUD to reflect normalized drain rate
        this.updateVesselTelemetry(0);
        this.renderHUD();
    }

    /**
     * Ambient Crisis Director: triggers emergencies at measured intervals during cruise/warp
     */
    updateCrisisDirector(dt) {
        if (this.speedMultiplier === 0 || this.distancePercent >= 100) return;

        this.crisisDirectorTimer -= dt;

        if (this.crisisDirectorTimer <= 0) {
            this.crisisDirectorTimer = 120.0 + Math.random() * 40.0;

            const availableStations = Object.keys(STATION_HAZARDS).filter(id => !this.activeCrises[id]);
            if (availableStations.length > 0) {
                const chosen = availableStations[Math.floor(Math.random() * availableStations.length)];
                this.triggerCrisis(chosen);
            }
        }
    }

    /**
     * Ambient Track C Event Director: triggers day-to-day random incidents & rogue events
     */
    updateRandomEventDirector(dt) {
        if (this.speedMultiplier === 0 || this.distancePercent >= 100) return;
        // Strict anti-stacking: do not start a new Track C incident if one is already active or a bomb is ticking
        if (this.activeTrackCIncident) return;
        if (this.activeSabotage && !this.activeSabotage.isDefused && !this.activeSabotage.isDetonated) return;

        this.randomEventDirectorTimer -= dt;

        if (this.randomEventDirectorTimer <= 0) {
            this.randomEventDirectorTimer = 130.0 + Math.random() * 50.0;
            this.triggerWorkplaceInjury();
        }
    }

    /**
     * Track C Incident: Workplace Injury (twists, sprains, falls at station)
     * Format: "While working in the {station}, {crewmate name} tripped and injured their {body part}."
     */
    triggerWorkplaceInjury(targetOfficer = null, chosenBodyPart = null) {
        // Strict anti-stacking: only one Track C incident active at a time, and not during active sabotage
        if (this.activeTrackCIncident) return null;
        if (this.activeSabotage && !this.activeSabotage.isDefused && !this.activeSabotage.isDetonated) return null;

        const workingRooms = ['reactor', 'o2bay', 'hydroponics', 'cockpit', 'workshop', 'brig'];
        const stationNames = {
            reactor: 'Reactor Core',
            o2bay: 'Life Support / O2 Bay',
            hydroponics: 'Hydroponics Bay',
            cockpit: 'Flight Deck',
            workshop: 'Workshop / Stores',
            brig: 'The Brig'
        };

        let officer = null;
        if (targetOfficer) {
            if (typeof targetOfficer === 'string') {
                officer = this.crew.find(c => c.name === targetOfficer || c.name.toLowerCase().includes(targetOfficer.toLowerCase()));
            } else {
                officer = targetOfficer;
            }
            if (!officer || officer.isDead || officer.status === 'DECEASED') return null;
            if (Object.keys(officer.conditions || {}).length > 0) return null;
        } else {
            const candidates = this.crew.filter(c => {
                if (c.isDead || c.status === 'DECEASED') return false;
                if (c.transitRemaining > 0) return false;
                if (!workingRooms.includes(c.currentRoom)) return false;
                if (Object.keys(c.conditions || {}).length > 0) return false;
                if (this.activeSabotage && c.name === this.activeSabotage.saboteurName && !c.isDisarmed) return false;
                return true;
            });
            if (candidates.length === 0) return null;
            officer = candidates[Math.floor(Math.random() * candidates.length)];
        }

        const bodyPart = chosenBodyPart || INJURY_BODY_PARTS[Math.floor(Math.random() * INJURY_BODY_PARTS.length)];
        const stationId = officer.currentRoom || 'reactor';
        const stationName = stationNames[stationId] || 'Station';

        const incident = {
            id: `injury_${Date.now()}`,
            type: 'WORKPLACE_INJURY',
            officerName: officer.name,
            officer: officer,
            bodyPart: bodyPart,
            stationId: stationId,
            stationName: stationName,
            startTime: performance.now()
        };

        this.activeTrackCIncident = incident;

        const reason = `While working in the ${stationName}, ${officer.name} tripped and injured their ${bodyPart}.`;
        const added = this.addCondition(officer, 'PHYSICAL_INJURY', reason);
        if (!added) {
            this.activeTrackCIncident = null;
            return null;
        }

        if (officer.conditions && officer.conditions['PHYSICAL_INJURY']) {
            officer.conditions['PHYSICAL_INJURY'].bodyPart = bodyPart;
            officer.conditions['PHYSICAL_INJURY'].stationName = stationName;
        }

        this.syncConditionCard(officer, 'PHYSICAL_INJURY');
        console.log(`[FLIGHT ENGINE] Track C Incident triggered: ${reason}`);
        return incident;
    }

    /**
     * =========================================================================
     * TRACK D: LOW DISCIPLINE INTERPERSONAL CREW FRICTION & INFIGHTING
     * =========================================================================
     */
    updateDisciplineFrictionDirector(dt) {
        if (this.speedMultiplier === 0 || this.distancePercent >= 100) return;
        // Strict anti-stacking: only one friction incident active at a time
        if (this.activeCrewFriction) return;
        // Do not interrupt active bomb crisis
        if (this.activeSabotage && !this.activeSabotage.isDefused && !this.activeSabotage.isDetonated) return;

        const discipline = this.telemetry?.discipline?.value ?? 100;
        // Never triggers above 85% discipline
        if (discipline > 85) {
            return;
        }

        // Scaling rate: very rare around 80-85% (rate ~0.15-0.25x),
        // progressively more likely as discipline drops toward 50% and mutinous panic (<35%)
        const deficit = 85 - discipline; // 0 to 85
        const rateMult = Math.max(0.15, Math.pow(deficit / 20, 1.4));
        this.frictionDirectorTimer -= dt * rateMult;

        if (this.frictionDirectorTimer <= 0) {
            this.frictionDirectorTimer = 45.0 + Math.random() * 25.0;
            this.triggerCrewFrictionEvent();
        }
    }

    getFrictionEligibleOfficers() {
        return this.crew.filter(c => {
            if (c.isDead || c.status === 'DECEASED') return false;
            if (c.transitRemaining > 0) return false;
            if (c.isDetained) return false;
            if (!c.currentRoom || c.currentRoom === 'sleepPods') return false;
            if (Object.keys(c.conditions || {}).length > 0) return false;
            if (this.activeCrises[c.currentRoom]) return false;
            if (c.crisisCooldown && c.crisisCooldown > 0) return false;
            if (c.panicCooldown && c.panicCooldown > 0) return false;
            if (c.frictionCooldown && c.frictionCooldown > 0) return false;
            if (this.activeSabotage && !this.activeSabotage.isDefused && !this.activeSabotage.isDetonated && this.activeSabotage.targetStation === c.currentRoom) return false;
            return true;
        });
    }

    triggerCrewFrictionEvent(overrideType = null, targetOfficerA = null, targetOfficerB = null) {
        if (this.activeCrewFriction) return null;
        if (this.activeSabotage && !this.activeSabotage.isDefused && !this.activeSabotage.isDetonated) return null;

        const discipline = this.telemetry?.discipline?.value ?? 100;
        if (discipline > 85 && !overrideType && !targetOfficerA) return null;

        let officerA = null;
        let officerB = null;
        let chosenType = overrideType;
        let wasCoLocated = false;

        const stationNames = {
            cockpit: 'Flight Deck',
            reactor: 'Reactor Core',
            workshop: 'Workshop / Stores',
            o2bay: 'Life Support / O2 Bay',
            hydroponics: 'Hydroponics Bay',
            medbay: 'Medbay',
            brig: 'The Brig'
        };

        if (targetOfficerA && targetOfficerB) {
            officerA = typeof targetOfficerA === 'string' ? this.crew.find(c => c.name.toLowerCase().includes(targetOfficerA.toLowerCase())) : targetOfficerA;
            officerB = typeof targetOfficerB === 'string' ? this.crew.find(c => c.name.toLowerCase().includes(targetOfficerB.toLowerCase())) : targetOfficerB;
            if (!officerA || !officerB || officerA === officerB) return null;
            wasCoLocated = (officerA.currentRoom === officerB.currentRoom);
            if (!chosenType) chosenType = wasCoLocated ? 'HEATED_ARGUMENT' : 'PARANOID_ACCUSATION';
        } else {
            const eligible = this.getFrictionEligibleOfficers();
            if (eligible.length < 2) return null;

            // Group by room to check for co-located crew
            const roomMap = {};
            eligible.forEach(c => {
                roomMap[c.currentRoom] = roomMap[c.currentRoom] || [];
                roomMap[c.currentRoom].push(c);
            });

            const coLocatedRooms = Object.keys(roomMap).filter(r => roomMap[r].length >= 2);

            if (coLocatedRooms.length > 0) {
                const room = coLocatedRooms[Math.floor(Math.random() * coLocatedRooms.length)];
                const pair = roomMap[room];
                officerA = pair[0];
                officerB = pair[1];
                wasCoLocated = true;

                if (!chosenType) {
                    const eventTypes = ['HEATED_ARGUMENT', 'PHYSICAL_BRAWL', 'PARANOID_ACCUSATION'];
                    chosenType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
                }
            } else {
                // No co-located crew, but 2+ officers on duty across ship: PARANOID_ACCUSATION
                officerA = eligible[0];
                officerB = eligible[1];
                wasCoLocated = false;
                chosenType = 'PARANOID_ACCUSATION';
            }
        }

        const room = officerA.currentRoom;
        const stationName = stationNames[room] || 'Station';
        const incidentId = `friction_${Date.now()}`;
        const alertId = 'crew-friction-alert';

        const incident = {
            id: incidentId,
            type: chosenType,
            officerA: officerA.name,
            officerB: officerB.name,
            room: room,
            stationName: stationName,
            wasCoLocated: wasCoLocated,
            startTime: performance.now(),
            alertId: alertId,
            elapsed: 0
        };

        if (chosenType === 'HEATED_ARGUMENT') {
            incident.title = `[DISCIPLINE] HEATED ARGUMENT: ${stationName.toUpperCase()}`;
            this.logComms(`[CREW FRICTION] Heated argument in ${stationName}! ${officerA.name} and ${officerB.name} are in a shouting match over duty protocols. Separate them immediately.`, "normal", "DISC");

            if (window.Phase2Bridge && window.Phase2Bridge.pushAlert) {
                window.Phase2Bridge.pushAlert({
                    id: alertId,
                    type: 'warning',
                    tag: 'DISC',
                    title: incident.title,
                    message: `<div style="margin-bottom: 2px;"><b>${officerA.name}</b> and <b>${officerB.name}</b> are in a volatile argument in ${stationName}!</div><div style="font-size: 10px; color: #ff7b72; font-weight: 700;">IMPACT: Station efficiency 0% · Separate them to restore duties</div>`,
                    targetRoom: room,
                    actionLabel: `TARGET ${stationName.toUpperCase()}`,
                    isCrisis: false
                });
            }
        } else if (chosenType === 'PHYSICAL_BRAWL') {
            incident.title = `[DISCIPLINE] PHYSICAL BRAWL: ${stationName.toUpperCase()}`;
            // Initial strike damage: -10 HP each (minimum 1 HP)
            officerA.hp = Math.max(1, officerA.hp - 10);
            officerB.hp = Math.max(1, officerB.hp - 10);

            this.logComms(`[VIOLENCE IN COMPARTMENT] Physical brawl broken out in ${stationName}! ${officerA.name} and ${officerB.name} are fighting! Intervene or separate immediately.`, "normal", "DISC");

            if (window.Phase2Bridge && window.Phase2Bridge.pushAlert) {
                window.Phase2Bridge.pushAlert({
                    id: alertId,
                    type: 'critical',
                    tag: 'DISC',
                    title: incident.title,
                    message: `<div style="margin-bottom: 2px;"><b>${officerA.name}</b> and <b>${officerB.name}</b> have come to blows in ${stationName}!</div><div style="font-size: 10px; color: #ff7b72; font-weight: 700;">IMPACT: Both taking -0.2 HP/s damage · Station halted · Separate or dispatch security</div>`,
                    targetRoom: room,
                    actionLabel: `TARGET ${stationName.toUpperCase()}`,
                    isCrisis: true
                });
            }
        } else if (chosenType === 'PARANOID_ACCUSATION') {
            const claim = RIDICULOUS_ACCUSATIONS[Math.floor(Math.random() * RIDICULOUS_ACCUSATIONS.length)];
            incident.claim = claim;
            incident.title = `[DISCIPLINE] ACCUSATION: ${officerA.name.toUpperCase()}`;

            this.logComms(`[PARANOID ACCUSATION] ${officerA.name} loudly accuses ${officerB.name} of ${claim}! Insubordination reported.`, "normal", "DISC");

            if (window.Phase2Bridge && window.Phase2Bridge.pushAlert) {
                window.Phase2Bridge.pushAlert({
                    id: alertId,
                    type: 'warning',
                    tag: 'DISC',
                    title: incident.title,
                    message: `<div style="margin-bottom: 2px;"><b>${officerA.name}</b> loudly accuses <b>${officerB.name}</b> of <i>"${claim}"</i>!</div><div style="font-size: 10px; color: #ff7b72; font-weight: 700;">IMPACT: ${officerA.name} efficiency reduced to 20% · Reassign or move to The Brig to audit</div>`,
                    targetRoom: room,
                    actionLabel: `TARGET ${stationName.toUpperCase()}`,
                    isCrisis: false
                });
            }
        }

        this.activeCrewFriction = incident;

        if (window.SoundFX && window.SoundFX.playCrisisAlert) {
            window.SoundFX.playCrisisAlert();
        }

        this.updateVesselTelemetry(0);
        this.renderHUD();
        if (window.Phase2Bridge) {
            window.Phase2Bridge.renderCrewManifest();
            window.Phase2Bridge.renderRoomOccupants();
        }

        console.log(`[FLIGHT ENGINE] Track D Crew Friction triggered: ${chosenType} between ${officerA.name} and ${officerB.name}`);
        return incident;
    }

    updateActiveCrewFriction(dt) {
        if (!this.activeCrewFriction) return;
        const f = this.activeCrewFriction;

        const officerA = this.crew.find(c => c.name === f.officerA);
        const officerB = this.crew.find(c => c.name === f.officerB);

        if (!officerA || officerA.isDead || !officerB || officerB.isDead) {
            this.resolveCrewFriction('Combatant neutralized');
            return;
        }

        // 1. PHYSICAL_BRAWL logic
        if (f.type === 'PHYSICAL_BRAWL') {
            // Both take continuous health damage: -0.2 HP/s
            officerA.hp = Math.max(0, officerA.hp - (0.20 * dt));
            officerB.hp = Math.max(0, officerB.hp - (0.20 * dt));

            if (officerA.hp <= 0) {
                this.killOfficer(officerA, this.crew.indexOf(officerA), 'Fatal blunt trauma in crew brawl');
                this.resolveCrewFriction('Combatant neutralized');
                return;
            }
            if (officerB.hp <= 0) {
                this.killOfficer(officerB, this.crew.indexOf(officerB), 'Fatal blunt trauma in crew brawl');
                this.resolveCrewFriction('Combatant neutralized');
                return;
            }

            // Check if separated
            const separated = (officerA.currentRoom !== officerB.currentRoom) || (officerA.transitRemaining > 0) || (officerB.transitRemaining > 0);
            if (separated) {
                this.resolveCrewFriction('Crew members separated');
                return;
            }

            // Check if active security guard intervened
            const guardPresent = this.crew.some(c =>
                !c.isDead && c !== officerA && c !== officerB &&
                c.currentRoom === f.room && c.transitRemaining <= 0 &&
                !c.isDetained && !this.hasCondition(c, 'PANIC_ATTACK') &&
                (this.getOfficerStationTier(c, 'brig') === 'Core' || c.station === 'Brig')
            );
            if (guardPresent) {
                this.resolveCrewFriction('Security officer intervened and quelled brawl');
                return;
            }
        }

        // 2. HEATED_ARGUMENT logic
        if (f.type === 'HEATED_ARGUMENT') {
            const separated = (officerA.currentRoom !== officerB.currentRoom) || (officerA.transitRemaining > 0) || (officerB.transitRemaining > 0);
            if (separated) {
                this.resolveCrewFriction('Crew members separated');
                return;
            }

            const guardPresent = this.crew.some(c =>
                !c.isDead && c !== officerA && c !== officerB &&
                c.currentRoom === f.room && c.transitRemaining <= 0 &&
                !c.isDetained && !this.hasCondition(c, 'PANIC_ATTACK') &&
                (this.getOfficerStationTier(c, 'brig') === 'Core' || c.station === 'Brig')
            );
            if (guardPresent) {
                this.resolveCrewFriction('Security officer restored order');
                return;
            }
        }

        // 3. PARANOID_ACCUSATION logic
        if (f.type === 'PARANOID_ACCUSATION') {
            f.elapsed = (f.elapsed || 0) + dt;

            const accuserInBrigOrPods = officerA.currentRoom === 'brig' || officerA.currentRoom === 'sleepPods' || officerA.transitTarget === 'brig' || officerA.transitTarget === 'sleepPods';
            const searchStarted = this.activeSearches && !!this.activeSearches[officerA.name];
            const separated = f.wasCoLocated && (officerA.currentRoom !== officerB.currentRoom || officerA.transitRemaining > 0);

            if (accuserInBrigOrPods || searchStarted) {
                this.resolveCrewFriction('Accuser detained or relieved for psychological audit');
                return;
            }
            if (separated) {
                this.resolveCrewFriction('Parties separated');
                return;
            }
            if (f.elapsed >= 45.0) {
                this.resolveCrewFriction('Tensions de-escalated over time');
                return;
            }
        }
    }

    resolveCrewFriction(reason = '') {
        if (!this.activeCrewFriction) return;
        const f = this.activeCrewFriction;

        const officerA = this.crew.find(c => c.name === f.officerA);
        const officerB = this.crew.find(c => c.name === f.officerB);

        if (officerA) officerA.frictionCooldown = 30.0;
        if (officerB) officerB.frictionCooldown = 30.0;

        if (window.Phase2Bridge && window.Phase2Bridge.dismissAlert) {
            window.Phase2Bridge.dismissAlert(f.alertId, false);
        }

        const actionDesc = f.type === 'PHYSICAL_BRAWL' ? 'Brawl quelled' : (f.type === 'HEATED_ARGUMENT' ? 'Dispute resolved' : 'Accusation resolved');
        this.logComms(`[DISCIPLINE RESTORED] ${actionDesc}: ${reason || 'Order restored'}. Personnel returned to regular duty.`, "normal", "DISC");

        if (window.SoundFX && window.SoundFX.playKeyClick) {
            window.SoundFX.playKeyClick(null, false);
        }

        this.activeCrewFriction = null;

        this.updateVesselTelemetry(0);
        this.renderHUD();
        if (window.Phase2Bridge) {
            window.Phase2Bridge.renderCrewManifest();
            window.Phase2Bridge.renderRoomOccupants();
        }
    }

    /**
     * =========================================================================
     * STEP 6.2: REUSABLE PERSONNEL CONDITIONS & INCIDENTS (TRACK B & TRACK C)
     * =========================================================================
     */

    hasCondition(officer, conditionId) {
        return !!(officer && officer.conditions && officer.conditions[conditionId]);
    }

    getOfficerConditions(officer) {
        if (!officer || !officer.conditions) return [];
        return Object.keys(officer.conditions).map(id => ({
            id,
            def: PERSONNEL_CONDITIONS[id] || {},
            ...officer.conditions[id]
        }));
    }

    /**
     * Apply a condition (Panic, Infection, Injury, etc.) to an officer
     */
    addCondition(officer, conditionId, reason = '') {
        if (!officer) return false;
        const condDef = PERSONNEL_CONDITIONS[conditionId];
        if (!condDef) return false;

        if (!officer.conditions) {
            officer.conditions = {};
        }
        if (officer.conditions[conditionId]) {
            return false; // Already afflicted
        }

        // Strict anti-stacking: An officer cannot have multiple simultaneous conditions!
        // E.g., someone with PANIC_ATTACK or CONTAGIOUS_INFECTION cannot also get PHYSICAL_INJURY
        if (Object.keys(officer.conditions).length > 0) {
            return false;
        }

        // Active undisarmed saboteur cannot receive personal conditions while bomb is active
        if (this.activeSabotage && !this.activeSabotage.isDefused && !this.activeSabotage.isDetonated && officer.name === this.activeSabotage.saboteurName && !officer.isDisarmed) {
            return false;
        }

        officer.conditions[conditionId] = {
            elapsedSec: 0,
            treatmentProgress: 0,
            reason: reason,
            spreadTimer: 0
        };

        const officerIndex = this.crew.indexOf(officer);
        const firstName = officer.name.split(' ')[0];

        // Emergency alarm klaxon audio
        if (window.SoundFX && window.SoundFX.playCrisisAlert) {
            window.SoundFX.playCrisisAlert();
        } else if (window.SoundFX && window.SoundFX.playLaunchAlert) {
            window.SoundFX.playLaunchAlert();
        }

        // Tactical Comms announcement (normal type to avoid duplicate generic warning cards)
        if (conditionId === 'PANIC_ATTACK') {
            this.logComms(`[CREW INCIDENT] ${officer.name} suffered an acute panic attack! Console locked (0% efficiency). Relieve to Sleep Pods.`, "normal", "PSY");
        } else if (conditionId === 'CONTAGIOUS_INFECTION') {
            this.logComms(`[MEDICAL EMERGENCY] ${officer.name} is symptomatic with airborne pathogen! Quarantine in Medbay immediately.`, "normal", "MED");
        } else if (conditionId === 'PHYSICAL_INJURY') {
            this.logComms(`[WORKPLACE ACCIDENT] ${reason || (officer.name + ' suffered a workplace injury.')}`, "normal", "MED");
        }

        // Immediately render live condition card with progress bar & timer (no cyan quick actions)
        this.syncConditionCard(officer, conditionId);

        // Immediately update left manifest card & cutaway room tokens
        if (officerIndex !== -1) {
            this.updateOfficerCard(officerIndex, officer);
        }
        if (window.Phase2Bridge) {
            window.Phase2Bridge.renderRoomOccupants();
        }

        // Re-sync crisis card if currently stationed in a crisis room
        if (officer.currentRoom && this.activeCrises[officer.currentRoom]) {
            this.syncCrisisCard(this.activeCrises[officer.currentRoom]);
        }

        return true;
    }

    /**
     * Live synchronization of condition alert card with real-time progress bar & countdown timer
     */
    syncConditionCard(officer, conditionId) {
        if (!window.Phase2Bridge || !window.Phase2Bridge.pushAlert) return;
        if (!officer || !officer.conditions || !officer.conditions[conditionId]) return;

        const condDef = PERSONNEL_CONDITIONS[conditionId];
        if (!condDef) return;

        const condState = officer.conditions[conditionId];
        const safeNameId = officer.name.replace(/[^a-zA-Z0-9]/g, '_');
        const alertId = `cond-${conditionId.toLowerCase()}-${safeNameId}`;

        const cureSec = condDef.cureSecRequired || 10.0;
        const progressPercent = Math.max(0, Math.min(100, Math.round((condState.treatmentProgress / cureSec) * 100)));

        const isInTreatment = (officer.currentRoom === condDef.cureRoom && officer.transitRemaining <= 0)
            || (conditionId === 'PANIC_ATTACK' && officer.currentRoom === 'brig' && officer.transitRemaining <= 0);
        const isEnRoute = (officer.transitTarget === condDef.cureRoom)
            || (conditionId === 'PANIC_ATTACK' && officer.transitTarget === 'brig');

        let statusLine = '';
        let timerVal = null;

        if (conditionId === 'PANIC_ATTACK') {
            if (isInTreatment) {
                const remSec = Math.max(0, cureSec - condState.treatmentProgress).toFixed(1);
                timerVal = `${Math.ceil(remSec)}s`;
                const locationLabel = (officer.currentRoom === 'brig') ? 'Confined in Brig' : 'Resting in Sleep Pods';
                statusLine = `
                    <div style="margin-top: 5px; color: #38bdf8; font-weight: 600; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#38bdf8; box-shadow:0 0 6px #38bdf8;"></span>
                        ${locationLabel}: ${remSec}s remaining
                    </div>
                    <div class="crisis-progress-row">
                        <div class="crisis-progress-track">
                            <div class="crisis-progress-fill" style="width: ${progressPercent}%;"></div>
                        </div>
                        <span class="crisis-progress-percent">${progressPercent}%</span>
                    </div>
                `;
            } else if (isEnRoute) {
                statusLine = `
                    <div style="margin-top: 5px; color: #f0883e; font-weight: 600; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#f0883e; box-shadow:0 0 6px #f0883e;"></span>
                        En route to Sleep Pods (${Math.ceil(officer.transitRemaining)}s)
                    </div>
                    <div class="crisis-progress-row">
                        <div class="crisis-progress-track">
                            <div class="crisis-progress-fill unmanned" style="width: ${progressPercent}%;"></div>
                        </div>
                        <span class="crisis-progress-percent unmanned">${progressPercent}%</span>
                    </div>
                `;
            } else {
                statusLine = `
                    <div style="margin-top: 5px; color: #ff7b72; font-weight: 700; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#f85149; box-shadow:0 0 6px #f85149;"></span>
                        CRITICAL: FROZEN — Send officer to Sleep Pods to recover
                    </div>
                    <div class="crisis-progress-row">
                        <div class="crisis-progress-track">
                            <div class="crisis-progress-fill unmanned" style="width: ${progressPercent}%;"></div>
                        </div>
                        <span class="crisis-progress-percent unmanned">${progressPercent}%</span>
                    </div>
                `;
            }

            const messageHtml = `
                <div style="margin-bottom: 2px;"><b>${officer.name}</b> panicked under stress and stopped working!</div>
                <div style="font-size: 10px; color: #e3b341; font-weight: 600;">IMPACT: Station efficiency 0% · Send to Sleep Pods to recover</div>
                ${statusLine}
            `;

            window.Phase2Bridge.pushAlert({
                id: alertId,
                type: 'critical',
                tag: condDef.tag || 'PSY',
                title: `[PSY] CREW PANIC: ${officer.name.toUpperCase()}`,
                message: messageHtml,
                targetRoom: null,
                actionLabel: null,
                noActionBtn: true,
                timer: timerVal,
                isCrisis: true
            });
        } else if (conditionId === 'CONTAGIOUS_INFECTION' || conditionId === 'PHYSICAL_INJURY') {
            const isInjury = conditionId === 'PHYSICAL_INJURY';
            const bodyPart = (condState && condState.bodyPart) ? condState.bodyPart : 'wrist';
            const stationName = (condState && condState.stationName) ? condState.stationName : 'Station';

            const attendants = this.crew.filter(c => !c.isDead && c !== officer && c.currentRoom === 'medbay' && c.transitRemaining <= 0);
            const activeAttendants = attendants.filter(a => !this.hasCondition(a, 'PANIC_ATTACK'));
            const hasAttendant = activeAttendants.length > 0;

            if (isInTreatment) {
                if (hasAttendant) {
                    const bestAttendant = activeAttendants[0];
                    const tier = this.getOfficerStationTier(bestAttendant, 'medbay');
                    const tierRates = {
                        Core: 1.50,            // 12.0s cure time
                        Adjacent: 1.00,        // 18.0s cure time
                        Stretch: 1.00,         // 18.0s cure time
                        Mismatched: 18 / 23    // 23.0s cure time
                    };
                    const rate = tierRates[tier] || (18 / 23);
                    const remSec = Math.max(0, (cureSec - condState.treatmentProgress) / rate).toFixed(1);
                    timerVal = `${Math.ceil(remSec)}s`;
                    statusLine = `
                        <div style="margin-top: 5px; color: #38bdf8; font-weight: 600; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#38bdf8; box-shadow:0 0 6px #38bdf8;"></span>
                            Under Treatment in Medbay: ${remSec}s remaining (Attendant: ${bestAttendant.name.split(' ')[0]})
                        </div>
                        <div class="crisis-progress-row">
                            <div class="crisis-progress-track">
                                <div class="crisis-progress-fill" style="width: ${progressPercent}%;"></div>
                            </div>
                            <span class="crisis-progress-percent">${progressPercent}%</span>
                        </div>
                    `;
                } else {
                    timerVal = 'PAUSED';
                    const isAttendantPanicked = attendants.some(a => this.hasCondition(a, 'PANIC_ATTACK'));
                    const statusText = isAttendantPanicked
                        ? 'AWAITING ATTENDANT: Stationed attendant is incapacitated / panicked'
                        : 'AWAITING ATTENDANT: 2nd crewmate required in Medbay to treat';
                    statusLine = `
                        <div style="margin-top: 5px; color: #e3b341; font-weight: 700; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#e3b341; box-shadow:0 0 6px #e3b341;"></span>
                            ${statusText}
                        </div>
                        <div class="crisis-progress-row">
                            <div class="crisis-progress-track">
                                <div class="crisis-progress-fill unmanned" style="width: ${progressPercent}%;"></div>
                            </div>
                            <span class="crisis-progress-percent unmanned">${progressPercent}%</span>
                        </div>
                    `;
                }
            } else if (isEnRoute) {
                statusLine = `
                    <div style="margin-top: 5px; color: #f0883e; font-weight: 600; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#f0883e; box-shadow:0 0 6px #f0883e;"></span>
                        En route to Medbay (${Math.ceil(officer.transitRemaining)}s)
                    </div>
                    <div class="crisis-progress-row">
                        <div class="crisis-progress-track">
                            <div class="crisis-progress-fill unmanned" style="width: ${progressPercent}%;"></div>
                        </div>
                        <span class="crisis-progress-percent unmanned">${progressPercent}%</span>
                    </div>
                `;
            } else {
                const unquarantineText = isInjury
                    ? 'UNTREATED INJURY: Health draining (-0.35/s) — Assign to Medbay with attendant'
                    : 'UNQUARANTINED: Airborne infection active — Assign to Medbay';
                statusLine = `
                    <div style="margin-top: 5px; color: #ff7b72; font-weight: 700; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#f85149; box-shadow:0 0 6px #f85149;"></span>
                        ${unquarantineText}
                    </div>
                    <div class="crisis-progress-row">
                        <div class="crisis-progress-track">
                            <div class="crisis-progress-fill unmanned" style="width: ${progressPercent}%;"></div>
                        </div>
                        <span class="crisis-progress-percent unmanned">${progressPercent}%</span>
                    </div>
                `;
            }

            const alertTitle = isInjury
                ? `[MED] INJURY: ${officer.name.toUpperCase()} (${bodyPart.toUpperCase()})`
                : `[MED] CONTAGION: ${officer.name.toUpperCase()}`;

            const descText = isInjury
                ? `While working in the ${stationName}, <b>${officer.name}</b> tripped and injured their ${bodyPart}.`
                : `<b>${officer.name}</b> is sick and contagious!`;

            const impactText = isInjury
                ? 'IMPACT: Draining -0.35 HP/s · Efficiency -50% · Needs Medbay treatment with attendant'
                : 'IMPACT: Draining -0.35 HP/s · Spreads to compartment co-workers';

            const messageHtml = `
                <div style="margin-bottom: 2px;">${descText}</div>
                <div style="font-size: 10px; color: #e3b341; font-weight: 600;">${impactText}</div>
                ${statusLine}
            `;

            window.Phase2Bridge.pushAlert({
                id: alertId,
                type: 'critical',
                tag: condDef.tag || 'MED',
                title: alertTitle,
                message: messageHtml,
                targetRoom: null,
                actionLabel: null,
                noActionBtn: true,
                timer: timerVal,
                isCrisis: true
            });
        }
    }

    /**
     * Remove and cure a condition from an officer
     */
    removeCondition(officer, conditionId, silent = false) {
        if (!officer || !officer.conditions || !officer.conditions[conditionId]) return false;

        const condDef = PERSONNEL_CONDITIONS[conditionId];
        delete officer.conditions[conditionId];

        // Grant post-recovery composure cooldown so they do not instantly re-panic or enter friction
        officer.crisisCooldown = 30.0; // 30 seconds of composure
        if (conditionId === 'PANIC_ATTACK') {
            officer.panicCooldown = 45.0; // 45 seconds of composure
        } else if (conditionId === 'PHYSICAL_INJURY') {
            if (this.activeTrackCIncident && this.activeTrackCIncident.officerName === officer.name) {
                this.activeTrackCIncident = null;
            }
        }

        const safeNameId = officer.name.replace(/[^a-zA-Z0-9]/g, '_');
        const alertId = `cond-${conditionId.toLowerCase()}-${safeNameId}`;

        if (window.Phase2Bridge && window.Phase2Bridge.dismissAlert) {
            window.Phase2Bridge.dismissAlert(alertId, false);
        }

        if (!silent) {
            const condName = condDef ? condDef.name : conditionId;
            this.logComms(`[MEDICAL CLEARANCE] ${officer.name} has recovered from ${condName} and is cleared for duty.`, "normal", "MED");
        }

        const officerIndex = this.crew.indexOf(officer);
        if (officerIndex !== -1) {
            this.updateOfficerCard(officerIndex, officer);
        }
        if (window.Phase2Bridge) {
            window.Phase2Bridge.renderRoomOccupants();
        }

        if (officer.currentRoom && this.activeCrises[officer.currentRoom]) {
            this.syncCrisisCard(this.activeCrises[officer.currentRoom]);
        }

        return true;
    }

    /**
     * Terminate and record casualty for an officer at 0% health
     */
    killOfficer(officer, idx, cause = 'Vital collapse') {
        if (!officer || officer.isDead) return;

        officer.hp = 0;
        officer.isDead = true;
        officer.status = 'DECEASED';

        if (this.activeTrackCIncident && this.activeTrackCIncident.officerName === officer.name) {
            this.activeTrackCIncident = null;
        }

        if (this.activeCrewFriction && (this.activeCrewFriction.officerA === officer.name || this.activeCrewFriction.officerB === officer.name)) {
            this.resolveCrewFriction('Combatant casualty');
        }

        const previousRoom = officer.currentRoom || officer.transitTarget;
        officer.currentRoom = null;
        officer.transitTarget = null;
        officer.transitRemaining = 0;
        officer.previousRoom = null;

        // Clean up any active search on this officer
        if (this.activeSearches && this.activeSearches[officer.name]) {
            const search = this.activeSearches[officer.name];
            if (window.Phase2Bridge && window.Phase2Bridge.dismissAlert) {
                window.Phase2Bridge.dismissAlert(search.alertId, false);
            }
            delete this.activeSearches[officer.name];
        }

        // Dismiss all active condition cards for this officer
        if (officer.conditions) {
            Object.keys(officer.conditions).forEach(cid => {
                const safeNameId = officer.name.replace(/[^a-zA-Z0-9]/g, '_');
                const alertId = `cond-${cid.toLowerCase()}-${safeNameId}`;
                if (window.Phase2Bridge && window.Phase2Bridge.dismissAlert) {
                    window.Phase2Bridge.dismissAlert(alertId, false);
                }
            });
            officer.conditions = {};
        }

        // Emergency audio cue
        if (window.SoundFX && window.SoundFX.playCrisisAlert) {
            window.SoundFX.playCrisisAlert();
        }

        // Comms log announcement
        this.logComms(`[CASUALTY REPORT] ${officer.name} (${officer.roleTitle}) has flatlined. Cause: ${cause}. Officer deceased.`, "normal", "MED");

        // Push alert card for the fatality
        if (window.Phase2Bridge && window.Phase2Bridge.pushAlert) {
            const safeNameId = officer.name.replace(/[^a-zA-Z0-9]/g, '_');
            window.Phase2Bridge.pushAlert({
                id: `fatality-${safeNameId}`,
                type: 'critical',
                tag: 'MED',
                title: `[FATALITY] CREW CASUALTY: ${officer.name.toUpperCase()}`,
                message: `<b>${officer.name}</b> (${officer.roleTitle}) has perished from ${cause}. Vital signs absent; removed from ship duty.`,
                targetRoom: null,
                actionLabel: null,
                noActionBtn: true,
                isCrisis: false,
                autoExpireSec: 25
            });
        }

        // If officer was manning a crisis, re-sync crisis to unmanned state
        if (previousRoom && this.activeCrises[previousRoom]) {
            this.syncCrisisCard(this.activeCrises[previousRoom]);
        }

        // Update displays
        this.updateOfficerCard(idx, officer);
        this.updateVesselTelemetry(0);
        this.renderHUD();

        if (window.Phase2Bridge) {
            if (window.Phase2Bridge.wanderState && window.Phase2Bridge.wanderState[officer.name]) {
                delete window.Phase2Bridge.wanderState[officer.name];
            }
            window.Phase2Bridge.renderRoomOccupants();
            window.Phase2Bridge.renderCrewManifest();
        }
    }

    /**
     * Simulate real-time condition effects (health drains, contagion spread, room recovery)
     */
    updatePersonnelConditions(dt) {
        this.crew.forEach((officer, idx) => {
            // Skip deceased officers
            if (officer.isDead || officer.status === 'DECEASED') return;

            // Decrement composure cooldown
            if (officer.panicCooldown > 0) {
                officer.panicCooldown = Math.max(0, officer.panicCooldown - dt);
            }

            if (!officer.conditions) return;

            for (const [condId, condState] of Object.entries(officer.conditions)) {
                const condDef = PERSONNEL_CONDITIONS[condId];
                if (!condDef) continue;

                condState.elapsedSec += dt;

                // 1. Health drain for Contagious Infection or Physical Injury
                if (condId === 'CONTAGIOUS_INFECTION' || condId === 'PHYSICAL_INJURY') {
                    if (condDef.hpDrainPerSec) {
                        officer.hp = Math.max(0, officer.hp - (condDef.hpDrainPerSec * dt));
                        if (officer.hp <= 0) {
                            const deathCause = condId === 'PHYSICAL_INJURY'
                                ? `Fatal complications from ${condState.bodyPart ? 'injured ' + condState.bodyPart : 'untreated workplace injury'}`
                                : 'Fatal pathogen infection';
                            this.killOfficer(officer, idx, deathCause);
                            return;
                        }
                    }

                    // Airborne spread to co-occupants in the same room (CONTAGIOUS_INFECTION only, NEVER inside Medbay, and not in transit)
                    if (condId === 'CONTAGIOUS_INFECTION' && officer.currentRoom && officer.currentRoom !== 'medbay' && officer.transitRemaining <= 0) {
                        condState.spreadTimer = (condState.spreadTimer || 0) + dt;
                        if (condState.spreadTimer >= condDef.spreadIntervalSec) {
                            condState.spreadTimer = 0;
                            const roommates = this.crew.filter(c => !c.isDead && c !== officer && c.currentRoom === officer.currentRoom && c.transitRemaining <= 0);
                            roommates.forEach(mate => {
                                if (!this.hasCondition(mate, 'CONTAGIOUS_INFECTION')) {
                                    this.addCondition(mate, 'CONTAGIOUS_INFECTION', `Airborne cross-contamination from ${officer.name}`);
                                    this.logComms(`[INFECTION SPREAD] ${mate.name} contaminated by ${officer.name} in ${officer.currentRoom}! Quarantine required.`, "normal", "MED");
                                }
                            });
                        }
                    }
                }

                // 2. Curing & Recovery check (resting in designated cureRoom with transit completed, or Brig for panic)
                const isInCureRoom = (condDef.cureRoom && officer.currentRoom === condDef.cureRoom && officer.transitRemaining <= 0)
                    || (condId === 'PANIC_ATTACK' && officer.currentRoom === 'brig' && officer.transitRemaining <= 0);

                if (isInCureRoom) {
                    let canCure = true;
                    let treatmentRate = 1.0;

                    if (condId === 'CONTAGIOUS_INFECTION' || condId === 'PHYSICAL_INJURY') {
                        // Requires an active 2nd crewmate manned in Medbay to administer treatment/care
                        const attendants = this.crew.filter(c => !c.isDead && c !== officer && c.currentRoom === 'medbay' && c.transitRemaining <= 0);
                        const activeAttendants = attendants.filter(a => !this.hasCondition(a, 'PANIC_ATTACK'));

                        if (activeAttendants.length === 0) {
                            canCure = false;
                        } else {
                            // Attendant qualification scaling:
                            // Core (Doctor / Surgeon / Medic): 1.50x (~12.0s cure time)
                            // Adjacent / Stretch (Biochemist / Life Support): 1.00x (18.0s cure time)
                            // Mismatched (Pilot / Tech / Guard): 18/23 ≈ 0.7826x (23.0s cure time)
                            const tierRates = {
                                Core: 1.50,
                                Adjacent: 1.00,
                                Stretch: 1.00,
                                Mismatched: 18 / 23
                            };
                            const bestRate = Math.max(...activeAttendants.map(a => {
                                const tier = this.getOfficerStationTier(a, 'medbay');
                                return tierRates[tier] || (18 / 23);
                            }));
                            treatmentRate = bestRate;
                        }
                    }

                    if (canCure) {
                        condState.treatmentProgress += treatmentRate * dt;
                        if (condState.treatmentProgress >= condDef.cureSecRequired) {
                            this.removeCondition(officer, condId);
                            continue;
                        }
                    }
                }

                // 3. Keep condition alert card in sync with real-time progress bar and countdown
                this.syncConditionCard(officer, condId);
            }
        });
    }

    /**
     * Decoupled Trigger Evaluator: Evaluates identity triggers & generic systemic stressors
     */
    evaluateConditionTriggers(dt) {
        if (this.speedMultiplier === 0 || this.distancePercent >= 100) return;

        // A. Identity & Station Stress Triggers
        // 1. Station Crisis Stress: 50% chance of panic for unqualified or fraud officers stationed at an active crisis
        this.crew.forEach(officer => {
            if (officer.isDead || officer.status === 'DECEASED') return;
            if (officer.currentRoom && officer.transitRemaining <= 0) {
                // Bomb Defusal Composure: suppress station crisis panic if defusing or at bomb station
                if (this.activeSabotage && (this.activeSabotage.targetStation === officer.currentRoom || this.activeSabotage.station === officer.currentRoom)) {
                    return;
                }
                const crisis = this.activeCrises[officer.currentRoom];
                if (crisis) {
                    crisis.evaluatedPanic = crisis.evaluatedPanic || {};
                    // Strictly MAXIMUM ONE panic attack allowed per crisis incident per station
                    if (crisis.hasCausedPanic) return;

                    const isFraud = officer.trueIdentity === 'DESPERATE_FRAUD';
                    const isMismatched = this.getOfficerStationTier(officer, officer.currentRoom) === 'Mismatched';

                    if ((isFraud || isMismatched) && !crisis.evaluatedPanic[officer.name]) {
                        crisis.evaluatedPanic[officer.name] = true;
                        if ((!officer.panicCooldown || officer.panicCooldown <= 0) && !this.hasCondition(officer, 'PANIC_ATTACK')) {
                            // 50% chance to panic under crisis pressure
                            if (Math.random() < 0.50) {
                                crisis.hasCausedPanic = true;
                                const cause = isFraud
                                    ? 'Overwhelmed by active station crisis in falsified role'
                                    : 'Overwhelmed by active station crisis in unfamiliar station';
                                this.addCondition(officer, 'PANIC_ATTACK', cause);
                            } else {
                                this.logComms(`[COMPOSURE MAINTAINED] ${officer.name} steels nerves and maintains station control under crisis pressure.`, "normal", crisis.tag || "SYS");
                            }
                        }
                    }
                }
            }
        });

        // 2. Contagious Carrier: Dormant pathogen flare-up milestone (e.g. voyage distance >= 20%)
        if (this.distancePercent >= 20 && !this.carrierFlareUpTriggered) {
            const carrier = this.crew.find(c => c.trueIdentity === 'CONTAGIOUS_CARRIER');
            if (carrier) {
                this.carrierFlareUpTriggered = true;
                this.addCondition(carrier, 'CONTAGIOUS_INFECTION', 'Dormant pathogen incubation ended');
            }
        }

        // 3. Doomsday Saboteur: Arms explosive bomb at voyage distance >= 35%
        if (this.distancePercent >= 35 && !this.sabotageTriggered) {
            const saboteur = this.crew.find(c => c.trueIdentity === 'DOOMSDAY_SABOTEUR' && !c.isDead && c.status !== 'DECEASED' && !c.isDisarmed && Object.keys(c.conditions || {}).length === 0);
            if (saboteur) {
                this.sabotageTriggered = true;
                this.triggerSabotageIncident(saboteur);
            }
        }

        // B. Decoupled Systemic Stressor Triggers (Applies to ANY crew member)
        // 1. Extreme sleep deprivation breakdown (eng <= 5 when neglected outside Sleep Pods)
        this.crew.forEach(officer => {
            if (officer.eng <= 5 && (!officer.panicCooldown || officer.panicCooldown <= 0) && !this.hasCondition(officer, 'PANIC_ATTACK') && officer.currentRoom !== 'sleepPods') {
                this.addCondition(officer, 'PANIC_ATTACK', 'Acute sleep deprivation mental breakdown');
            }
        });

        // 2. Hypoxic stress (vessel O2 < 25% under strained discipline < 50%)
        if (this.telemetry.o2.value < 25 && this.telemetry.discipline.value < 50) {
            this.crew.forEach(officer => {
                if ((!officer.panicCooldown || officer.panicCooldown <= 0) && !this.hasCondition(officer, 'PANIC_ATTACK')) {
                    this.addCondition(officer, 'PANIC_ATTACK', 'Hypoxic delirium & panic');
                }
            });
        }
    }

    /**
     * =========================================================================
     * STEP 6.3: ACTIVE SECURITY SEARCHES (COMMENSURATE BY GUARD TIER)
     * =========================================================================
     */
    startSecuritySearch(target, targetIdx, primaryGuard) {
        this.activeSearches = this.activeSearches || {};
        const safeNameId = target.name.replace(/[^a-zA-Z0-9]/g, '_');
        const search = {
            targetName: target.name,
            targetIdx: targetIdx,
            guardName: primaryGuard ? primaryGuard.name : null,
            progress: 0,
            workRequired: 18.0,
            alertId: `search-${safeNameId}`
        };
        this.activeSearches[target.name] = search;
        this.syncSearchCard(search);
    }

    cancelSecuritySearch(officerName, reason = '') {
        if (!this.activeSearches || !this.activeSearches[officerName]) return;
        const search = this.activeSearches[officerName];
        delete this.activeSearches[officerName];
        if (window.Phase2Bridge && window.Phase2Bridge.dismissAlert) {
            window.Phase2Bridge.dismissAlert(search.alertId, false);
        }
        if (reason) {
            this.logComms(`[SEARCH CANCELLED] Security audit for ${officerName} cancelled: ${reason}.`, "normal", "SEC");
        }
        if (window.Phase2Bridge) {
            window.Phase2Bridge.renderSecurityConsole();
        }
    }

    syncSearchCard(search) {
        if (!window.Phase2Bridge) return;

        const target = this.crew.find(c => c.name === search.targetName);
        if (!target || target.isDead || target.status === 'DECEASED') {
            if (window.Phase2Bridge.dismissAlert) {
                window.Phase2Bridge.dismissAlert(search.alertId, false);
            }
            delete this.activeSearches[search.targetName];
            return;
        }

        const brigCrew = this.crew.filter(c => !c.isDead && c.status !== 'DECEASED' && c.currentRoom === 'brig' && c.transitRemaining <= 0);
        const activeGuards = brigCrew.filter(c => c !== target && !c.isDetained && !this.hasCondition(c, 'PANIC_ATTACK'));
        const isTargetInBrig = target.currentRoom === 'brig' && target.transitRemaining <= 0;
        const isEnRoute = target.transitRemaining > 0 || (target.transitTarget === 'brig' && target.currentRoom !== 'brig');

        const progressPercent = Math.min(100, Math.round((search.progress / search.workRequired) * 100));

        let timerVal = 'PAUSED';
        let statusLine = '';

        if (isEnRoute) {
            const transitSec = Math.ceil(target.transitRemaining);
            timerVal = `${transitSec}s`;
            statusLine = `
                <div style="margin-top: 5px; color: #f0883e; font-weight: 600; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#f0883e; box-shadow:0 0 6px #f0883e;"></span>
                    En route to Deck 4 Brig (${transitSec}s)
                </div>
                <div class="crisis-progress-row">
                    <div class="crisis-progress-track">
                        <div class="crisis-progress-fill unmanned" style="width: ${progressPercent}%;"></div>
                    </div>
                    <span class="crisis-progress-percent unmanned">${progressPercent}%</span>
                </div>
            `;
        } else if (isTargetInBrig && activeGuards.length > 0) {
            const tierRates = {
                Core: 1.50,         // 12.0s
                Adjacent: 1.00,     // 18.0s
                Stretch: 1.00,      // 18.0s
                Mismatched: 18 / 23 // 23.0s
            };
            const bestGuard = activeGuards[0];
            const tier = this.getOfficerStationTier(bestGuard, 'brig');
            const rate = tierRates[tier] || (18 / 23);
            const remainingWork = Math.max(0, search.workRequired - search.progress);
            const remSec = (remainingWork / rate).toFixed(1);
            timerVal = `${Math.ceil(remSec)}s`;

            let tierLabel = "MISMATCHED";
            let tierColor = "#d29922";
            if (tier === 'Core') {
                tierLabel = "OPTIMAL";
                tierColor = "#3fb950";
            } else if (tier === 'Adjacent' || tier === 'Stretch') {
                tierLabel = "TRAINED";
                tierColor = "#58a6ff";
            }

            statusLine = `
                <div style="margin-top: 5px; color: #38bdf8; font-weight: 600; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#38bdf8; box-shadow:0 0 6px #38bdf8;"></span>
                    Searching Belongings: ${remSec}s remaining (${bestGuard.name.split(' ')[0]} · <span style="color:${tierColor}; font-weight:700;">${tierLabel}</span>)
                </div>
                <div class="crisis-progress-row">
                    <div class="crisis-progress-track">
                        <div class="crisis-progress-fill" style="width: ${progressPercent}%;"></div>
                    </div>
                    <span class="crisis-progress-percent">${progressPercent}%</span>
                </div>
            `;
        } else if (isTargetInBrig) {
            timerVal = 'PAUSED';
            const isGuardPanicked = brigCrew.some(c => c !== target && this.hasCondition(c, 'PANIC_ATTACK'));
            const statusText = isGuardPanicked
                ? 'SEARCH PAUSED: Stationed guard is incapacitated / panicked'
                : 'SEARCH PAUSED: Brig is unstaffed — Assign a security officer';
            statusLine = `
                <div style="margin-top: 5px; color: #e3b341; font-weight: 700; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#e3b341; box-shadow:0 0 6px #e3b341;"></span>
                    ${statusText}
                </div>
                <div class="crisis-progress-row">
                    <div class="crisis-progress-track">
                        <div class="crisis-progress-fill unmanned" style="width: ${progressPercent}%;"></div>
                    </div>
                    <span class="crisis-progress-percent unmanned">${progressPercent}%</span>
                </div>
            `;
        } else {
            timerVal = 'PAUSED';
            statusLine = `
                <div style="margin-top: 5px; color: #f85149; font-weight: 700; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#f85149; box-shadow:0 0 6px #f85149;"></span>
                    NOT IN BRIG: Return officer to The Brig to resume search
                </div>
                <div class="crisis-progress-row">
                    <div class="crisis-progress-track">
                        <div class="crisis-progress-fill unmanned" style="width: ${progressPercent}%;"></div>
                    </div>
                    <span class="crisis-progress-percent unmanned">${progressPercent}%</span>
                </div>
            `;
        }

        const messageHtml = `
            <div style="margin-bottom: 2px;">Searching <b>${target.name}</b> in The Brig.</div>
            <div style="font-size: 10px; color: #e3b341; font-weight: 600;">OBJECTIVE: Inspecting personal belongings for contraband</div>
            ${statusLine}
        `;

        window.Phase2Bridge.pushAlert({
            id: search.alertId,
            type: 'warning',
            tag: 'SEC',
            title: `[SEC] SEARCH: ${target.name.toUpperCase()}`,
            message: messageHtml,
            targetRoom: 'brig',
            actionLabel: null,
            noActionBtn: true,
            timer: timerVal,
            isCrisis: false
        });
    }

    updateSecuritySearches(dt) {
        if (!this.activeSearches || Object.keys(this.activeSearches).length === 0) return;

        for (const [name, search] of Object.entries(this.activeSearches)) {
            const target = this.crew.find(c => c.name === name);
            if (!target || target.isDead || target.status === 'DECEASED') {
                if (window.Phase2Bridge && window.Phase2Bridge.dismissAlert) {
                    window.Phase2Bridge.dismissAlert(search.alertId, false);
                }
                delete this.activeSearches[name];
                continue;
            }

            // Check if target has been routed away from brig entirely
            if (target.currentRoom !== 'brig' && target.transitTarget !== 'brig') {
                this.syncSearchCard(search);
                continue;
            }

            // Check if target is in brig
            const targetInBrig = target.currentRoom === 'brig' && target.transitRemaining <= 0;
            if (!targetInBrig) {
                this.syncSearchCard(search);
                continue;
            }

            // Target has arrived in the Brig
            if (target.status !== 'SECURITY AUDIT' && !target.isDetained) {
                target.status = 'SECURITY AUDIT';
                const targetIdx = this.crew.indexOf(target);
                if (targetIdx !== -1) {
                    this.updateOfficerCard(targetIdx, target);
                }
            }

            // Check for active guard
            const brigCrew = this.crew.filter(c => !c.isDead && c.status !== 'DECEASED' && c.currentRoom === 'brig' && c.transitRemaining <= 0);
            const activeGuards = brigCrew.filter(c => c !== target && !c.isDetained && !this.hasCondition(c, 'PANIC_ATTACK'));
            if (activeGuards.length === 0) {
                this.syncSearchCard(search);
                continue;
            }

            // Calculate search work rate by guard tier
            const tierRates = {
                Core: 1.50,         // 12.0s
                Adjacent: 1.00,     // 18.0s
                Stretch: 1.00,      // 18.0s
                Mismatched: 18 / 23 // 23.0s
            };
            const bestRate = Math.max(...activeGuards.map(g => {
                const tier = this.getOfficerStationTier(g, 'brig');
                return tierRates[tier] || (18 / 23);
            }));

            search.progress += bestRate * dt;

            if (search.progress >= search.workRequired) {
                this.completeSecuritySearch(search, target);
                continue;
            }

            this.syncSearchCard(search);
        }
    }

    completeSecuritySearch(search, target) {
        delete this.activeSearches[target.name];

        if (window.Phase2Bridge && window.Phase2Bridge.dismissAlert) {
            window.Phase2Bridge.dismissAlert(search.alertId, false);
        }

        target.status = 'ASSIGNED: THE BRIG';
        target.searchCompleted = true;
        const targetIdx = this.crew.indexOf(target);
        if (targetIdx !== -1) {
            this.updateOfficerCard(targetIdx, target);
        }

        let title = `[INSPECTION CLEAR] ${target.name.toUpperCase()}`;
        let msg = `Quarters search completed for <b>${target.name}</b> (${target.roleTitle}). Personal effects inspected. No contraband or sabotage gear found.`;
        let alertType = 'notice';

        if (target.trueIdentity === 'RESOURCE_HOARDER' && !target.hoardRecovered) {
            target.hoardRecovered = true;
            if (this.telemetry) {
                this.telemetry.food.rations = Math.min(100, (this.telemetry.food.rations || 40) + 15);
                this.telemetry.food.value = Math.min(100, this.telemetry.food.value + 15);
                this.telemetry.power.kw = Math.min(500, (this.telemetry.power.kw || 500) + 20);
                this.telemetry.power.value = Math.min(100, this.telemetry.power.value + 10);
                this.renderHUD();
            }
            title = `[CONTRABAND CONFISCATED] ${target.name.toUpperCase()}`;
            msg = `<b>Stolen Emergency Stores Recovered!</b> Stockpile of hoarded food rations and power batteries confiscated from ${target.name}'s footlocker (+15 Food, +20 kW Power restored).`;
            alertType = 'critical';
            this.logComms(`[CONTRABAND RECOVERED] Search of ${target.name}'s quarters revealed stolen provisions! Stores restored.`, "normal", "SEC");
        } else if (target.trueIdentity === 'DESPERATE_FRAUD') {
            title = `[FORGERY EXPOSED] ${target.name.toUpperCase()}`;
            msg = `<b>Counterfeit Papers Discovered!</b> Falsified professional accreditation and forged evacuation authorization found hidden under mattress.`;
            alertType = 'warning';
            this.logComms(`[SECURITY AUDIT] Forged credentials and altered transit visa found in ${target.name}'s footlocker!`, "normal", "SEC");
        } else if (target.trueIdentity === 'CONTAGIOUS_CARRIER') {
            title = `[BIOHAZARD FOUND] ${target.name.toUpperCase()}`;
            msg = `<b>Medical Contraband Discovered!</b> Concealed pathogen symptom suppressants and clinical vials found in personal kit.`;
            alertType = 'warning';
            this.logComms(`[BIOHAZARD RECOVERY] Concealed viral suppressants found in ${target.name}'s quarters!`, "normal", "SEC");
        } else if (target.trueIdentity === 'DOOMSDAY_SABOTEUR') {
            target.isDisarmed = true;
            target.saboteurNeutralized = true;
            title = `[SABOTEUR EXPOSED] ${target.name.toUpperCase()}`;
            alertType = 'critical';

            if (this.activeSabotage && !this.activeSabotage.isDefused && !this.activeSabotage.isDetonated) {
                this.resolveSabotage(true, 'Disarm codes found during Brig search');
                msg = `<b>Saboteur Caught & Bomb Disarmed!</b> Search uncovered hidden explosives and disarm codes on ${target.name}. Active bomb defused immediately!`;
            } else {
                msg = `<b>Explosives & Sabotage Gear Found!</b> Disarmed explosive timers and sabotage tools found in ${target.name}'s belongings. Saboteur neutralized!`;
            }
            this.logComms(`[SABOTEUR EXPOSED] Security search caught ${target.name} carrying hidden explosives and detonators! Threat eliminated.`, "normal", "SEC");
        } else {
            this.logComms(`[SECURITY INSPECTION] Quarters inspection complete for ${target.name}. All personal effects nominal.`, "normal", "SEC");
        }

        if (window.Phase2Bridge && window.Phase2Bridge.pushAlert) {
            window.Phase2Bridge.pushAlert({
                id: `search-result-${target.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
                type: alertType,
                tag: 'SEC',
                title: title,
                message: msg,
                autoExpireSec: 14
            });
        }

        if (window.SoundFX && window.SoundFX.playKeyClick) {
            window.SoundFX.playKeyClick(null, false);
        }

        if (window.Phase2Bridge) {
            window.Phase2Bridge.renderCrewManifest();
            window.Phase2Bridge.renderRoomOccupants();
            window.Phase2Bridge.renderSecurityConsole();
        }
    }

    /**
     * =========================================================================
     * STEP 6.4: DOOMSDAY SABOTEUR INCIDENT & 38-SECOND COUNTDOWN
     * =========================================================================
     */
    triggerSabotageIncident(saboteur) {
        if (this.activeSabotage) return this.activeSabotage;

        let targetStation = 'reactor';
        if (saboteur && saboteur.currentRoom) {
            const room = saboteur.currentRoom;
            if (room === 'hydroponics' || room === 'o2bay') {
                const deck4Stations = ['hydroponics', 'o2bay'];
                targetStation = deck4Stations[Math.floor(Math.random() * deck4Stations.length)];
            } else if (room === 'reactor' || room === 'brig' || room === 'workshop') {
                targetStation = 'reactor';
            } else if (room === 'cockpit' || room === 'medbay') {
                targetStation = 'cockpit';
            } else {
                const candidates = ['reactor', 'o2bay', 'hydroponics'];
                targetStation = candidates[Math.floor(Math.random() * candidates.length)];
            }
        } else {
            const candidates = ['reactor', 'o2bay', 'hydroponics'];
            targetStation = candidates[Math.floor(Math.random() * candidates.length)];
        }

        const stationNames = {
            reactor: 'Reactor Core',
            o2bay: 'Life Support / O2 Bay',
            hydroponics: 'Hydroponics Bay',
            cockpit: 'Flight Deck'
        };
        const stationName = stationNames[targetStation] || 'Reactor Core';

        const sabotage = {
            id: 'sabotage_explosive',
            targetStation: targetStation,
            stationName: stationName,
            tag: 'SAB',
            title: `BOMB DETECTED: ${stationName.toUpperCase()}`,
            saboteurName: saboteur ? saboteur.name : 'Unknown',
            totalTimer: 38.0, // Exactly 38 seconds
            timeRemaining: 38.0,
            resolveWorkRequired: 12.0, // 12 seconds base work to defuse
            workRemaining: 12.0,
            currentWorkRate: 0,
            activeDefusers: [],
            isDefused: false,
            isDetonated: false,
            alertId: 'sabotage-bomb-alert'
        };

        this.activeSabotage = sabotage;

        // Emergency alarm audio
        if (window.SoundFX && window.SoundFX.playCrisisAlert) {
            window.SoundFX.playCrisisAlert();
        } else if (window.SoundFX && window.SoundFX.playLaunchAlert) {
            window.SoundFX.playLaunchAlert();
        }

        // Comms log
        this.logComms(`[SECURITY EMERGENCY] Explosive charge detected in ${stationName}! 38-second detonation countdown started.`, "normal", "SEC");

        // Highlight target room
        const roomEl = document.querySelector(`.room-interactive-overlay[data-room-id="${targetStation}"]`);
        if (roomEl) {
            roomEl.classList.add('room-crisis-active');
        }

        this.syncSabotageCard();
        console.log(`[FLIGHT ENGINE] Doomsday Sabotage triggered in ${stationName}. 38.0s countdown.`);
        return sabotage;
    }

    updateSabotage(dt) {
        if (!this.activeSabotage || this.activeSabotage.isDefused || this.activeSabotage.isDetonated) return;
        if (this.speedMultiplier === 0) return;

        const sab = this.activeSabotage;
        sab.timeRemaining = Math.max(0, sab.timeRemaining - dt);

        // Find active living crew present in target compartment
        const occupants = this.crew.filter(c => !c.isDead && c.status !== 'DECEASED' && c.currentRoom === sab.targetStation && c.transitRemaining <= 0);
        // Non-panicked crew capable of acting
        const activeOccupants = occupants.filter(c => !this.hasCondition(c, 'PANIC_ATTACK'));

        // 2-PERSON DEFUSAL RULE: Always requires 2 sets of hands at the station (one manning station, one defusing)
        const hasTwoHands = activeOccupants.length >= 2;

        // Loyal defusers: non-panicked and not the undisarmed saboteur
        const loyalDefusers = activeOccupants.filter(c => c.name !== sab.saboteurName || c.isDisarmed);

        if (hasTwoHands && loyalDefusers.length > 0) {
            // Defusal rate: Core engineers or security guards defuse faster (1.5x), others at 1.0x
            const bestRate = Math.max(...loyalDefusers.map(d => {
                const isTechOrGuard = ['reactor', 'brig', 'workshop'].some(r => this.getOfficerStationTier(d, r) === 'Core');
                return isTechOrGuard ? 1.5 : 1.0;
            }));
            const extraDefusers = Math.max(0, loyalDefusers.length - 1);
            const stackBonus = 0.30 * extraDefusers;
            const totalRate = bestRate + stackBonus;

            sab.currentWorkRate = totalRate;
            sab.activeDefusers = loyalDefusers;
            sab.workRemaining = Math.max(0, sab.workRemaining - totalRate * dt);
        } else {
            sab.currentWorkRate = 0;
            sab.activeDefusers = [];
        }

        // Check if defused
        if (sab.workRemaining <= 0) {
            this.resolveSabotage(true);
            return;
        }

        // Check if detonated
        if (sab.timeRemaining <= 0) {
            this.resolveSabotage(false);
            return;
        }

        this.syncSabotageCard();
    }

    syncSabotageCard() {
        if (!window.Phase2Bridge || !window.Phase2Bridge.pushAlert || !this.activeSabotage) return;

        const sab = this.activeSabotage;
        const progressPercent = Math.min(100, Math.round(((sab.resolveWorkRequired - sab.workRemaining) / sab.resolveWorkRequired) * 100));
        const countdownSec = Math.max(0, Math.ceil(sab.timeRemaining));
        const timerVal = `${countdownSec}s`;

        const occupants = this.crew.filter(c => !c.isDead && c.status !== 'DECEASED' && c.currentRoom === sab.targetStation && c.transitRemaining <= 0);
        const enRoute = this.crew.filter(c => !c.isDead && (c.transitTarget === sab.targetStation || c.currentRoom === sab.targetStation) && c.transitRemaining > 0);
        const activeDefusers = sab.activeDefusers || [];

        let statusLine = '';

        if (activeDefusers.length > 0) {
            const estDefuseSec = (sab.workRemaining / sab.currentWorkRate).toFixed(1);
            const defuserName = activeDefusers[0].name.split(' ')[0];
            const stackNote = activeDefusers.length > 1 ? ` (+${activeDefusers.length - 1})` : '';

            statusLine = `
                <div style="margin-top: 5px; color: #38bdf8; font-weight: 600; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#38bdf8; box-shadow:0 0 6px #38bdf8;"></span>
                    Defusing: ${estDefuseSec}s to disarm (${defuserName}${stackNote}) · Detonation in ${countdownSec}s
                </div>
                <div class="crisis-progress-row">
                    <div class="crisis-progress-track">
                        <div class="crisis-progress-fill" style="width: ${progressPercent}%;"></div>
                    </div>
                    <span class="crisis-progress-percent">${progressPercent}%</span>
                </div>
            `;
        } else if (enRoute.length > 0) {
            const transitSec = Math.ceil(enRoute[0].transitRemaining);
            statusLine = `
                <div style="margin-top: 5px; color: #f0883e; font-weight: 600; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#f0883e; box-shadow:0 0 6px #f0883e;"></span>
                    Crew en route to defuse (${transitSec}s) · Detonation in ${countdownSec}s
                </div>
                <div class="crisis-progress-row">
                    <div class="crisis-progress-track">
                        <div class="crisis-progress-fill unmanned" style="width: ${progressPercent}%;"></div>
                    </div>
                    <span class="crisis-progress-percent unmanned">${progressPercent}%</span>
                </div>
            `;
        } else if (occupants.length > 0) {
            const activeOccupants = occupants.filter(c => !this.hasCondition(c, 'PANIC_ATTACK'));
            let reason = 'Requires 2 crew members (one manning, one defusing)';
            if (occupants.some(c => this.hasCondition(c, 'PANIC_ATTACK'))) {
                reason = 'Crew member panicked';
            } else if (activeOccupants.length >= 2 && !activeOccupants.some(c => c.name !== sab.saboteurName || c.isDisarmed)) {
                reason = 'Suspect refuses to defuse';
            } else if (activeOccupants.length < 2) {
                reason = 'Requires 2 crew members (one manning, one defusing)';
            }
            statusLine = `
                <div style="margin-top: 5px; color: #ff7b72; font-weight: 700; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#f85149; box-shadow:0 0 6px #f85149;"></span>
                    DEFUSAL PAUSED: ${reason} · Detonation in ${countdownSec}s
                </div>
                <div class="crisis-progress-row">
                    <div class="crisis-progress-track">
                        <div class="crisis-progress-fill unmanned" style="width: ${progressPercent}%;"></div>
                    </div>
                    <span class="crisis-progress-percent unmanned">${progressPercent}%</span>
                </div>
            `;
        } else {
            statusLine = `
                <div style="margin-top: 5px; color: #ff7b72; font-weight: 700; font-size: 10.5px; display: flex; align-items: center; gap: 4px;">
                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#f85149; box-shadow:0 0 6px #f85149;"></span>
                    ROOM EMPTY: Send 2 crew members to defuse · Detonation in ${countdownSec}s
                </div>
                <div class="crisis-progress-row">
                    <div class="crisis-progress-track">
                        <div class="crisis-progress-fill unmanned" style="width: ${progressPercent}%;"></div>
                    </div>
                    <span class="crisis-progress-percent unmanned">${progressPercent}%</span>
                </div>
            `;
        }

        const messageHtml = `
            <div style="margin-bottom: 2px;">An explosive device was planted in ${sab.stationName}!</div>
            <div style="font-size: 10px; color: #ff7b72; font-weight: 700;">DANGER: 38-second countdown — Defuse before detonation</div>
            ${statusLine}
        `;

        window.Phase2Bridge.pushAlert({
            id: sab.alertId,
            type: 'critical',
            tag: 'SAB',
            title: sab.title,
            message: messageHtml,
            targetRoom: sab.targetStation,
            actionLabel: `TARGET ${sab.stationName.toUpperCase()}`,
            timer: timerVal,
            isCrisis: true
        });
    }

    resolveSabotage(wasDefused, reason = '') {
        if (!this.activeSabotage) return;
        const sab = this.activeSabotage;

        // Remove room hazard glow
        const roomEl = document.querySelector(`.room-interactive-overlay[data-room-id="${sab.targetStation}"]`);
        if (roomEl) {
            roomEl.classList.remove('room-crisis-active');
        }

        // Dismiss the active bomb alert card
        if (window.Phase2Bridge && window.Phase2Bridge.dismissAlert) {
            window.Phase2Bridge.dismissAlert(sab.alertId, false);
        }

        if (wasDefused) {
            sab.isDefused = true;
            if (window.SoundFX && window.SoundFX.playKeyClick) {
                window.SoundFX.playKeyClick(null, false);
            }
            this.logComms(`[BOMB DEFUSED] Explosive in ${sab.stationName} successfully disarmed! ${reason || 'Ship is safe.'}`, "normal", "SEC");

            if (window.Phase2Bridge && window.Phase2Bridge.pushAlert) {
                window.Phase2Bridge.pushAlert({
                    id: 'sabotage-defused-notice',
                    type: 'notice',
                    tag: 'SEC',
                    title: `[BOMB DEFUSED] ${sab.stationName.toUpperCase()} SECURED`,
                    message: `The explosive in ${sab.stationName} was successfully disarmed. Ship is safe.`,
                    autoExpireSec: 12
                });
            }
        } else {
            sab.isDetonated = true;

            // Apply Detonation Penalties:
            // 1. -35% Hull Integrity
            if (this.telemetry && this.telemetry.hull) {
                this.telemetry.hull.value = Math.max(0, this.telemetry.hull.value - 35);
                if (this.telemetry.hull.value < 25) this.telemetry.hull.label = "BREACHED";
                else if (this.telemetry.hull.value < 60) this.telemetry.hull.label = "DAMAGED";
            }

            // 2. -30% Primary Station Resource
            if (this.telemetry) {
                if (sab.targetStation === 'reactor' && this.telemetry.power) {
                    this.telemetry.power.value = Math.max(0, this.telemetry.power.value - 30);
                    this.telemetry.power.kw = Math.max(0, Math.round(500 * (this.telemetry.power.value / 100)));
                } else if (sab.targetStation === 'o2bay' && this.telemetry.o2) {
                    this.telemetry.o2.value = Math.max(0, this.telemetry.o2.value - 30);
                } else if (sab.targetStation === 'hydroponics' && this.telemetry.food) {
                    this.telemetry.food.value = Math.max(0, this.telemetry.food.value - 30);
                    this.telemetry.food.rations = Math.max(0, Math.round(60 * (this.telemetry.food.value / 100)));
                } else if (sab.targetStation === 'cockpit' && this.telemetry.discipline) {
                    this.telemetry.discipline.value = Math.max(0, this.telemetry.discipline.value - 25);
                }
            }

            // 3. Crew blast damage (-40 HP for occupants in the compartment)
            const occupants = this.crew.filter(c => !c.isDead && c.currentRoom === sab.targetStation && c.transitRemaining <= 0);
            occupants.forEach((occ, idx) => {
                occ.hp = Math.max(0, occ.hp - 40);
                if (occ.hp <= 0) {
                    this.killOfficer(occ, idx, `Explosive blast in ${sab.stationName}`);
                }
            });

            this.logComms(`[DETONATION] Bomb in ${sab.stationName} exploded! -35% Hull damage sustained.`, "normal", "HULL");

            if (window.SoundFX && window.SoundFX.playLaunchAlert) {
                window.SoundFX.playLaunchAlert();
            }

            if (window.Phase2Bridge && window.Phase2Bridge.pushAlert) {
                window.Phase2Bridge.pushAlert({
                    id: 'sabotage-detonated-alert',
                    type: 'critical',
                    tag: 'HULL',
                    title: `[DETONATION] BOMB EXPLODED: ${sab.stationName.toUpperCase()}`,
                    message: `The explosive in ${sab.stationName} detonated! -35% Hull damage and severe room damage sustained.`,
                    autoExpireSec: 25
                });
            }

            this.updateVesselTelemetry(0);
            this.renderHUD();
        }

        this.activeSabotage = null;
    }
}

// Global Singleton
window.FlightEngine = new FlightEngineCore();
window.STATION_HAZARDS = STATION_HAZARDS;
window.PERSONNEL_CONDITIONS = PERSONNEL_CONDITIONS;

// Global Debug / Console API
window.triggerCrisis = function(stationId = 'random') {
    if (window.FlightEngine) {
        return window.FlightEngine.triggerCrisis(stationId);
    }
};

window.resolveCrisis = function(stationId) {
    if (window.FlightEngine) {
        window.FlightEngine.resolveCrisis(stationId);
    }
};

window.resolveAllCrises = function() {
    if (window.FlightEngine && window.FlightEngine.activeCrises) {
        const activeIds = Object.keys(window.FlightEngine.activeCrises);
        activeIds.forEach(id => window.FlightEngine.resolveCrisis(id));
    }
};

window.triggerPanic = function(targetName) {
    if (!window.FlightEngine || !window.FlightEngine.crew) return;
    const officer = targetName 
        ? window.FlightEngine.crew.find(c => c.name.toLowerCase().includes(targetName.toLowerCase()))
        : window.FlightEngine.crew[0];
    if (officer) {
        return window.FlightEngine.addCondition(officer, 'PANIC_ATTACK', 'Manual override');
    }
};

window.triggerInfection = function(targetName) {
    if (!window.FlightEngine || !window.FlightEngine.crew) return;
    const officer = targetName 
        ? window.FlightEngine.crew.find(c => c.name.toLowerCase().includes(targetName.toLowerCase()))
        : window.FlightEngine.crew[0];
    if (officer) {
        return window.FlightEngine.addCondition(officer, 'CONTAGIOUS_INFECTION', 'Manual override');
    }
};

window.triggerSabotage = function() {
    if (window.FlightEngine) {
        let sab = window.FlightEngine.crew.find(c => c.trueIdentity === 'DOOMSDAY_SABOTEUR' && !c.isDead);
        if (!sab) {
            sab = window.FlightEngine.crew[0];
        }
        if (sab) {
            window.FlightEngine.sabotageTriggered = true;
            return window.FlightEngine.triggerSabotageIncident(sab);
        }
    }
};

window.defuseSabotage = function() {
    if (window.FlightEngine && window.FlightEngine.activeSabotage) {
        return window.FlightEngine.resolveSabotage(true, 'Manual disarm override');
    }
};

window.cureOfficer = function(targetName, conditionId) {
    if (!window.FlightEngine || !window.FlightEngine.crew) return;
    const officer = window.FlightEngine.crew.find(c => c.name.toLowerCase().includes(targetName.toLowerCase()));
    if (officer) {
        if (conditionId) {
            return window.FlightEngine.removeCondition(officer, conditionId);
        } else if (officer.conditions) {
            Object.keys(officer.conditions).forEach(cid => window.FlightEngine.removeCondition(officer, cid));
            return true;
        }
    }
};

window.cureAll = function() {
    if (!window.FlightEngine || !window.FlightEngine.crew) return;
    window.FlightEngine.crew.forEach(o => {
        if (o.conditions) {
            Object.keys(o.conditions).forEach(cid => window.FlightEngine.removeCondition(o, cid));
        }
    });
};

window.killOfficer = function(targetName) {
    if (!window.FlightEngine || !window.FlightEngine.crew) return;
    const idx = targetName
        ? window.FlightEngine.crew.findIndex(c => c.name.toLowerCase().includes(targetName.toLowerCase()))
        : 0;
    if (idx !== -1) {
        return window.FlightEngine.killOfficer(window.FlightEngine.crew[idx], idx, 'Manual terminal directive');
    }
};

window.triggerWorkplaceInjury = function(targetName, bodyPart) {
    if (window.FlightEngine) {
        return window.FlightEngine.triggerWorkplaceInjury(targetName, bodyPart);
    }
};

window.triggerInjury = window.triggerWorkplaceInjury;

window.triggerCrewFriction = function(type, officerA, officerB) {
    if (window.FlightEngine) {
        return window.FlightEngine.triggerCrewFrictionEvent(type, officerA, officerB);
    }
};

window.resolveCrewFriction = function(reason) {
    if (window.FlightEngine) {
        return window.FlightEngine.resolveCrewFriction(reason);
    }
};
