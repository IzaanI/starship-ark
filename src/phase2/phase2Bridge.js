/**
 * PHASE2BRIDGE.JS — Phase I to Phase II Seamless Transition & Flight Hub
 * Starship Ark — Phase II: Flight Operations
 */

const SHIP_COMPARTMENTS = {
    cockpit: { id: "cockpit", name: "Cockpit (Helm)", deck: 6, maxOccupants: 2, tag: "NAV" },
    medbay: { id: "medbay", name: "Medbay", deck: 5, maxOccupants: 2, tag: "MED" },
    sleepPods: { id: "sleepPods", name: "Sleep Pods", deck: 5, maxOccupants: 2, tag: "REST" },
    hydroponics: { id: "hydroponics", name: "Hydroponics Bay", deck: 4, maxOccupants: 2, tag: "BIO" },
    o2bay: { id: "o2bay", name: "O2 Bay", deck: 4, maxOccupants: 2, tag: "O2" },
    brig: { id: "brig", name: "The Brig", deck: 2, maxOccupants: 2, tag: "SEC" },
    workshop: { id: "workshop", name: "Workshop / Stores", deck: 2, maxOccupants: 2, tag: "ENG" },
    reactor: { id: "reactor", name: "Reactor Core", deck: 1, maxOccupants: 2, tag: "PWR" }
};

class Phase2BridgeEngine {
    constructor() {
        this.starfield = null;
        this.crew = [];
        this.isLaunched = false;
        this.activeSpeed = 'cruise';
        this.boostActive = true;
        this.selectedOfficerIndex = null;
        this.compartments = SHIP_COMPARTMENTS;
        
        // Cache spritesheet for crew avatars
        this.hazmatImg = new Image();
        this.hazmatImg.src = 'assets/phase1/hazmat_bases_lit.png';
    }

    /**
     * Launch Phase II with the accepted crew from Phase I
     * @param {Object} launchData - { acceptedCrew: Array, autoLaunch: Boolean }
     */
    launch(launchData = {}) {
        if (this.isLaunched) return;
        this.isLaunched = true;

        // Auto-close terminal screen overlay if active
        if (typeof window.closeTerminal === 'function') {
            window.closeTerminal();
        }
        const termView = document.getElementById('terminal-screen-view');
        if (termView) {
            termView.classList.add('hidden');
        }

        const rawCrew = (launchData.acceptedCrew || window.acceptedCrew || []).slice(0, 6);
        console.log(`[PHASE 2 BRIDGE] Launching Phase II with ${rawCrew.length} recruited candidates.`);

        // Build the recruited officers manifest (Player is Commander at the Bridge, not an assignable piece)
        this.crew = this.buildCrewRoster(rawCrew);
        this.commander = {
            name: "Commander (You)",
            roleTitle: "Expedition Commander",
            station: "Bridge"
        };

        // 1. Play Launch Audio & Klaxons
        if (window.SoundFX) {
            SoundFX.playLaunchAlert();
            if (SoundFX.playTerminalOpen) SoundFX.playTerminalOpen();
        }

        // 2. Cinematic Screen Shake & Fade Out
        const gameContainer = document.getElementById('game-container');
        const overlay = document.getElementById('transition-overlay');

        if (gameContainer) gameContainer.classList.add('launch-shake');
        if (overlay) overlay.classList.add('active');

        // 3. Switch Viewports in total darkness
        setTimeout(() => {
            const roomView = document.getElementById('room-view');
            const phase2View = document.getElementById('phase2-viewport');

            if (roomView) roomView.style.display = 'none';
            if (phase2View) {
                phase2View.classList.remove('hidden');
                phase2View.style.display = 'flex';
            }

            // Remove desk shake
            if (gameContainer) gameContainer.classList.remove('launch-shake');

            // Initialize Phase 2 DOM & Canvas
            this.initPhase2DOM();

            // 4. Fade in to the Ark Flight Bridge
            setTimeout(() => {
                if (overlay) overlay.classList.remove('active');
                this.logEvent("ARK-04 FLIGHT CORE ONLINE", "normal", "SYS");
                this.logEvent("Atmospheric ascent successful. Orbital insertion complete.", "normal", "NAV");
                this.logEvent(`Complement: ${this.crew.length + 1} Souls aboard (1 Commander + ${this.crew.length} ${this.crew.length === 1 ? 'Officer' : 'Officers'}).`, "normal", "HELM");
                this.logEvent("Vector locked on TITAN HAVEN 4. ETA calculated at 06:40.", "cmd-echo", "ASTRO");

                // Start Core Simulation Engine (Step 3)
                if (window.FlightEngine) {
                    window.FlightEngine.start(this.crew);
                }
            }, 300);
        }, 1200);
    }

