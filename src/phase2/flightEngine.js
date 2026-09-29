/**
 * FLIGHTENGINE.JS — Core Flight Simulation, Time Controls & Vitals Engine
 * Starship Ark — Phase II: Flight Operations (Step 3)
 */

class FlightEngineCore {
    constructor() {
        this.isRunning = false;
        this.speedMultiplier = 1; // 0 = pause, 1 = 1x cruise, 2 = 2x cruise
        this.lastTime = 0;
        this.tickInterval = null;

        // Voyage Progression
        this.totalVoyageSeconds = 400; // 06:40 at 1x speed
        this.elapsedSeconds = 0;
        this.distancePercent = 0;

        // Global Vessel Telemetry (0 - 100 scale)
        this.telemetry = {
            power: { value: 88, max: 100, kw: 440, label: "Nominal", color: "#388bfd" },
            o2: { value: 96, max: 100, label: "Nominal", color: "#56d364" },
            food: { value: 80, max: 100, rations: 48, maxRations: 60, label: "Nominal", color: "#e3b341" },
            hull: { value: 100, max: 100, label: "Pressurized", color: "#2ea043" },
            discipline: { value: 85, max: 100, label: "Stable", color: "#a371f7" }
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
    }

    /**
     * Start the real-time flight simulation
     * @param {Array} crewRoster - Array of recruited officer objects from Phase2Bridge
     */
    start(crewRoster = []) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.crew = crewRoster;
        this.lastTime = performance.now();

        // 5Hz high-fidelity simulation tick (every 200ms)
        this.tickInterval = setInterval(() => {
            this.tick();
        }, 200);

        console.log(`[FLIGHT ENGINE] Simulation online. Destination: TITAN HAVEN 4. ETA: ${this.formatTime(this.totalVoyageSeconds)}.`);
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

        // 2. Simulate Vessel Resources & Telemetry Decay
        this.updateVesselTelemetry(effectiveDt);

        // 3. Simulate Crew Metabolism, Energy & Vitals
        this.updateCrewVitals(effectiveDt);

        // 4. Update Tactical HUD & Gauges
        this.renderHUD();
    }

    updateVoyageProgress(dt) {
        if (this.distancePercent >= 100) return;

        this.elapsedSeconds += dt;
        this.distancePercent = Math.min(100, (this.elapsedSeconds / this.totalVoyageSeconds) * 100);

        // Milestone Comms Announcements
        if (this.distancePercent >= 25 && !this.milestones.quarter) {
            this.milestones.quarter = true;
            this.logComms("Trans-Martian trajectory locked. Outer gate clear.", "normal", "NAV");
        } else if (this.distancePercent >= 50 && !this.milestones.halfway) {
            this.milestones.halfway = true;
            this.logComms("Halfway checkpoint reached. Long-range telemetry confirms Haven beacon active.", "normal", "ASTRO");
        } else if (this.distancePercent >= 75 && !this.milestones.threeQuarters) {
            this.milestones.threeQuarters = true;
            this.logComms("Saturnian gravity-assist corridor established. Vector nominal.", "normal", "NAV");
        } else if (this.distancePercent >= 100 && !this.milestones.arrival) {
            this.milestones.arrival = true;
            this.onArrival();
        }
    }

