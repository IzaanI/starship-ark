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
        this.activeSpeed = 'pause'; // Start in PAUSE mode so player can calmly plan and assign stations
        this.boostActive = false;
        this.selectedOfficerIndex = null;
        this.compartments = SHIP_COMPARTMENTS;
        this.alerts = [];
        this.alertCounter = 0;
        
        // Cache spritesheet for crew avatars
        this.hazmatImg = new Image();
        this.hazmatImg.src = 'assets/phase1/hazmat_bases_lit.png';

        // Crew Ambient Wandering Animation State
        this.wanderState = {};
        this.wanderAnimId = null;

        // Active Alert Auto-Dismiss Timers (keyed by alert.id)
        this.alertTimers = {};

        // Security Console Airlock Confirmation State
        this.airlockConfirmTarget = null;
        this.airlockConfirmTimeout = null;
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

            // 4. Fade in to the Ark Flight Bridge in PAUSED Standby Mode
            setTimeout(() => {
                if (overlay) overlay.classList.remove('active');

                // Start Core Simulation Engine in standby / paused mode
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

            const primaryStation = c.station || "Reactor";
            const primaryTier = c.roleTier || c.tier || "Core";
            const affinities = (c.stationAffinities && Object.keys(c.stationAffinities).length > 0)
                ? c.stationAffinities
                : (typeof CandidateGenerator !== 'undefined' && CandidateGenerator.buildStationAffinities
                    ? CandidateGenerator.buildStationAffinities(primaryStation, c.roleTitle || "", primaryTier)
                    : { [primaryStation]: primaryTier });

            const weightLbs = (c.weightLbs && c.weightLbs > 0)
                ? c.weightLbs
                : (c.rawCandidate && c.rawCandidate.weightLbs ? c.rawCandidate.weightLbs : Math.floor(Math.random() * 80 + 130));

            crewRoster.push({
                isPlayer: false,
                rawCandidate: c,
                name: c.name || `Officer #${i+1}`,
                station: primaryStation,
                roleTitle: c.roleTitle || "Station Specialist",
                roleTier: primaryTier, // Kept internally for simulation, hidden from UI
                stationAffinities: affinities,
                avatarIndex: c.avatarIndex !== undefined ? c.avatarIndex : (i % 4),
                trueIdentity: c.trueIdentity || "LEGITIMATE_EXPERT",
                weightLbs: weightLbs,
                hp: 100,
                san: 100,
                eng: 100,
                conditions: {},
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

        // Render Initial Alert Dashboard
        this.renderAlertBoard();

        // Start Ambient Crew Wandering Animation Loop
        this.startWanderLoop();

        // Render Bottom Left Security & Brig Console
        this.renderSecurityConsole();
    }

    renderCrewManifest() {
        const container = document.getElementById('phase2-crew-roster');
        if (!container) return;
        container.innerHTML = '';

        // Dynamically update left manifest counter (reporting living officers and casualties)
        const livingCount = this.crew.filter(c => !c.isDead && c.status !== 'DECEASED').length;
        const deadCount = this.crew.length - livingCount;
        const counterEl = document.getElementById('phase2-manifest-counter');
        if (counterEl) {
            if (deadCount > 0) {
                counterEl.innerHTML = `${livingCount} ALIVE <span style="color:#f85149; font-weight:700;">(${deadCount} CASUALTY)</span>`;
            } else {
                counterEl.textContent = `${this.crew.length} ${this.crew.length === 1 ? 'OFFICER' : 'OFFICERS'}`;
            }
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

            const isDead = officer.isDead || officer.status === 'DECEASED';
            if (isDead) {
                card.classList.add('crew-card-deceased');
            }

            // Create canvas for procedural face thumbnail
            const avatarCanvas = document.createElement('canvas');
            avatarCanvas.className = 'crew-avatar-mini';
            avatarCanvas.width = 46;
            avatarCanvas.height = 46;
            this.drawOfficerAvatar(avatarCanvas, officer.avatarIndex);

            const isPanicked = (officer.conditions && officer.conditions['PANIC_ATTACK']) || (window.FlightEngine && window.FlightEngine.hasCondition(officer, 'PANIC_ATTACK'));
            const isContagious = (officer.conditions && officer.conditions['CONTAGIOUS_INFECTION']) || (window.FlightEngine && window.FlightEngine.hasCondition(officer, 'CONTAGIOUS_INFECTION'));
            const isTransit = officer.status && officer.status.startsWith('TRANSIT');
            const isUnassigned = officer.status === 'UNASSIGNED';

            let displayStatus = officer.status;
            let statusColor = '#8b949e';
            let statusWeight = '500';
            let statusLetterSpacing = 'normal';

            if (isDead) {
                displayStatus = 'DECEASED';
                statusColor = '#f85149';
                statusWeight = '700';
                statusLetterSpacing = '0.5px';
            } else if (isTransit) {
                statusColor = '#f0883e';
                statusWeight = '600';
            } else if (isPanicked) {
                displayStatus = 'PANICKED (FROZEN)';
                statusColor = '#f85149';
                statusWeight = '700';
                statusLetterSpacing = '0.5px';
            } else if (isContagious) {
                displayStatus = 'CONTAGIOUS (SYMPTOMATIC)';
                statusColor = '#e3b341';
                statusWeight = '700';
                statusLetterSpacing = '0.5px';
            } else if (officer.isDetained || (officer.status && officer.status.startsWith('DETAINED'))) {
                displayStatus = officer.status || 'DETAINED (BRIG)';
                statusColor = '#d29922';
                statusWeight = '700';
                statusLetterSpacing = '0.5px';
            } else if (officer.status === 'RESTING IN QUARTERS') {
                statusColor = '#58a6ff';
            } else if (officer.status === 'RESTED (READY)') {
                statusColor = '#3fb950';
                statusWeight = '600';
            } else if (officer.status === 'EXHAUSTED') {
                statusColor = '#f85149';
                statusWeight = '600';
            } else if (officer.status === 'FATIGUED') {
                statusColor = '#d29922';
            } else if (isUnassigned) {
                statusColor = '#ff3333';
                statusWeight = '700';
                statusLetterSpacing = '0.5px';
            }

            // Click anywhere on the card to select/dispatch this officer (unless deceased)
            card.onclick = () => {
                if (officer.isDead || officer.status === 'DECEASED') return;
                this.assignOfficer(idx);
            };

            const hpVal = Math.round(officer.hp);
            const sanVal = Math.round(officer.san);
            const engVal = Math.round(officer.eng);
            const padNum = String(idx + 1).padStart(2, '0');

            card.innerHTML = `
                <div class="crew-row-num">${padNum}</div>
                <div class="crew-row-avatar-box"></div>
                <div class="crew-row-identity">
                    <div class="crew-name">${officer.name}</div>
                    <div class="crew-role-badge">${officer.roleTitle}</div>
                </div>
                <div class="crew-row-vitals">
                    <div class="vital-stat">
                        <span class="vital-lbl">HP</span>
                        <span class="vital-num" id="vital-hp-val-${idx}">${hpVal}</span>
                    </div>
                    <div class="vital-stat">
                        <span class="vital-lbl">SAN</span>
                        <span class="vital-num" id="vital-san-val-${idx}">${sanVal}</span>
                    </div>
                    <div class="vital-stat">
                        <span class="vital-lbl">ENG</span>
                        <span class="vital-num" id="vital-eng-val-${idx}">${engVal}</span>
                    </div>
                    <!-- Hidden DOM compatibility layers for flightEngine HUD update -->
                    <div style="display:none;" id="vital-hp-box-${idx}"><div id="vital-hp-fill-${idx}"></div></div>
                    <div style="display:none;" id="vital-san-box-${idx}"><div id="vital-san-fill-${idx}"></div></div>
                    <div style="display:none;" id="vital-eng-box-${idx}"><div id="vital-eng-fill-${idx}"></div></div>
                </div>
                <div class="crew-row-status">
                    <span class="officer-status-badge" id="officer-status-badge-${idx}" style="color: ${statusColor}; font-weight: ${statusWeight}; letter-spacing: ${statusLetterSpacing};">${displayStatus}</span>
                    <button class="unassign-btn" id="btn-unassign-${idx}" style="display: ${(!isUnassigned && !isDead ? 'inline-block' : 'none')};" onclick="event.stopPropagation(); Phase2Bridge.unassignOfficer(${idx})" title="Unassign ${officer.name} to standby pool">UNASSIGN</button>
                </div>
            `;

            // Insert avatar canvas into avatar box
            const avatarBox = card.querySelector('.crew-row-avatar-box');
            if (avatarBox) {
                avatarBox.appendChild(avatarCanvas);
            } else {
                card.insertBefore(avatarCanvas, card.firstChild);
            }
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
    }

    pushAlert(alertData = {}) {
        // Never allow unsolicited deficit warning cards to enter alerts dashboard
        if (alertData.type === 'warning' && (alertData.title?.toUpperCase().includes('DEFICIT') || alertData.message?.toUpperCase().includes('DEFICIT'))) {
            return null;
        }

        const id = alertData.id || `alert-${++this.alertCounter}`;
        const existingIdx = this.alerts.findIndex(a => a.id === id);

        // Clear any previous auto-expire timer for this alert id to prevent race condition/premature dismiss
        if (this.alertTimers && this.alertTimers[id]) {
            clearTimeout(this.alertTimers[id]);
            delete this.alertTimers[id];
        }

        const now = new Date();
        const timeStr = `[${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}]`;

        const alert = {
            id: id,
            type: alertData.type || 'notice', // 'critical' | 'warning' | 'notice' | 'milestone'
            tag: alertData.tag || 'SYS',
            title: alertData.title || 'SYSTEM NOTICE',
            message: alertData.message || '',
            timestamp: alertData.timestamp || timeStr,
            targetRoom: alertData.targetRoom || null,
            actionLabel: alertData.actionLabel || null,
            onAction: alertData.onAction || null,
            noActionBtn: !!alertData.noActionBtn,
            timer: alertData.timer !== undefined ? alertData.timer : null,
            isCrisis: !!alertData.isCrisis
        };

        if (existingIdx !== -1) {
            this.alerts[existingIdx] = alert;
        } else {
            this.alerts.unshift(alert);
        }

        // Sort priority: Critical (0) > Warning (1) > Milestone (2) > Notice (3)
        const priority = { critical: 0, warning: 1, milestone: 2, notice: 3 };
        this.alerts.sort((a, b) => (priority[a.type] ?? 4) - (priority[b.type] ?? 4));

        // Auto expire for routine notices if specified
        if (alertData.autoExpireSec && !alert.isCrisis) {
            this.alertTimers[id] = setTimeout(() => {
                delete this.alertTimers[id];
                this.dismissAlert(id, false);
            }, alertData.autoExpireSec * 1000);
        }

        // Audio feedback (only for newly registered alert cards, not tick updates; crisis hazards play directly in triggerCrisis)
        if (existingIdx === -1 && window.SoundFX && !alert.isCrisis) {
            if (alert.type === 'critical' && window.SoundFX.playCrisisAlert) {
                window.SoundFX.playCrisisAlert();
            } else if (alert.type === 'critical' && window.SoundFX.playLaunchAlert) {
                window.SoundFX.playLaunchAlert();
            } else if (alert.type === 'warning' && window.SoundFX.playKeyClick) {
                window.SoundFX.playKeyClick(null, true);
            }
        }

        this.renderAlertBoard();
        return id;
    }

    dismissAlert(id, playSound = true) {
        if (this.alertTimers && this.alertTimers[id]) {
            clearTimeout(this.alertTimers[id]);
            delete this.alertTimers[id];
        }

        const card = document.getElementById(`alert-card-${id}`);
        if (card) {
            card.classList.add('dismissing');
        }

        const removeDelay = (card && card.parentNode) ? 180 : 0;
        const doDismiss = () => {
            const idx = this.alerts.findIndex(a => a.id === id);
            if (idx !== -1) {
                this.alerts.splice(idx, 1);
            }
            if (card && card.parentNode) {
                card.remove();
            }
            this.renderAlertBoard();
        };

        if (removeDelay > 0) {
            setTimeout(doDismiss, removeDelay);
        } else {
            doDismiss();
        }

        if (playSound && window.SoundFX && SoundFX.playKeyClick) {
            SoundFX.playKeyClick(null, false);
        }
    }

    clearAllNotices() {
        // Clear all active timers
        if (this.alertTimers) {
            for (let timerId in this.alertTimers) {
                clearTimeout(this.alertTimers[timerId]);
            }
            this.alertTimers = {};
        }

        // Clear all active alerts of all types
        this.alerts = [];
        this.renderAlertBoard();
        if (window.SoundFX && SoundFX.playKeyClick) {
            SoundFX.playKeyClick(null, false);
        }
    }

    targetRoom(roomId) {
        if (!roomId) return;
        const el = document.querySelector(`.room-interactive-overlay[data-room-id="${roomId}"]`);
        if (el) {
            el.classList.remove('room-target-highlight');
            void el.offsetWidth; // trigger reflow
            el.classList.add('room-target-highlight');
            setTimeout(() => el.classList.remove('room-target-highlight'), 1800);

            // If an officer is currently selected, dispatch them!
            if (this.selectedOfficerIndex !== null) {
                this.dispatchOfficer(this.selectedOfficerIndex, roomId);
            }
        }
    }

    handleAlertAction(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (!alert) return;

        if (typeof alert.onAction === 'function') {
            alert.onAction();
        } else if (alert.targetRoom) {
            this.targetRoom(alert.targetRoom);
        }
    }

    renderAlertBoard() {
        const container = document.getElementById('phase2-alerts-container');
        const badge = document.getElementById('alert-counter-badge');
        if (!container) return;

        // Update count badge
        if (badge) {
            badge.textContent = this.alerts.length;
            badge.className = 'alert-counter-badge';
            if (this.alerts.length === 0) {
                badge.classList.add('zero');
            } else if (this.alerts.some(a => a.type === 'critical')) {
                badge.classList.add('critical');
            } else if (this.alerts.some(a => a.type === 'warning')) {
                badge.classList.add('warning');
            }
        }

        // If no alerts, show neutral standby card
        if (this.alerts.length === 0) {
            if (!container.querySelector('.empty-incidents-card')) {
                container.innerHTML = `
                    <div class="empty-incidents-card">
                        <div class="empty-incidents-dot"></div>
                        <div class="empty-incidents-content">
                            <div class="empty-incidents-title">NOTHING TO REPORT</div>
                            <div class="empty-incidents-sub">Incident queue clear. Operational telemetry monitoring.</div>
                        </div>
                    </div>
                `;
            }
            return;
        }

        // If transitioning from 0 alerts, remove the empty incidents card
        const emptyCard = container.querySelector('.empty-incidents-card') || container.querySelector('.all-systems-nominal-card');
        if (emptyCard) {
            emptyCard.remove();
        }

        // Surgical DOM synchronization
        // 1. Remove elements no longer in this.alerts (unless in middle of dismissing)
        const currentIds = new Set(this.alerts.map(a => a.id));
        const domCards = Array.from(container.querySelectorAll('.alert-card'));
        domCards.forEach(cardEl => {
            const cardId = cardEl.getAttribute('data-alert-id');
            if (cardId && !currentIds.has(cardId) && !cardEl.classList.contains('dismissing')) {
                cardEl.remove();
            }
        });

        // 2. Insert or update cards in sorted order
        this.alerts.forEach((alert, index) => {
            let card = document.getElementById(`alert-card-${alert.id}`);
            const tagClass = `tag-${alert.type}`;
            const timerDisplay = alert.timer !== null
                ? (String(alert.timer).endsWith('s') ? alert.timer : `${alert.timer}s`)
                : null;
            const timerHtml = timerDisplay !== null 
                ? `<span class="alert-timer">${timerDisplay}</span>` 
                : `<span class="alert-time">${alert.timestamp}</span>`;

            const dismissHtml = alert.isCrisis 
                ? '' 
                : `<button class="alert-dismiss-btn" onclick="Phase2Bridge.dismissAlert('${alert.id}')" title="Dismiss">✕</button>`;

            let actionHtml = '';
            if (!alert.noActionBtn && (alert.actionLabel || alert.targetRoom)) {
                const label = alert.actionLabel || `TARGET ${alert.targetRoom.toUpperCase()}`;
                actionHtml = `<button class="alert-action-btn" onclick="Phase2Bridge.handleAlertAction('${alert.id}')">${label}</button>`;
            }

            const innerHtmlContent = `
                <div class="alert-header-row">
                    <span class="alert-tag ${tagClass}">${alert.tag}</span>
                    <span class="alert-title" title="${alert.title}">${alert.title}</span>
                    <div class="alert-meta">
                        ${timerHtml}
                        ${dismissHtml}
                    </div>
                </div>
                <div class="alert-body">${alert.message}</div>
                ${actionHtml}
            `;

            if (!card) {
                // New card: create and insert at current sorted index
                card = document.createElement('div');
                card.className = `alert-card alert-${alert.type}`;
                card.id = `alert-card-${alert.id}`;
                card.setAttribute('data-alert-id', alert.id);
                card.innerHTML = innerHtmlContent;

                const referenceNode = container.children[index] || null;
                container.insertBefore(card, referenceNode);
            } else {
                // Existing card: update only if content actually changed
                if (card.innerHTML !== innerHtmlContent) {
                    card.innerHTML = innerHtmlContent;
                }
                // Maintain correct position in DOM without re-triggering entry animation
                if (container.children[index] !== card) {
                    const referenceNode = container.children[index] || null;
                    container.insertBefore(card, referenceNode);
                }
            }
        });
    }

    logEvent(text, type = 'normal', sender = 'SYS') {
        // Strictly filter out routine dispatches, assignments, speed notices, and normal chatter
        if (type !== 'warn' && type !== 'critical') {
            return;
        }

        // Never generate deficit alert cards in alerts panel
        if (text.toUpperCase().includes('DEFICIT')) {
            return;
        }

        // Crisis hazards, crew incidents, and medical conditions already have dedicated authoritative cards; suppress generic duplicates
        const upper = text.toUpperCase();
        if (upper.includes('CRITICAL HAZARD') || 
            upper.includes('CRISIS RESOLVED') || 
            upper.includes('CRISIS') ||
            upper.includes('CREW INCIDENT') ||
            upper.includes('PANIC') ||
            upper.includes('CONTAGION') ||
            upper.includes('INFECTION') ||
            upper.includes('MEDICAL') ||
            upper.includes('EXHAUSTION') ||
            upper.includes('COLLAPSED')) {
            return;
        }

        const cleanMsg = text.replace(/^\[.*?\]\s*/, '');

        this.pushAlert({
            type: type === 'critical' ? 'critical' : 'warning',
            tag: sender,
            title: type === 'critical' ? 'CRITICAL ALERT' : 'SYSTEM WARNING',
            message: cleanMsg
        });
    }

    selectOfficer(index) {
        if (this.selectedOfficerIndex === index) {
            this.cancelDispatch();
            return;
        }

        const officer = this.crew[index];
        if (!officer || officer.isDead || officer.status === 'DECEASED') return;

        // If in transit, clicking their card immediately cancels transit and returns them to previous position!
        if (officer.transitRemaining > 0) {
            this.cancelTransit(index);
            return;
        }

        this.selectedOfficerIndex = index;
        this.airlockConfirmTarget = null;
        this.renderSecurityConsole();

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

        // Show dispatch banner with unassign option if officer is stationed
        const banner = document.getElementById('dispatch-banner');
        const bannerText = document.getElementById('dispatch-banner-text');
        const unassignBtn = document.getElementById('dispatch-btn-unassign');
        if (banner && bannerText) {
            banner.classList.remove('hidden');
            bannerText.textContent = `[ASSIGN: ${officer.name.toUpperCase()}] CLICK ANY COMPARTMENT OR SLEEP PODS`;
        }
        if (unassignBtn) {
            if (officer.currentRoom || officer.transitTarget) {
                unassignBtn.classList.remove('hidden');
                unassignBtn.textContent = `UNASSIGN ${officer.name.split(' ')[0].toUpperCase()} TO STANDBY`;
            } else {
                unassignBtn.classList.add('hidden');
            }
        }

        if (window.SoundFX && SoundFX.playKeyClick) SoundFX.playKeyClick(null, false);
    }

    cancelTransit(index) {
        const officer = this.crew[index];
        if (!officer || officer.transitRemaining <= 0) return;

        const prevRoom = officer.previousRoom;
        officer.transitRemaining = 0;
        officer.transitTotal = 0;
        officer.transitTarget = null;

        if (prevRoom && this.compartments[prevRoom]) {
            officer.currentRoom = prevRoom;
            const comp = this.compartments[prevRoom];
            if (prevRoom === 'sleepPods') {
                officer.status = 'RESTING IN QUARTERS';
            } else {
                officer.status = `ASSIGNED: ${comp.name.toUpperCase()}`;
            }
        } else {
            // Came from unassigned standby
            officer.currentRoom = null;
            officer.status = 'UNASSIGNED';
        }

        officer.previousRoom = null;

        if (window.FlightEngine) {
            window.FlightEngine.updateOfficerCard(index, officer);
            window.FlightEngine.updateVesselTelemetry(0);
            window.FlightEngine.renderHUD();
        }

        this.cancelDispatch();
        this.renderRoomOccupants();
        this.renderCrewManifest();
        if (window.SoundFX && SoundFX.playKeyClick) SoundFX.playKeyClick(null, true);
    }

    unassignOfficer(index) {
        const officer = this.crew[index];
        if (!officer) return;

        const fromRoom = officer.currentRoom || officer.transitTarget;
        delete this.wanderState[officer.name];
        officer.currentRoom = null;
        officer.transitTarget = null;
        officer.transitRemaining = 0;
        officer.transitTotal = 0;
        officer.previousRoom = null;
        officer.status = 'UNASSIGNED';

        if (window.FlightEngine) {
            window.FlightEngine.updateOfficerCard(index, officer);
            window.FlightEngine.updateVesselTelemetry(0);
            window.FlightEngine.renderHUD();
            if (fromRoom && window.FlightEngine.activeCrises && window.FlightEngine.activeCrises[fromRoom]) {
                window.FlightEngine.syncCrisisCard(window.FlightEngine.activeCrises[fromRoom]);
            }
        }

        this.cancelDispatch();
        this.renderRoomOccupants();
        this.renderCrewManifest();

        if (window.SoundFX && SoundFX.playKeyClick) SoundFX.playKeyClick(null, true);
    }

    unassignSelectedOfficer() {
        if (this.selectedOfficerIndex !== null) {
            this.unassignOfficer(this.selectedOfficerIndex);
        }
    }

    cancelDispatch() {
        this.selectedOfficerIndex = null;
        this.airlockConfirmTarget = null;
        this.renderSecurityConsole();
        this.crew.forEach((_, i) => {
            const card = document.getElementById(`officer-card-${i}`);
            if (card) card.classList.remove('card-selected');
        });

        const shipContainer = document.getElementById('phase2-ship-container');
        if (shipContainer) shipContainer.classList.remove('dispatch-mode-active');

        const banner = document.getElementById('dispatch-banner');
        if (banner) banner.classList.add('hidden');

        const unassignBtn = document.getElementById('dispatch-btn-unassign');
        if (unassignBtn) unassignBtn.classList.add('hidden');
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
        if (!officer || officer.isDead || officer.status === 'DECEASED' || !toComp) return;

        // Check if officer is already stationed there: clicking their current post unassigns them!
        if (officer.currentRoom === targetRoomId) {
            this.unassignOfficer(officerIndex);
            return;
        }

        // Check station capacity (excluding deceased officers)
        const currentOccupants = this.crew.filter(c => !c.isDead && c.status !== 'DECEASED' && (c.currentRoom === targetRoomId || c.transitTarget === targetRoomId));
        if (currentOccupants.length >= toComp.maxOccupants) {
            this.cancelDispatch();
            return;
        }

        const duration = this.getTransitDuration(officer.currentRoom, targetRoomId);
        const fromRoom = officer.currentRoom;

        // Remember previous position for instant travel cancellation
        officer.previousRoom = fromRoom || null;
        delete this.wanderState[officer.name];
        officer.currentRoom = null;
        officer.transitTarget = targetRoomId;
        officer.transitRemaining = duration;
        officer.transitTotal = duration;
        officer.status = `TRANSIT (${duration}s)`;

        if (window.FlightEngine) {
            window.FlightEngine.updateOfficerCard(officerIndex, officer);
            window.FlightEngine.updateVesselTelemetry(0);
            window.FlightEngine.renderHUD();
        }

        if (window.SoundFX && SoundFX.playKeyClick) SoundFX.playKeyClick(null, true);

        this.cancelDispatch();
        this.renderRoomOccupants();
        this.renderCrewManifest();
    }

    bindCompartmentEvents() {
        document.querySelectorAll('.room-interactive-overlay').forEach(el => {
            el.addEventListener('click', () => {
                const roomId = el.getAttribute('data-room-id');
                if (!roomId) return;

                if (this.selectedOfficerIndex !== null) {
                    this.dispatchOfficer(this.selectedOfficerIndex, roomId);
                } else {
                    this.showStationSummary(roomId);
                }
            });
        });
    }

    showStationSummary(roomId) {
        const comp = this.compartments[roomId];
        if (!comp) return;

        const occupants = this.crew.filter(c => !c.isDead && c.status !== 'DECEASED' && c.currentRoom === roomId && c.transitRemaining <= 0);
        const enRoute = this.crew.filter(c => !c.isDead && c.status !== 'DECEASED' && c.transitTarget === roomId);
        const metrics = (window.FlightEngine && window.FlightEngine.getStationDrainRate)
            ? window.FlightEngine.getStationDrainRate(roomId)
            : null;

        let message = '';
        if (roomId === 'sleepPods') {
            if (occupants.length === 0 && enRoute.length === 0) {
                message = `Quarters vacant (0/${comp.maxOccupants}). Select an officer from manifest to order rest & stamina recovery (+1.8%/s).`;
            } else {
                const occNames = occupants.map(c => `${c.name} (${Math.round(c.eng)}% Stamina)`).join(', ');
                const enRouteText = enRoute.length > 0 ? ` [${enRoute.map(c => c.name).join(', ')} en route]` : '';
                message = `Resting: ${occNames || 'None'}${enRouteText}. Resting crew members regenerate stamina.`;
            }
        } else {
            if (occupants.length === 0 && enRoute.length === 0) {
                if (roomId === 'reactor') {
                    message = `UNMANNED (0/${comp.maxOccupants}). Power Grid bleeding at maximum rate (-0.22%/s). Station a reactor specialist to stabilize.`;
                } else if (roomId === 'o2bay') {
                    message = `UNMANNED (0/${comp.maxOccupants}). Oxygen Reserves bleeding at maximum rate (-0.22%/s). Station a life support officer to stabilize.`;
                } else if (roomId === 'hydroponics') {
                    message = `UNMANNED (0/${comp.maxOccupants}). Food Stores bleeding at maximum rate (-0.22%/s). Station a botanist/horticulturist to stabilize.`;
                } else if (roomId === 'cockpit') {
                    message = `UNMANNED (0/${comp.maxOccupants}). Helm unmonitored. Cruising along baseline trajectory.`;
                } else if (roomId === 'medbay') {
                    message = `STANDBY (0/${comp.maxOccupants}). Medical recovery station vacant. Restores physical trauma (HP) to resting crew.`;
                } else if (roomId === 'workshop') {
                    message = `STANDBY (0/${comp.maxOccupants}). Engineering tools and maintenance stores on standby for vessel repairs.`;
                } else if (roomId === 'brig') {
                    message = `STANDBY (0/${comp.maxOccupants}). Security post vacant. Stationing a guard maintains crew discipline and order.`;
                } else {
                    message = `Compartment currently unmanned (0/${comp.maxOccupants}). Select an officer to assign here.`;
                }
            } else {
                const occDetails = occupants.map(c => {
                    const tier = this.getOfficerStationTier(c, roomId);
                    let label = "DEFICIT";
                    if (tier === "Core") label = "OPTIMAL";
                    else if (tier === "Adjacent" || tier === "Stretch") label = "OKAY";
                    return `${c.name} (${label})`;
                }).join(', ');

                const enRouteText = enRoute.length > 0 ? ` [En route: ${enRoute.map(c => `${c.name} - ${Math.ceil(c.transitRemaining)}s`).join(', ')}]` : '';
                const rateText = (metrics && metrics.drainRate !== undefined) ? ` | Net Drain: -${metrics.drainRate}%/s` : '';

                message = `Assigned (${occupants.length}/${comp.maxOccupants}): ${occDetails}${enRouteText}${rateText}.`;
            }
        }

        // Push or update station summary notice card
        this.pushAlert({
            id: 'station-summary',
            type: 'notice',
            tag: comp.tag,
            title: `${comp.name.toUpperCase()} (DECK ${comp.deck})`,
            message: message,
            autoExpireSec: 10
        });

        if (window.SoundFX && SoundFX.playKeyClick) {
            SoundFX.playKeyClick(null, false);
        }
    }

    getOfficerStationTier(officer, roomId) {
        if (window.FlightEngine && window.FlightEngine.getOfficerStationTier) {
            return window.FlightEngine.getOfficerStationTier(officer, roomId);
        }
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

        if (officer.stationAffinities && typeof officer.stationAffinities === 'object') {
            for (const [key, tier] of Object.entries(officer.stationAffinities)) {
                if (normalizeStation(key) === normalizedTarget) {
                    return tier;
                }
            }
        }

        if (officer.station) {
            const normalizedPrimary = normalizeStation(officer.station);
            if (normalizedPrimary === normalizedTarget) {
                return officer.roleTier || "Core";
            }
        }

        return "Mismatched";
    }

    renderRoomOccupants() {
        for (let key in this.compartments) {
            const comp = this.compartments[key];
            const occupants = this.crew.filter(c => !c.isDead && c.status !== 'DECEASED' && c.currentRoom === key);
            const enRoute = this.crew.filter(c => !c.isDead && c.status !== 'DECEASED' && c.transitTarget === key);

            // Update room capacity badge with operational status label (without drain percent clutter)
            const badge = document.getElementById(`cap-badge-${key}`);
            if (badge) {
                const total = occupants.length + enRoute.length;
                if (key === 'sleepPods') {
                    if (total === 0) {
                        badge.textContent = `0/${comp.maxOccupants} VACANT`;
                        badge.style.color = '#8b949e';
                        badge.style.borderColor = '#1c2d3d';
                    } else if (total === 1) {
                        badge.textContent = `1/${comp.maxOccupants} RESTING`;
                        badge.style.color = '#58a6ff';
                        badge.style.borderColor = '#58a6ff';
                    } else {
                        badge.textContent = `2/${comp.maxOccupants} FULL`;
                        badge.style.color = '#e3b341';
                        badge.style.borderColor = '#e3b341';
                    }
                } else {
                    if (total === 0) {
                        badge.textContent = `0/${comp.maxOccupants} UNMANNED`;
                        badge.style.color = '#f0883e';
                        badge.style.borderColor = 'rgba(240, 136, 62, 0.4)';
                    } else if (total === 1) {
                        const officer = occupants[0] || enRoute[0];
                        const tier = this.getOfficerStationTier(officer, key);
                        let statusLabel = "DEFICIT";
                        if (tier === "Core") statusLabel = "OPTIMAL";
                        else if (tier === "Adjacent" || tier === "Stretch") statusLabel = "OKAY";

                        badge.textContent = `1/${comp.maxOccupants} ${statusLabel}`;
                        if (statusLabel === 'OPTIMAL') {
                            badge.style.color = '#3fb950';
                            badge.style.borderColor = 'rgba(63, 185, 80, 0.5)';
                        } else if (statusLabel === 'OKAY') {
                            badge.style.color = '#58a6ff';
                            badge.style.borderColor = 'rgba(88, 166, 255, 0.5)';
                        } else {
                            badge.style.color = '#d29922';
                            badge.style.borderColor = 'rgba(210, 153, 34, 0.5)';
                        }
                    } else {
                        badge.textContent = `2/${comp.maxOccupants} STACKED`;
                        badge.style.color = '#00f0ff';
                        badge.style.borderColor = 'rgba(0, 240, 255, 0.5)';
                    }
                }
            }

            // Update tooltip tag (name and deck only, no drain rates)
            const tagEl = document.querySelector(`.room-interactive-overlay[data-room-id="${key}"] .room-tooltip-tag`);
            if (tagEl) {
                tagEl.textContent = `${comp.deck ? 'DECK ' + comp.deck + ': ' : ''}${comp.name.toUpperCase()}`;
            }

            // Update occupants chips
            const isStatic = (key === 'cockpit' || key === 'sleepPods');
            const container = document.getElementById(`occupants-${key}`);
            if (container) {
                container.innerHTML = '';
                container.className = isStatic ? 'room-occupants static-occupants' : 'room-occupants wandering-occupants';

                occupants.forEach((officer, occIdx) => {
                    const token = document.createElement('div');
                    token.className = 'officer-token';
                    token.id = `token-officer-${officer.name.replace(/\s+/g, '-')}`;
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

                    const isPanicked = (officer.conditions && officer.conditions['PANIC_ATTACK']) || (window.FlightEngine && window.FlightEngine.hasCondition(officer, 'PANIC_ATTACK'));
                    const isContagious = (officer.conditions && officer.conditions['CONTAGIOUS_INFECTION']) || (window.FlightEngine && window.FlightEngine.hasCondition(officer, 'CONTAGIOUS_INFECTION'));
                    if (isPanicked) token.classList.add('token-panicked');
                    if (isContagious) token.classList.add('token-contagious');

                    if (!isStatic) {
                        let wander = this.wanderState[officer.name];
                        if (!wander || wander.roomId !== key) {
                            wander = {
                                roomId: key,
                                ratio: occIdx === 0 ? (0.10 + Math.random() * 0.15) : (0.65 + Math.random() * 0.15),
                                direction: occIdx === 0 ? 1 : -1,
                                speed: 0.07 + Math.random() * 0.04,
                                state: 'walk',
                                pauseTimer: 0,
                                nextPauseIn: 2.5 + Math.random() * 4.5,
                                staggerBottom: occIdx === 1 ? 2 : 0,
                                zIndex: occIdx === 1 ? 27 : 26
                            };
                            this.wanderState[officer.name] = wander;
                        }

                        token.style.bottom = `${wander.staggerBottom}px`;
                        token.style.zIndex = wander.zIndex;

                        // Immediate initial placement if width is known
                        if (container.clientWidth) {
                            const maxTravel = Math.max(0, container.clientWidth - 72);
                            token.style.transform = `translateX(${(wander.ratio * maxTravel).toFixed(1)}px)`;
                        }
                    }

                    container.appendChild(token);
                });

                enRoute.forEach((officer, enRouteIdx) => {
                    const token = document.createElement('div');
                    token.className = 'officer-token in-transit';
                    token.style.cursor = 'pointer';
                    token.title = `${officer.name} en route to ${comp.name} (${Math.ceil(officer.transitRemaining)}s) — Click to cancel transit`;

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

                    const officerIndex = this.crew.indexOf(officer);
                    token.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.cancelTransit(officerIndex);
                    });

                    token.appendChild(avatarCanvas);
                    token.appendChild(nameSpan);
                    token.appendChild(timerSpan);

                    if (!isStatic) {
                        token.style.left = `${enRouteIdx * 78}px`;
                        token.style.bottom = '0px';
                        token.style.zIndex = 28;
                    }

                    container.appendChild(token);
                });
            }
        }

        // Keep security console synced with room occupancy
        this.renderSecurityConsole();
    }

    startWanderLoop() {
        if (this.wanderAnimId) return;

        let lastTimestamp = performance.now();

        const loop = (timestamp) => {
            const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
            lastTimestamp = timestamp;

            this.updateWanderingCrew(dt);

            this.wanderAnimId = requestAnimationFrame(loop);
        };

        this.wanderAnimId = requestAnimationFrame(loop);
    }

    updateWanderingCrew(dt) {
        if (!this.compartments || !this.crew) return;

        const STATIC_ROOMS = new Set(['cockpit', 'sleepPods']);

        for (let key in this.compartments) {
            if (STATIC_ROOMS.has(key)) continue;

            const container = document.getElementById(`occupants-${key}`);
            if (!container) continue;

            const containerWidth = container.clientWidth;
            if (!containerWidth) continue;

            const occupants = this.crew.filter(c => !c.isDead && c.status !== 'DECEASED' && c.currentRoom === key && c.transitRemaining <= 0);
            if (occupants.length === 0) continue;

            occupants.forEach((officer, occIdx) => {
                let wander = this.wanderState[officer.name];
                if (!wander || wander.roomId !== key) {
                    wander = {
                        roomId: key,
                        ratio: occIdx === 0 ? 0.15 : 0.70,
                        direction: occIdx === 0 ? 1 : -1,
                        speed: 0.07 + Math.random() * 0.04,
                        state: 'walk',
                        pauseTimer: 0,
                        nextPauseIn: 2.5 + Math.random() * 4.5,
                        staggerBottom: occIdx === 1 ? 2 : 0,
                        zIndex: occIdx === 1 ? 27 : 26
                    };
                    this.wanderState[officer.name] = wander;
                }

                const tokenEl = document.getElementById(`token-officer-${officer.name.replace(/\s+/g, '-')}`);
                if (!tokenEl) return;

                const tokenWidth = tokenEl.offsetWidth || 72;
                const maxTravel = Math.max(0, containerWidth - tokenWidth);

                if (maxTravel <= 4) {
                    tokenEl.style.transform = 'translateX(0px)';
                    return;
                }

                // Personnel Conditions (Freeze Panicked, Highlight Contagious)
                const isPanicked = (officer.conditions && officer.conditions['PANIC_ATTACK']) || (window.FlightEngine && window.FlightEngine.hasCondition(officer, 'PANIC_ATTACK'));
                const isContagious = (officer.conditions && officer.conditions['CONTAGIOUS_INFECTION']) || (window.FlightEngine && window.FlightEngine.hasCondition(officer, 'CONTAGIOUS_INFECTION'));

                if (isPanicked) {
                    tokenEl.classList.add('token-panicked');
                    tokenEl.classList.remove('token-paused');
                    const posX = wander.ratio * maxTravel;
                    tokenEl.style.transform = `translateX(${posX.toFixed(1)}px)`;
                    return; // Paralyzed at console/room; no movement
                } else {
                    tokenEl.classList.remove('token-panicked');
                }

                if (isContagious) {
                    tokenEl.classList.add('token-contagious');
                } else {
                    tokenEl.classList.remove('token-contagious');
                }

                // Update wander state & random pause logic
                if (wander.state === 'pause') {
                    wander.pauseTimer -= dt;
                    if (!tokenEl.classList.contains('token-paused')) {
                        tokenEl.classList.add('token-paused');
                    }
                    if (wander.pauseTimer <= 0) {
                        wander.state = 'walk';
                        tokenEl.classList.remove('token-paused');
                        wander.nextPauseIn = 3.0 + Math.random() * 5.0; // Walk for 3 to 8s
                        if (Math.random() < 0.35) {
                            wander.direction *= -1; // Occasional direction change after pause
                        }
                    }
                } else {
                    if (tokenEl.classList.contains('token-paused')) {
                        tokenEl.classList.remove('token-paused');
                    }
                    wander.nextPauseIn -= dt;
                    if (wander.nextPauseIn <= 0) {
                        wander.state = 'pause';
                        wander.pauseTimer = 1.5 + Math.random() * 2.5; // Pause for 1.5 to 4.0s
                    } else {
                        wander.ratio += wander.direction * wander.speed * dt;

                        // Turn around smoothly at edges
                        if (wander.ratio >= 1.0) {
                            wander.ratio = 1.0;
                            wander.direction = -1;
                            if (Math.random() < 0.30) {
                                wander.state = 'pause';
                                wander.pauseTimer = 1.0 + Math.random() * 1.5;
                            }
                        } else if (wander.ratio <= 0.0) {
                            wander.ratio = 0.0;
                            wander.direction = 1;
                            if (Math.random() < 0.30) {
                                wander.state = 'pause';
                                wander.pauseTimer = 1.0 + Math.random() * 1.5;
                            }
                        }
                    }
                }

                const posX = wander.ratio * maxTravel;
                tokenEl.style.transform = `translateX(${posX.toFixed(1)}px)`;
            });
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

    /**
     * =========================================================================
     * STEP 6.3: THE BRIG & SECURITY OFFICER PROTOCOLS
     * =========================================================================
     */
    renderSecurityConsole() {
        const container = document.getElementById('phase2-security-console');
        if (!container) return;

        // Find active guard assigned to the Brig (not detained, not panicked)
        const brigOccupants = this.crew.filter(c => !c.isDead && c.status !== 'DECEASED' && c.currentRoom === 'brig' && c.transitRemaining <= 0);
        const guard = brigOccupants.find(c => !c.isDetained && !(window.FlightEngine && window.FlightEngine.hasCondition(c, 'PANIC_ATTACK')));
        const hasGuard = !!guard;

        // Find currently selected target from manifest
        const targetIdx = this.selectedOfficerIndex;
        const target = (targetIdx !== null) ? this.crew[targetIdx] : null;
        const isTargetValid = target && !target.isDead && target.status !== 'DECEASED';

        const guardNameText = hasGuard ? guard.name.toUpperCase() : 'POST VACANT (ASSIGN GUARD)';
        const targetNameText = isTargetValid ? `${target.name.toUpperCase()} (${target.roleTitle})` : 'SELECT OFFICER IN ROSTER';

        const isEjectConfirming = this.airlockConfirmTarget !== null && this.airlockConfirmTarget === targetIdx;

        // Check if target is undergoing active search
        const isTargetBeingSearched = window.FlightEngine && window.FlightEngine.activeSearches && target && !!window.FlightEngine.activeSearches[target.name];
        const otherGuards = brigOccupants.filter(c => c !== target && !c.isDetained && !(window.FlightEngine && window.FlightEngine.hasCondition(c, 'PANIC_ATTACK')));
        const isSelfGuardWithoutPeer = (target === guard && otherGuards.length === 0);

        // Action button enable/disable states
        const restDisabled = !isTargetValid || target.currentRoom === 'sleepPods';
        const medbayDisabled = !isTargetValid || target.currentRoom === 'medbay';
        const searchDisabled = !hasGuard || !isTargetValid || isSelfGuardWithoutPeer || isTargetBeingSearched;
        const ejectDisabled = !hasGuard || !isTargetValid;

        let searchTooltip = 'Move officer to The Brig and audit personal effects for contraband';
        if (!hasGuard) {
            searchTooltip = 'Station guard at Brig on Deck 4 to authorize quarters search';
        } else if (isSelfGuardWithoutPeer) {
            searchTooltip = 'A security officer cannot search themselves (station 2nd officer in Brig)';
        } else if (isTargetBeingSearched) {
            searchTooltip = 'Security search currently underway in The Brig';
        }

        const searchBtnLabel = isTargetBeingSearched ? 'SEARCHING...' : 'SEARCH RECORD';

        let viewfinderHtml = '';
        if (isTargetValid) {
            const currentLoc = target.currentRoom
                ? (this.compartments[target.currentRoom] ? this.compartments[target.currentRoom].name : target.currentRoom)
                : (target.transitTarget ? `TRANSIT (${Math.ceil(target.transitRemaining)}s)` : 'UNASSIGNED');

            const isPanicked = (target.conditions && target.conditions['PANIC_ATTACK']) || (window.FlightEngine && window.FlightEngine.hasCondition(target, 'PANIC_ATTACK'));
            const isContagious = (target.conditions && target.conditions['CONTAGIOUS_INFECTION']) || (window.FlightEngine && window.FlightEngine.hasCondition(target, 'CONTAGIOUS_INFECTION'));
            let statusTag = 'NOMINAL';
            let tagColor = '#3fb950';
            if (isPanicked) { statusTag = 'PANICKED'; tagColor = '#f85149'; }
            else if (isContagious) { statusTag = 'CONTAGIOUS'; tagColor = '#e3b341'; }

            viewfinderHtml = `
                <div class="vf-target-info">
                    <div class="vf-target-name">${target.name.toUpperCase()}</div>
                    <div class="vf-target-role">${target.roleTitle.toUpperCase()}</div>
                    <div class="vf-target-detail">POST: <span style="color:#58a6ff;">${currentLoc.toUpperCase()}</span></div>
                    <div class="vf-target-detail">COND: <span style="color:${tagColor};">${statusTag}</span></div>
                </div>
            `;
        } else {
            viewfinderHtml = `
                <div class="vf-empty-text">NO OFFICER SELECTED</div>
            `;
        }

        container.innerHTML = `
            <div class="security-header">
                <div class="security-title-wrap">
                    <span class="security-title">[SEC] OFFICER DIRECTIVES</span>
                </div>
                <span class="sec-status-badge ${hasGuard ? 'active' : 'standby'}">
                    ${hasGuard ? 'GUARD ACTIVE' : 'BRIG UNMANNED'}
                </span>
            </div>

            <div class="security-body">
                <div class="security-guard-info">
                    <span class="sec-label">BRIG GUARD:</span>
                    <span class="sec-val" style="color: ${hasGuard ? '#3fb950' : '#f0883e'};">${guardNameText}</span>
                </div>
                <div class="security-target-row">
                    <span class="sec-label">TARGET:</span>
                    <span class="sec-val-target" title="${isTargetValid ? target.name : ''}">${targetNameText}</span>
                </div>
            </div>

            <div class="security-bottom-split">
                <div class="sec-actions-col">
                    <button id="btn-sec-rest" class="sec-action-btn rest-btn" ${restDisabled ? 'disabled' : ''} onclick="Phase2Bridge.restTargetOfficer()" title="Dispatch selected officer to Sleep Pods for rest & stamina recovery">
                        <span class="sec-btn-num">01</span>
                        <span class="sec-btn-txt">ASSIGN TO REST</span>
                    </button>
                    <button id="btn-sec-medbay" class="sec-action-btn medbay-btn" ${medbayDisabled ? 'disabled' : ''} onclick="Phase2Bridge.medbayTargetOfficer()" title="Dispatch selected officer to Medbay for medical treatment">
                        <span class="sec-btn-num">02</span>
                        <span class="sec-btn-txt">MEDICAL REVIEW</span>
                    </button>
                    <button id="btn-sec-search" class="sec-action-btn search-btn" ${searchDisabled ? 'disabled' : ''} onclick="Phase2Bridge.searchTargetOfficer()" title="${searchTooltip}">
                        <span class="sec-btn-num">03</span>
                        <span class="sec-btn-txt">${searchBtnLabel}</span>
                    </button>
                    <button id="btn-sec-eject" class="sec-action-btn eject-btn ${isEjectConfirming ? 'eject-confirm' : ''}" ${ejectDisabled ? 'disabled' : ''} onclick="Phase2Bridge.ejectTargetOfficer()" title="${!hasGuard ? 'Station guard at Brig on Deck 4 to authorize airlock ejection' : 'Executive Directive: Expel selected officer through security airlock'}">
                        <span class="sec-btn-num">04</span>
                        <span class="sec-btn-txt">${isEjectConfirming ? 'CONFIRM EJECT?' : 'REJECT / EJECT'}</span>
                    </button>
                </div>

                <div class="sec-viewfinder-col">
                    <div class="target-viewfinder">
                        <div class="vf-corner tl"></div>
                        <div class="vf-corner tr"></div>
                        <div class="vf-corner bl"></div>
                        <div class="vf-corner br"></div>
                        ${viewfinderHtml}
                    </div>
                </div>
            </div>
        `;
    }

    restTargetOfficer() {
        if (this.selectedOfficerIndex === null) {
            this.pushAlert({
                id: 'sec-notice',
                type: 'warning',
                tag: 'REST',
                title: 'OFFICER DIRECTIVES',
                message: 'Select an officer from the manifest to send to Sleep Pods.',
                autoExpireSec: 6
            });
            return;
        }

        const targetIdx = this.selectedOfficerIndex;
        const target = this.crew[targetIdx];
        if (!target || target.isDead || target.status === 'DECEASED') return;

        if (target.currentRoom === 'sleepPods') {
            this.pushAlert({
                id: 'sec-notice',
                type: 'notice',
                tag: 'REST',
                title: 'ALREADY RESTING',
                message: `${target.name} is already resting in the Sleep Pods.`,
                autoExpireSec: 6
            });
            return;
        }

        this.dispatchOfficer(targetIdx, 'sleepPods');
        if (window.FlightEngine && window.FlightEngine.logComms) {
            window.FlightEngine.logComms(`${target.name} dispatched to Sleep Pods for rest & stamina recovery.`, "normal", "REST");
        }
        this.renderCrewManifest();
        this.renderRoomOccupants();
        this.renderSecurityConsole();
    }

    medbayTargetOfficer() {
        if (this.selectedOfficerIndex === null) {
            this.pushAlert({
                id: 'sec-notice',
                type: 'warning',
                tag: 'MED',
                title: 'OFFICER DIRECTIVES',
                message: 'Select an officer from the manifest to transfer to Medbay.',
                autoExpireSec: 6
            });
            return;
        }

        const targetIdx = this.selectedOfficerIndex;
        const target = this.crew[targetIdx];
        if (!target || target.isDead || target.status === 'DECEASED') return;

        if (target.currentRoom === 'medbay') {
            this.pushAlert({
                id: 'sec-notice',
                type: 'notice',
                tag: 'MED',
                title: 'ALREADY IN MEDBAY',
                message: `${target.name} is already stationed in the Medbay.`,
                autoExpireSec: 6
            });
            return;
        }

        this.dispatchOfficer(targetIdx, 'medbay');
        if (window.FlightEngine && window.FlightEngine.logComms) {
            window.FlightEngine.logComms(`${target.name} dispatched to Medbay for medical treatment.`, "normal", "MED");
        }
        this.renderCrewManifest();
        this.renderRoomOccupants();
        this.renderSecurityConsole();
    }

    searchTargetOfficer() {
        if (this.selectedOfficerIndex === null) {
            this.pushAlert({
                id: 'sec-notice',
                type: 'warning',
                tag: 'SEC',
                title: 'OFFICER DIRECTIVES',
                message: 'Select an officer from the manifest to conduct a search.',
                autoExpireSec: 6
            });
            return;
        }

        const targetIdx = this.selectedOfficerIndex;
        const target = this.crew[targetIdx];
        if (!target || target.isDead || target.status === 'DECEASED') return;

        const brigOccupants = this.crew.filter(c => !c.isDead && c.status !== 'DECEASED' && c.currentRoom === 'brig' && c.transitRemaining <= 0);
        const guard = brigOccupants.find(c => c !== target && !c.isDetained && !(window.FlightEngine && window.FlightEngine.hasCondition(c, 'PANIC_ATTACK')));

        if (!guard) {
            const isSelfGuard = brigOccupants.includes(target);
            const msg = isSelfGuard
                ? 'A security officer cannot search themselves. Assign a second guard to The Brig.'
                : 'Assign a security officer to The Brig on Deck 4 to authorize and conduct searches.';
            this.pushAlert({
                id: 'sec-notice',
                type: 'warning',
                tag: 'SEC',
                title: isSelfGuard ? 'ADDITIONAL GUARD REQUIRED' : 'BRIG UNMANNED',
                message: msg,
                targetRoom: 'brig',
                autoExpireSec: 8
            });
            return;
        }

        // Check if already being searched
        if (window.FlightEngine && window.FlightEngine.activeSearches && window.FlightEngine.activeSearches[target.name]) {
            this.pushAlert({
                id: 'sec-notice',
                type: 'notice',
                tag: 'SEC',
                title: 'SEARCH IN PROGRESS',
                message: `${target.name} is currently undergoing a security search in The Brig.`,
                autoExpireSec: 6
            });
            return;
        }

        // Move target to the Brig if not already stationed there
        if (target.currentRoom !== 'brig' || target.transitRemaining > 0) {
            this.dispatchOfficer(targetIdx, 'brig');
            if (window.FlightEngine && window.FlightEngine.logComms) {
                window.FlightEngine.logComms(`${target.name} ordered to The Brig for personal effects inspection by Guard ${guard.name.split(' ')[0]}.`, "normal", "SEC");
            }
        } else {
            if (window.FlightEngine && window.FlightEngine.logComms) {
                window.FlightEngine.logComms(`Security search commenced for ${target.name} in The Brig by Guard ${guard.name.split(' ')[0]}.`, "normal", "SEC");
            }
        }

        // Start active timed search in flight engine
        if (window.FlightEngine && window.FlightEngine.startSecuritySearch) {
            window.FlightEngine.startSecuritySearch(target, targetIdx, guard);
        }

        if (window.SoundFX && window.SoundFX.playKeyClick) window.SoundFX.playKeyClick(null, false);

        this.renderCrewManifest();
        this.renderRoomOccupants();
        this.renderSecurityConsole();
    }

    ejectTargetOfficer() {
        if (this.selectedOfficerIndex === null) {
            this.pushAlert({
                id: 'sec-notice',
                type: 'warning',
                tag: 'SEC',
                title: 'SECURITY PROTOCOL',
                message: 'Select an officer from the manifest before ejecting.',
                autoExpireSec: 6
            });
            return;
        }

        const brigOccupants = this.crew.filter(c => !c.isDead && c.status !== 'DECEASED' && c.currentRoom === 'brig' && c.transitRemaining <= 0);
        const guard = brigOccupants.find(c => !c.isDetained);
        if (!guard) {
            this.pushAlert({
                id: 'sec-notice',
                type: 'warning',
                tag: 'SEC',
                title: 'BRIG UNMANNED',
                message: 'Airlock ejection requires an active security guard stationed at The Brig.',
                targetRoom: 'brig',
                autoExpireSec: 8
            });
            return;
        }

        const targetIdx = this.selectedOfficerIndex;
        const target = this.crew[targetIdx];
        if (!target || target.isDead || target.status === 'DECEASED') return;

        // Two-step confirmation
        if (this.airlockConfirmTarget !== targetIdx) {
            this.airlockConfirmTarget = targetIdx;
            this.renderSecurityConsole();
            if (this.airlockConfirmTimeout) clearTimeout(this.airlockConfirmTimeout);
            this.airlockConfirmTimeout = setTimeout(() => {
                this.airlockConfirmTarget = null;
                this.renderSecurityConsole();
            }, 4500);

            if (window.FlightEngine) {
                window.FlightEngine.logComms(`[EJECT WARNING] Executive ejection sequence primed for ${target.name}. Click CONFIRM within 4s to authorize.`, "cmd-echo", "SEC");
            }
            return;
        }

        // Executed!
        if (this.airlockConfirmTimeout) clearTimeout(this.airlockConfirmTimeout);
        this.airlockConfirmTarget = null;

        if (window.FlightEngine) {
            window.FlightEngine.killOfficer(target, targetIdx, 'Executive security airlock ejection');
            window.FlightEngine.telemetry.discipline.value = Math.min(100, window.FlightEngine.telemetry.discipline.value + 20);
            window.FlightEngine.logComms(`[EXECUTIVE PURGE] ${target.name} expelled through Deck 4 blast airlock into deep space by order of Guard ${guard.name.split(' ')[0]}. Vessel secured.`, "normal", "SEC");
        }

        this.pushAlert({
            id: `eject-${target.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
            type: 'critical',
            tag: 'SEC',
            title: `[OFFICER EJECTION] ${target.name.toUpperCase()}`,
            message: `<b>${target.name}</b> was expelled through outer airlock. Discipline restored (+20%).`,
            autoExpireSec: 25
        });

        if (window.SoundFX && window.SoundFX.playCrisisAlert) window.SoundFX.playCrisisAlert();

        this.cancelDispatch();
        this.renderCrewManifest();
        this.renderRoomOccupants();
        this.renderSecurityConsole();
    }

    airlockTargetOfficer() {
        return this.ejectTargetOfficer();
    }

    static restTargetOfficer() {
        if (window.Phase2Bridge) window.Phase2Bridge.restTargetOfficer();
    }

    static medbayTargetOfficer() {
        if (window.Phase2Bridge) window.Phase2Bridge.medbayTargetOfficer();
    }

    static searchTargetOfficer() {
        if (window.Phase2Bridge) window.Phase2Bridge.searchTargetOfficer();
    }

    static ejectTargetOfficer() {
        if (window.Phase2Bridge) window.Phase2Bridge.ejectTargetOfficer();
    }

    static airlockTargetOfficer() {
        if (window.Phase2Bridge) window.Phase2Bridge.ejectTargetOfficer();
    }
}

window.Phase2Bridge = new Phase2BridgeEngine();

// Quick Dev / Global Launch Trigger
window.triggerLaunchSequence = function() {
    window.Phase2Bridge.launch({ acceptedCrew: window.acceptedCrew || [] });
};