    buildCrewRoster(recruits = []) {
        const crewRoster = [];

        // Only accepted recruits appear in the manifest — no filler auxiliary crew
        for (let i = 0; i < recruits.length; i++) {
            const c = recruits[i];
            if (!c) continue;
            crewRoster.push({
                isPlayer: false,
                rawCandidate: c,
                name: c.name || `Officer #${i+1}`,
                station: c.station || "General",
                roleTitle: c.roleTitle || "Station Specialist",
                roleTier: c.roleTier || "Core", // Kept internally for simulation, hidden from UI
                stationAffinities: c.stationAffinities || {},
                avatarIndex: c.avatarIndex !== undefined ? c.avatarIndex : (i % 4),
                trueIdentity: c.trueIdentity || "LEGITIMATE_EXPERT",
                hp: 100,
                san: 100,
                eng: 100,
                status: "UNASSIGNED",
                currentRoom: null,
                transitTarget: null,
                transitRemaining: 0,
                transitTotal: 0
            });
        }

        return crewRoster;
    }

    initPhase2DOM() {
        // Start Starfield Engine
        if (typeof StarfieldEngine !== 'undefined') {
            this.starfield = new StarfieldEngine('phase2-starfield-canvas', {
                shipElement: document.getElementById('phase2-ship-container'),
                initialMode: this.activeSpeed
            });
            this.starfield.start();
        }

        // Render Left Crew Manifest
        this.renderCrewManifest();

        // Bind Time & Flight Controls
        this.bindControls();

        // Bind Compartment Click Events (Step 4)
        this.bindCompartmentEvents();

        // Render Initial Room Occupants
        this.renderRoomOccupants();
    }