    updateVesselTelemetry(dt) {
        const t = this.telemetry;

        // A. Food Rations Consumption
        // Approx 1 ration consumed every ~30 seconds by the complement
        if (this.crew.length > 0) {
            this.rationAccumulator += dt * (this.crew.length / 6);
            if (this.rationAccumulator >= 30) {
                this.rationAccumulator -= 30;
                t.food.rations = Math.max(0, t.food.rations - 1);
                t.food.value = Math.round((t.food.rations / t.food.maxRations) * 100);
            }
        }

        // B. Oxygen Saturation (very slight background scrubber respiration drain)
        // Maintained nominal at 95-98%
        t.o2.value = Math.max(0, Math.min(100, t.o2.value - (0.015 * dt)));
        if (t.o2.value >= 90) t.o2.label = "Nominal";
        else if (t.o2.value >= 70) t.o2.label = "Acceptable";
        else if (t.o2.value >= 40) t.o2.label = "Low O2 Alert";
        else t.o2.label = "CRITICAL HYPOXIA";

        // C. Power Grid Telemetry (stable baseline with subtle reactor hum oscillation)
        t.power.kw = Math.round(t.power.value * 5);

        // D. Crew Discipline (weighted dynamically by average crew sanity)
        if (this.crew.length > 0) {
            const avgSan = this.crew.reduce((sum, c) => sum + c.san, 0) / this.crew.length;
            t.discipline.value = Math.round(avgSan * 0.85 + 10);
            if (t.discipline.value >= 80) t.discipline.label = "Stable";
            else if (t.discipline.value >= 50) t.discipline.label = "Tense";
            else t.discipline.label = "MUTINOUS PANIC";
        }
    }