    renderCrewManifest() {
        const container = document.getElementById('phase2-crew-roster');
        if (!container) return;
        container.innerHTML = '';

        // Dynamically update left manifest counter
        const counterEl = document.getElementById('phase2-manifest-counter');
        if (counterEl) {
            counterEl.textContent = `${this.crew.length} ${this.crew.length === 1 ? 'OFFICER' : 'OFFICERS'}`;
        }

        if (this.crew.length === 0) {
            container.innerHTML = `
                <div style="padding: 24px 12px; text-align: center; color: #8b949e; font-size: 12px; border: 1px dashed #21262d; border-radius: 4px; background: rgba(13, 22, 32, 0.4);">
                    <div style="color: #f0883e; font-weight: 600; margin-bottom: 4px;">NO RECRUITS ABOARD</div>
                    <div style="font-size: 11px; color: #6e7681;">Proceeding with solo commander flight</div>
                </div>
            `;
            return;
        }

        this.crew.forEach((officer, idx) => {
            const card = document.createElement('div');
            card.className = 'crew-card';
            card.id = `officer-card-${idx}`;

            // Create canvas for procedural face thumbnail
            const avatarCanvas = document.createElement('canvas');
            avatarCanvas.className = 'crew-avatar-mini';
            avatarCanvas.width = 46;
            avatarCanvas.height = 46;
            this.drawOfficerAvatar(avatarCanvas, officer.avatarIndex);

            const statusColor = (officer.status === 'RESTING IN QUARTERS') ? '#58a6ff' :
                                (officer.status === 'RESTED (READY)') ? '#3fb950' :
                                (officer.status === 'EXHAUSTED') ? '#f85149' :
                                (officer.status === 'FATIGUED') ? '#d29922' :
                                (officer.status === 'UNASSIGNED') ? '#d29922' : '#8b949e';

            card.innerHTML = `
                <div class="crew-info">
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <span class="crew-name">${officer.name}</span>
                    </div>
                    <div class="crew-role-badge">${officer.roleTitle}</div>
                    <div class="vitals-row">
                        <div class="vital-mini-bar" id="vital-hp-box-${idx}" title="Physical Health: ${Math.round(officer.hp)}%"><div class="vital-fill-hp" id="vital-hp-fill-${idx}" style="width: ${officer.hp}%"></div></div>
                        <div class="vital-mini-bar" id="vital-san-box-${idx}" title="Sanity: ${Math.round(officer.san)}%"><div class="vital-fill-san" id="vital-san-fill-${idx}" style="width: ${officer.san}%"></div></div>
                        <div class="vital-mini-bar" id="vital-eng-box-${idx}" title="Stamina: ${Math.round(officer.eng)}%"><div class="vital-fill-eng" id="vital-eng-fill-${idx}" style="width: ${officer.eng}%"></div></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                        <span class="officer-status-badge" id="officer-status-badge-${idx}" style="font-size: 10px; color: ${statusColor}; font-weight: 500;">${officer.status}</span>
                        <div style="display: flex; gap: 4px;">
                            <button class="officer-act-btn" onclick="Phase2Bridge.assignOfficer(${idx})">ORDER</button>
                            <button class="officer-act-btn" onclick="Phase2Bridge.restOfficer(${idx})">REST</button>
                        </div>
                    </div>
                </div>
            `;

            // Insert avatar canvas as first child of card
            card.insertBefore(avatarCanvas, card.firstChild);
            container.appendChild(card);
        });
    }

    /**
     * Procedural Officer Avatar Crop & Draw
     * ADJUSTMENT GUIDE FOR CANDIDATE AVATARS:
     * - colWidth: Width of each suit column in the 1024px spritesheet (256px)
     * - cropWidth / cropHeight: Source crop dimensions (keep equal 1:1 to match 46x46 canvas and avoid stretching)
     * - cropOffsetX: Horizontal shift within column (centers head: (colWidth - cropWidth)/2)
     * - cropOffsetY: Vertical start position down from sheet top (aligns helmet/visor)
     */
    drawOfficerAvatar(canvas, suitColIndex = 0) {
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const draw = () => {
            const colWidth = 1024 / 4;  // 256px per character column
            const cropWidth = 175;      // 1:1 aspect ratio (tweak to zoom in/out)
            const cropHeight = 175;     // 1:1 aspect ratio
            const cropOffsetX = Math.round((colWidth - cropWidth) / 2); // 40px (tweak to pan left/right)
            const cropOffsetY = 72;     // 72px (tweak to pan up/down)

            const sx = (suitColIndex % 4) * colWidth + cropOffsetX;
            const sy = cropOffsetY;
            const sw = cropWidth;
            const sh = cropHeight;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(this.hazmatImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

            // Subtle dark CRT tint overlay
            ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        };

        if (this.hazmatImg.complete && this.hazmatImg.naturalWidth > 0) {
            draw();
        } else {
            this.hazmatImg.onload = draw;
        }
    }

    bindControls() {
        const buttons = {
            pause: document.getElementById('phase2-btn-pause'),
            cruise: document.getElementById('phase2-btn-cruise'),
            warp: document.getElementById('phase2-btn-warp')
        };

        for (let mode in buttons) {
            if (buttons[mode]) {
                buttons[mode].addEventListener('click', () => {
                    this.setSpeed(mode);
                });
            }
        }
    }

    setSpeed(mode) {
        this.activeSpeed = mode;
        if (this.starfield) {
            this.starfield.setSpeedMode(mode);
            this.starfield.setBoostEnabled(mode !== 'pause');
        }

        // Forward to FlightEngine simulation tick
        if (window.FlightEngine) {
            window.FlightEngine.setSpeed(mode);
        }

        const buttons = {
            pause: document.getElementById('phase2-btn-pause'),
            cruise: document.getElementById('phase2-btn-cruise'),
            warp: document.getElementById('phase2-btn-warp')
        };

        for (let k in buttons) {
            if (buttons[k]) buttons[k].classList.remove('active');
        }
        if (buttons[mode]) buttons[mode].classList.add('active');

        let msg = '';
        if (mode === 'pause') msg = 'Thrusters idle. Transit speed halted (Simulation paused). Boost flame disengaged.';
        else if (mode === 'cruise') msg = 'Cruising speed engaged (1x Impulse). Boost torch active.';
        else if (mode === 'warp') msg = 'Cruising speed increased (2x Impulse). Boost torch active.';

        this.logEvent(msg, mode === 'pause' ? 'warn' : 'normal', 'HELM');
    }

    logEvent(text, type = 'normal', sender = 'SYS') {
        const logBox = document.getElementById('phase2-comms-log');
        if (!logBox) return;

        const entry = document.createElement('div');
        entry.className = 'log-entry';
        const now = new Date();
        const timeStr = `[${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}]`;

        let color = '#7ee787';
        if (type === 'warn') color = '#f0883e';
        else if (sender === 'HELM') color = '#79c0ff';
        else if (sender === 'NAV') color = '#388bfd';
        else if (sender === 'ASTRO') color = '#00f0ff';
        else if (sender === 'CMD') color = '#e3b341';
        else if (sender === 'MED') color = '#58a6ff';

        entry.innerHTML = `<span class="log-time">${timeStr}</span> <span style="color: ${color}; font-weight: bold;">${sender}:</span> ${text}`;
        logBox.appendChild(entry);
        logBox.scrollTop = logBox.scrollHeight;
    }

    selectOfficer(index) {
        if (this.selectedOfficerIndex === index) {
            this.cancelDispatch();
            return;
        }

        const officer = this.crew[index];
        if (!officer) return;

        // If in transit, cannot re-dispatch until transit completes
        if (officer.transitRemaining > 0) {
            this.logEvent(`${officer.name} is currently in transit. Please wait for arrival.`, "warn", "CMD");
            return;
        }

        this.selectedOfficerIndex = index;

        // Highlight card in left manifest
        this.crew.forEach((_, i) => {
            const card = document.getElementById(`officer-card-${i}`);
            if (card) {
                if (i === index) card.classList.add('card-selected');
                else card.classList.remove('card-selected');
            }
        });

        // Activate ship targeting mode
        const shipContainer = document.getElementById('phase2-ship-container');
        if (shipContainer) shipContainer.classList.add('dispatch-mode-active');

        // Show dispatch banner
        const banner = document.getElementById('dispatch-banner');
        const bannerText = document.getElementById('dispatch-banner-text');
        if (banner && bannerText) {
            banner.classList.remove('hidden');
            bannerText.textContent = `[DISPATCH: ${officer.name.toUpperCase()}] CLICK A COMPARTMENT TO ASSIGN`;
        }

        this.logEvent(`[DISPATCH] Click any compartment on the starship cutaway to assign ${officer.name}.`, "normal", "CMD");
        if (window.SoundFX && SoundFX.playKeyClick) SoundFX.playKeyClick(null, false);
    }

    cancelDispatch() {
        this.selectedOfficerIndex = null;
        this.crew.forEach((_, i) => {
            const card = document.getElementById(`officer-card-${i}`);
            if (card) card.classList.remove('card-selected');
        });

        const shipContainer = document.getElementById('phase2-ship-container');
        if (shipContainer) shipContainer.classList.remove('dispatch-mode-active');

        const banner = document.getElementById('dispatch-banner');
        if (banner) banner.classList.add('hidden');
    }

    getTransitDuration(fromRoomId, toRoomId) {
        if (!toRoomId) return 4;
        if (fromRoomId === toRoomId) return 0;
        const fromComp = this.compartments[fromRoomId];
        const toComp = this.compartments[toRoomId];
        if (!toComp) return 4;
        if (!fromComp) return 4; // coming from unassigned
        const deckDiff = Math.abs(fromComp.deck - toComp.deck);
        return Math.min(7, Math.max(3, Math.round(3 + deckDiff * 0.8)));
    }

    dispatchOfficer(officerIndex, targetRoomId) {
        const officer = this.crew[officerIndex];
        const toComp = this.compartments[targetRoomId];
        if (!officer || !toComp) return;

        // Check if officer is already stationed there
        if (officer.currentRoom === targetRoomId) {
            this.logEvent(`${officer.name} is already stationed at ${toComp.name}.`, "normal", "CMD");
            this.cancelDispatch();
            return;
        }

        // Check station capacity
        const currentOccupants = this.crew.filter(c => c.currentRoom === targetRoomId || c.transitTarget === targetRoomId);
        if (currentOccupants.length >= toComp.maxOccupants) {
            if (targetRoomId === 'sleepPods') {
                this.logEvent(`Sleep Pods at maximum capacity (2/2). Rotate a sleeping officer out first.`, "warn", "MED");
            } else {
                this.logEvent(`${toComp.name} is at maximum staff capacity (${toComp.maxOccupants}/${toComp.maxOccupants}).`, "warn", "CMD");
            }
            this.cancelDispatch();
            return;
        }

        const duration = this.getTransitDuration(officer.currentRoom, targetRoomId);

        // Remove from current room
        officer.currentRoom = null;
        officer.transitTarget = targetRoomId;
        officer.transitRemaining = duration;
        officer.transitTotal = duration;
        officer.status = `TRANSIT (${duration}s)`;

        if (window.FlightEngine) {
            window.FlightEngine.updateOfficerCard(officerIndex, officer);
        }

        this.logEvent(`Dispatch order authorized: ${officer.name} en route to ${toComp.name} (${duration}s transit).`, "normal", "CMD");
        if (window.SoundFX && SoundFX.playKeyClick) SoundFX.playKeyClick(null, true);

        this.cancelDispatch();
        this.renderRoomOccupants();
    }

    bindCompartmentEvents() {
        document.querySelectorAll('.room-interactive-overlay').forEach(el => {
            el.addEventListener('click', () => {
                const roomId = el.getAttribute('data-room-id');
                if (!roomId) return;

                if (this.selectedOfficerIndex !== null) {
                    this.dispatchOfficer(this.selectedOfficerIndex, roomId);
                } else {
                    const comp = this.compartments[roomId];
                    if (comp) {
                        const occs = this.crew.filter(c => c.currentRoom === roomId);
                        const enRoute = this.crew.filter(c => c.transitTarget === roomId);
                        if (occs.length > 0 || enRoute.length > 0) {
                            const stationedNames = occs.map(c => c.name).join(', ');
                            const enRouteNames = enRoute.map(c => `${c.name} (en route)`).join(', ');
                            const allNames = [stationedNames, enRouteNames].filter(Boolean).join('; ');
                            this.logEvent(`${comp.name} occupants: ${allNames}.`, "normal", comp.tag);
                        } else {
                            this.logEvent(`${comp.name} (${comp.deck}) is UNMANNED. Click 'ORDER' on an officer to dispatch here.`, "warn", comp.tag);
                        }
                    }
                }
            });
        });
    }

    renderRoomOccupants() {
        for (let key in this.compartments) {
            const comp = this.compartments[key];
            const occupants = this.crew.filter(c => c.currentRoom === key);
            const enRoute = this.crew.filter(c => c.transitTarget === key);

            // Update room capacity badge
            const badge = document.getElementById(`cap-badge-${key}`);
            if (badge) {
                const total = occupants.length + enRoute.length;
                badge.textContent = `${total}/${comp.maxOccupants}`;
                if (total >= comp.maxOccupants) {
                    badge.style.color = '#e3b341';
                    badge.style.borderColor = '#e3b341';
                } else if (total > 0) {
                    badge.style.color = '#56d364';
                    badge.style.borderColor = '#56d364';
                } else {
                    badge.style.color = '#8b949e';
                    badge.style.borderColor = '#1c2d3d';
                }
            }

            // Update occupants chips
            const container = document.getElementById(`occupants-${key}`);
            if (container) {
                container.innerHTML = '';

                occupants.forEach(officer => {
                    const token = document.createElement('div');
                    token.className = 'officer-token';
                    token.title = `${officer.name} (${officer.roleTitle}) — Active in ${comp.name}`;

                    // Mini procedural helmet avatar canvas (retina 36x36, CSS 18x18)
                    const avatarCanvas = document.createElement('canvas');
                    avatarCanvas.className = 'token-avatar';
                    avatarCanvas.width = 36;
                    avatarCanvas.height = 36;
                    this.drawOfficerAvatar(avatarCanvas, officer.avatarIndex);

                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'token-name';
                    nameSpan.textContent = officer.name.split(' ')[0];

                    token.appendChild(avatarCanvas);
                    token.appendChild(nameSpan);
                    container.appendChild(token);
                });

                enRoute.forEach(officer => {
                    const token = document.createElement('div');
                    token.className = 'officer-token in-transit';
                    token.title = `${officer.name} en route to ${comp.name} (${Math.ceil(officer.transitRemaining)}s)`;

                    // Mini procedural helmet avatar canvas
                    const avatarCanvas = document.createElement('canvas');
                    avatarCanvas.className = 'token-avatar';
                    avatarCanvas.width = 36;
                    avatarCanvas.height = 36;
                    this.drawOfficerAvatar(avatarCanvas, officer.avatarIndex);

                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'token-name';
                    nameSpan.textContent = officer.name.split(' ')[0];

                    const timerSpan = document.createElement('span');
                    timerSpan.className = 'token-transit-badge';
                    timerSpan.textContent = `${Math.ceil(officer.transitRemaining)}s`;

                    token.appendChild(avatarCanvas);
                    token.appendChild(nameSpan);
                    token.appendChild(timerSpan);
                    container.appendChild(token);
                });
            }
        }
    }

    assignOfficer(index) {
        this.selectOfficer(index);
    }

    restOfficer(index) {
        const officer = this.crew[index];
        if (!officer) return;

        if (officer.currentRoom === 'sleepPods' || officer.status === 'RESTING IN QUARTERS' || officer.status === 'RESTED (READY)') {
            // Rouse from sleep pods to unassigned
            officer.currentRoom = null;
            officer.transitTarget = null;
            officer.transitRemaining = 0;
            officer.status = 'UNASSIGNED';
            if (window.FlightEngine) {
                window.FlightEngine.updateOfficerCard(index, officer);
            }
            this.renderRoomOccupants();
            this.logEvent(`${officer.name} roused from sleep pod and returned to standby.`, 'normal', 'MED');
        } else {
            // Dispatch directly to Sleep Pods
            this.dispatchOfficer(index, 'sleepPods');
        }
    }
}

window.Phase2Bridge = new Phase2BridgeEngine();

// Quick Dev / Global Launch Trigger
window.triggerLaunchSequence = function() {
    window.Phase2Bridge.launch({ acceptedCrew: window.acceptedCrew || [] });
};