    updateCrewVitals(dt) {
        let hasActiveTransit = false;

        this.crew.forEach((officer, idx) => {
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

                    const comp = (window.Phase2Bridge && window.Phase2Bridge.compartments) ? window.Phase2Bridge.compartments[officer.currentRoom] : null;

                    if (officer.currentRoom === 'sleepPods') {
                        officer.status = 'RESTING IN QUARTERS';
                        this.logComms(`${officer.name} arrived at Sleep Pods. Commencing rest & stamina cycle.`, "normal", "MED");
                    } else {
                        officer.status = `ASSIGNED: ${comp ? comp.name.toUpperCase() : 'DUTY'}`;
                        this.logComms(`${officer.name} arrived at ${comp ? comp.name : 'Station'}. Station manned.`, "normal", comp ? comp.tag : "SYS");
                    }

                    this.updateOfficerCard(idx, officer);
                    if (window.Phase2Bridge) {
                        window.Phase2Bridge.renderRoomOccupants();
                    }
                }
            }

            // 2. Station-Specific Metabolism & Recovery
            if (officer.currentRoom === 'sleepPods' || officer.status === 'RESTING IN QUARTERS') {
                // Sleep Pod: rapid stamina restoration and sanity recovery
                officer.eng = Math.min(100, officer.eng + (2.5 * dt)); // Full recovery in ~40s
                officer.san = Math.min(100, officer.san + (0.5 * dt));

                if (officer.eng >= 100 && officer.status === 'RESTING IN QUARTERS') {
                    officer.status = 'RESTED (READY)';
                    this.updateOfficerCard(idx, officer);
                }
            } else if (officer.currentRoom === 'medbay') {
                // Medbay: health recovery and slow energy drain
                officer.hp = Math.min(100, officer.hp + (1.5 * dt));
                officer.eng = Math.max(0, officer.eng - (0.12 * dt));
            } else if (officer.transitRemaining > 0) {
                // In transit through corridors: light stamina drain
                officer.eng = Math.max(0, officer.eng - (0.15 * dt));
            } else {
                // On active station duty or unassigned: standard duty stamina drain
                const drainRate = officer.currentRoom ? 0.22 : 0.15;
                officer.eng = Math.max(0, officer.eng - (drainRate * dt));

                // Fatigue and Exhaustion logic
                if (officer.eng === 0) {
                    // Total exhaustion: begins degrading sanity and health
                    officer.san = Math.max(0, officer.san - (0.4 * dt));
                    officer.hp = Math.max(0, officer.hp - (0.2 * dt));
                    if (officer.status !== 'EXHAUSTED') {
                        officer.status = 'EXHAUSTED';
                        this.updateOfficerCard(idx, officer);
                        this.logComms(`${officer.name} has collapsed from physical exhaustion! Rotate to Sleep Pods to rest.`, "warn", "MED");
                    }
                } else if (officer.eng < 25 && officer.status === 'UNASSIGNED') {
                    officer.status = 'FATIGUED';
                    this.updateOfficerCard(idx, officer);
                } else if (officer.eng >= 30 && officer.status === 'FATIGUED') {
                    officer.status = 'UNASSIGNED';
                    this.updateOfficerCard(idx, officer);
                }
            }
        });

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

        // 2. Telemetry Gauges on Right HUD
        this.updateGaugeDOM('power', `${this.telemetry.power.value}% (${this.telemetry.power.kw} kW)`, this.telemetry.power.value);
        this.updateGaugeDOM('o2', `${Math.round(this.telemetry.o2.value)}% (${this.telemetry.o2.label})`, this.telemetry.o2.value);
        this.updateGaugeDOM('food', `${this.telemetry.food.value}% (${this.telemetry.food.rations} Rations)`, this.telemetry.food.value);
        this.updateGaugeDOM('hull', `${this.telemetry.hull.value}% (${this.telemetry.hull.label})`, this.telemetry.hull.value);
        this.updateGaugeDOM('discipline', `${this.telemetry.discipline.value}% (${this.telemetry.discipline.label})`, this.telemetry.discipline.value);

        // 3. Mini Crew Vitals in Left Manifest
        this.crew.forEach((officer, idx) => {
            const hpFill = document.getElementById(`vital-hp-fill-${idx}`);
            const sanFill = document.getElementById(`vital-san-fill-${idx}`);
            const engFill = document.getElementById(`vital-eng-fill-${idx}`);
            const hpBox = document.getElementById(`vital-hp-box-${idx}`);
            const sanBox = document.getElementById(`vital-san-box-${idx}`);
            const engBox = document.getElementById(`vital-eng-box-${idx}`);

            if (hpFill) hpFill.style.width = `${Math.round(officer.hp)}%`;
            if (sanFill) sanFill.style.width = `${Math.round(officer.san)}%`;
            if (engFill) engFill.style.width = `${Math.round(officer.eng)}%`;

            if (hpBox) hpBox.title = `Physical Health: ${Math.round(officer.hp)}%`;
            if (sanBox) sanBox.title = `Sanity: ${Math.round(officer.san)}%`;
            if (engBox) engBox.title = `Stamina: ${Math.round(officer.eng)}%`;
        });
    }

    updateGaugeDOM(key, textVal, percent) {
        const txtEl = document.getElementById(`gauge-txt-${key}`);
        const barEl = document.getElementById(`gauge-bar-${key}`);

        if (txtEl) {
            txtEl.textContent = textVal;
            if (percent < 30) txtEl.style.color = '#f85149'; // Critical Red
            else if (percent < 60) txtEl.style.color = '#d29922'; // Warning Amber
        }
        if (barEl) {
            barEl.style.width = `${Math.max(0, Math.min(100, percent))}%`;
            if (percent < 30) barEl.style.background = '#f85149';
            else if (percent < 60) barEl.style.background = '#d29922';
        }
    }

    updateOfficerCard(idx, officer) {
        const badge = document.getElementById(`officer-status-badge-${idx}`);
        if (!badge) return;

        badge.textContent = officer.status;
        if (officer.status.startsWith('TRANSIT')) {
            badge.style.color = '#f0883e';
        } else if (officer.status.startsWith('ASSIGNED')) {
            badge.style.color = '#38bdf8';
        } else if (officer.status === 'EXHAUSTED') {
            badge.style.color = '#f85149';
        } else if (officer.status === 'FATIGUED') {
            badge.style.color = '#d29922';
        } else if (officer.status === 'RESTING IN QUARTERS') {
            badge.style.color = '#58a6ff';
        } else if (officer.status === 'RESTED (READY)') {
            badge.style.color = '#3fb950';
        } else if (officer.status === 'UNASSIGNED') {
            badge.style.color = '#d29922';
        } else {
            badge.style.color = '#8b949e';
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
}

// Global Singleton
window.FlightEngine = new FlightEngineCore();
