// Starship Ark — Game Loop, Procedural Queue & Terminal CLI Integration

let currentCandidate = null;
let acceptedCrew = [];
let seatsFilled = 1; // Security Officer (Player)
const maxSeats = 6;
window.acceptedCrew = acceptedCrew;
window.seatsFilled = seatsFilled;
window.maxSeats = maxSeats;
let isLampOn = true;
window.isLampOn = isLampOn;
let isTerminalOpen = false;
window.isTerminalOpen = isTerminalOpen;

// Interactive Crew Ledger Controller (Wall Paper Manifest)
const CrewLedger = {
    isOpen: false,
    isDirty: true,

    init() {
        this.render();
        this.isDirty = false;
    },

    openLedger() {
        this.isOpen = true;
        if (this.isDirty) {
            this.render();
            this.isDirty = false;
        }
        const modal = document.getElementById('crew-ledger-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    },

    closeLedger() {
        this.isOpen = false;
        const modal = document.getElementById('crew-ledger-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    onBackdropClick(event) {
        if (event.target.id === 'crew-ledger-modal') {
            this.closeLedger();
        }
    },

    render() {
        const list = document.getElementById('ledger-roster-list');
        if (!list) return;

        // Seat 1: Security Officer (Player)
        let html = `
            <div class="ledger-row player-row">
                <div class="ledger-col-seat">SEAT 01</div>
                <div class="ledger-col-name"><span class="ledger-col-lbl">NAME:</span> <strong>ANDERDINGUS</strong></div>
                <div class="ledger-col-role"><span class="ledger-col-lbl">ROLE:</span> CAPTAIN</div>
                <div class="ledger-col-age"><span class="ledger-col-lbl">AGE:</span> 34</div>
                <div class="ledger-col-status"><span class="ledger-stamp-mini stamp-stationed">STATIONED</span></div>
            </div>
        `;

        // Seats 2 through 6: 5 Candidate positions
        for (let i = 0; i < 5; i++) {
            const seatNum = (i + 2).toString().padStart(2, '0');
            const cand = acceptedCrew[i];

            if (cand) {
                html += `
                    <div class="ledger-row filled-row">
                        <div class="ledger-col-seat">SEAT ${seatNum}</div>
                        <div class="ledger-col-name"><span class="ledger-col-lbl">NAME:</span> <strong>${cand.name}</strong></div>
                        <div class="ledger-col-role"><span class="ledger-col-lbl">ROLE:</span> ${cand.roleTitle}</div>
                        <div class="ledger-col-age"><span class="ledger-col-lbl">AGE:</span> ${cand.age}</div>
                        <div class="ledger-col-status"><span class="ledger-stamp-mini stamp-accepted">ACCEPTED</span></div>
                    </div>
                `;
            } else {
                html += `
                    <div class="ledger-row vacant-row">
                        <div class="ledger-col-seat">SEAT ${seatNum}</div>
                        <div class="ledger-col-name unfilled-text"><span class="ledger-col-lbl">NAME:</span> <em>UNFILLED</em></div>
                        <div class="ledger-col-role unfilled-text"><span class="ledger-col-lbl">ROLE:</span> —</div>
                        <div class="ledger-col-age unfilled-text"><span class="ledger-col-lbl">AGE:</span> —</div>
                        <div class="ledger-col-status"><span class="ledger-stamp-mini stamp-vacant">UNFILLED</span></div>
                    </div>
                `;
            }
        }

        list.innerHTML = html;
    }
};

window.CrewLedger = CrewLedger;

// Station Auxiliary Power System (30 Units Initial Reserve)
const PowerSystem = {
    maxPower: 30,
    currentPower: 30,

    canAfford(amount) {
        return this.currentPower >= amount;
    },

    drain(amount, reason = "") {
        if (this.currentPower <= 0) return false;
        this.currentPower = Math.max(0, this.currentPower - amount);
        this.updateUI();

        if (this.currentPower === 0) {
            const logConsole = document.getElementById('log-console');
            if (logConsole) {
                const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
                TerminalCLI.printLog(
                    logConsole,
                    timeStr,
                    `[CRITICAL ALERT] Auxiliary power reserve fully depleted (0/${this.maxPower} PWR). Private database queries (WATCH, BIO) offline.`,
                    "warning",
                    true
                );
            }
        }
        return true;
    },

    setPower(val) {
        this.currentPower = Math.max(0, Math.min(this.maxPower, val));
        this.updateUI();
    },

    updateUI() {
        const pwrVal = document.getElementById('term-power-val');
        const pwrMeter = document.getElementById('term-power-meter-fill');
        const pwrGauge = document.getElementById('term-power-gauge');
        const laptopHint = document.getElementById('laptop-pwr-hint');

        if (pwrVal) {
            pwrVal.innerText = `${this.currentPower} / ${this.maxPower} PWR`;
        }

        const pct = Math.max(0, Math.min(100, (this.currentPower / this.maxPower) * 100));
        if (pwrMeter) {
            pwrMeter.style.width = `${pct}%`;
        }

        if (pwrGauge) {
            pwrGauge.classList.remove('pwr-normal', 'pwr-warn', 'pwr-crit', 'pwr-empty');
            if (this.currentPower === 0) {
                pwrGauge.classList.add('pwr-empty');
            } else if (this.currentPower <= 5) {
                pwrGauge.classList.add('pwr-crit');
            } else if (this.currentPower <= 15) {
                pwrGauge.classList.add('pwr-warn');
            } else {
                pwrGauge.classList.add('pwr-normal');
            }
        }

        if (laptopHint) {
            laptopHint.innerText = `[${this.currentPower}/${this.maxPower} PWR]`;
        }
    }
};
window.PowerSystem = PowerSystem;

let overloadSeconds = 0;
function initPowerSystem() {
    PowerSystem.updateUI();

    setInterval(() => {
        // Overload drain: 1 unit every 20 seconds if lamp AND terminal are simultaneously active
        if (isLampOn && isTerminalOpen && PowerSystem.currentPower > 0) {
            overloadSeconds++;
            if (overloadSeconds >= 20) {
                overloadSeconds = 0;
                PowerSystem.drain(1, "Simultaneous Terminal & Lamp overload");
                const logConsole = document.getElementById('log-console');
                if (logConsole) {
                    const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
                    TerminalCLI.printLog(
                        logConsole,
                        timeStr,
                        `[POWER DRAIN] -1 PWR: Simultaneous terminal & desk lamp operation (${PowerSystem.currentPower}/${PowerSystem.maxPower} PWR remaining).`,
                        "warning",
                        true
                    );
                }
            }
        } else {
            overloadSeconds = 0;
        }
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    initRainCanvas();
    initKeyboardShortcuts();
    initCLIInput();
    initPowerSystem();
    updateBookState();
    if (window.ShipManual && window.ShipManual.init) window.ShipManual.init();
    if (window.CrewLedger && window.CrewLedger.init) window.CrewLedger.init();
    nextCandidate();
});

// Update Ship Manual Hotspot & Tooltip based on Lamp State
function updateBookState() {
    const bookTooltip = document.getElementById('book-tooltip');
    if (bookTooltip) {
        bookTooltip.innerText = isLampOn ? "SHIP MANUAL" : "Turn On Lamp";
    }
}

// Interactive Desk Lamp Hardware Toggle
function toggleLamp() {
    isLampOn = !isLampOn;
    window.isLampOn = isLampOn;
    if (!isLampOn) {
        overloadSeconds = 0;
    }
    const roomView = document.getElementById('room-view');
    const lampOffImg = document.getElementById('room-bg-lamp-off');
    const flickerOverlay = document.getElementById('lamp-flicker-overlay');

    if (isLampOn) {
        if (roomView) roomView.classList.remove('lamp-off');
        if (lampOffImg) lampOffImg.style.opacity = '0';
        if (flickerOverlay) {
            flickerOverlay.style.opacity = '0.85';
            flickerOverlay.style.visibility = 'visible';
        }
    } else {
        if (roomView) roomView.classList.add('lamp-off');
        if (lampOffImg) lampOffImg.style.opacity = '1';
        if (flickerOverlay) {
            flickerOverlay.style.opacity = '0';
            flickerOverlay.style.visibility = 'hidden';
        }
    }

    // Update book tooltip based on lamp state (can only read with lamp on)
    updateBookState();

    // Dynamically re-render avatar lighting to match lamp state
    drawAvatar(currentAvatarIndex);
}
window.toggleLamp = toggleLamp;

// Procedural Avatar Sprite System (Hazmat & Environmental Suits - Dual Lit/Unlit Engine)
const avatarUnlitImg = new Image();
avatarUnlitImg.src = 'hazmat_bases.png';
if (avatarUnlitImg.decode) avatarUnlitImg.decode().catch(() => {});

const avatarLitImg = new Image();
avatarLitImg.src = 'hazmat_bases_lit.png';
if (avatarLitImg.decode) avatarLitImg.decode().catch(() => {});

let currentAvatarIndex = 0;
let lastAvatarIndex = -1;

function drawAvatar(colIndex) {
    const canvas = document.getElementById('avatar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Pixel-perfect rendering without anti-aliasing blur
    ctx.imageSmoothingEnabled = false;

    // Dynamically choose lit sprite sheet when desk lamp is ON, unlit when OFF!
    const activeImg = isLampOn ? avatarLitImg : avatarUnlitImg;

    const sw = 1024 / 4; // 256px wide per suit
    const sh = 422;      // tight crop to character height (eliminating empty top/bottom space)
    const sx = colIndex * sw;
    const sy = 75;       // start at character head

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(activeImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    // 1. Stormy Outdoor Blue/Teal Ambient Atmosphere (Calibrated per lamp state)
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const stormGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    
    // When lamp is ON, use lighter ambient wash so the left shadows aren't crushed
    // When lamp is OFF, deepen the wash so the whole character is immersed in darkness
    const topAlpha = isLampOn ? 0.08 : 0.24;
    const botAlpha = isLampOn ? 0.35 : 0.68;
    stormGrad.addColorStop(0, `rgba(16, 52, 64, ${topAlpha})`);
    stormGrad.addColorStop(1, `rgba(8, 28, 36, ${botAlpha})`);
    ctx.fillStyle = stormGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // 2. Dynamic Desk Lamp Lighting & Shadow Lift
    if (isLampOn) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        
        // A. Subtle ambient sky bounce on the left (lifts the AI's deep shadow so it doesn't look overly dark)
        const leftFillGrad = ctx.createLinearGradient(0, 0, canvas.width * 0.5, 0);
        leftFillGrad.addColorStop(0, 'rgba(120, 175, 195, 0.18)'); // Soft cool ambient reflection on far left
        leftFillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = leftFillGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // B. Gradient from right (near desk lamp) stretching gradually across the flat torso to the left chest
        const lampGrad = ctx.createLinearGradient(canvas.width, 0, 0, 0);
        lampGrad.addColorStop(0, 'rgba(253, 224, 71, 0.25)');     // Warm golden edge on right arm & shoulder
        lampGrad.addColorStop(0.20, 'rgba(250, 195, 60, 0.24)');  // Warm amber light on right chest & visor
        lampGrad.addColorStop(0.42, 'rgba(245, 165, 20, 0.16)');  // Soft mid-chest warmth
        lampGrad.addColorStop(0.62, 'rgba(245, 158, 11, 0.07)');  // Faint warmth extending to left chest
        lampGrad.addColorStop(0.76, 'rgba(0, 0, 0, 0)');          // Fully dissolves into cold shadow at far chest
        
        ctx.fillStyle = lampGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
}

function renderProceduralAvatar() {
    // 9 pristine suits: 3 classic hazmats + 3 heavy tactical + 3 plague doctors (scavenger cutouts excluded)
    const numSuits = 9;
    let nextIndex;
    do {
        nextIndex = Math.floor(Math.random() * numSuits);
    } while (nextIndex === lastAvatarIndex && numSuits > 1);

    currentAvatarIndex = nextIndex;
    lastAvatarIndex = currentAvatarIndex;

    const activeImg = isLampOn ? avatarLitImg : avatarUnlitImg;
    if (activeImg.complete && activeImg.naturalWidth > 0) {
        drawAvatar(currentAvatarIndex);
    } else {
        avatarLitImg.onload = () => drawAvatar(currentAvatarIndex);
        avatarUnlitImg.onload = () => drawAvatar(currentAvatarIndex);
    }
}

// 1. Procedural Candidate Queue Manager
function nextCandidate() {
    try {
        currentCandidate = CandidateGenerator.generateCandidate();
        renderCandidateDossier(currentCandidate);
    } catch(e) {
        console.error('ERROR in candidate/dossier:', e);
    }

    const logConsole = document.getElementById('log-console');
    if (logConsole) {
        const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
        TerminalCLI.printLog(logConsole, timeStr, `[CANDIDATE ARRIVED] Ref: ${currentCandidate.id} - ${currentCandidate.name}, ${currentCandidate.roleTitle}`, "cmd-echo");
    }

    // Render Procedural Avatar to Canvas
    renderProceduralAvatar();

    const avatarContainer = document.getElementById('candidate-avatar-container');
    if (avatarContainer) {
        avatarContainer.classList.remove('hidden');
    }
}

function renderCandidateDossier(cand) {
    if (!cand) return;
    document.getElementById('cand-name').innerText = cand.name;
    document.getElementById('cand-role').innerText = cand.roleTitle;
    document.getElementById('cand-origin').innerText = cand.city;
    document.getElementById('cand-age').innerText = cand.age;
    document.getElementById('cand-ref').innerText = cand.id;
    document.getElementById('cand-quote').innerText = cand.quote;
    document.getElementById('cand-dossier-title').innerText = `> CANDIDATE PROFILE: ${cand.name.toUpperCase()}`;
    document.getElementById('seat-capacity-badge').innerText = `CREW SEATS: ${seatsFilled} / ${maxSeats}`;

    clearDocumentViewer();
}

function loadDocument(doc) {
    const viewer = document.getElementById('doc-viewer-content');
    if (!viewer || !doc) return;

    let fieldsHTML = '';
    doc.fields.forEach(f => {
        fieldsHTML += `
            <div class="doc-field">
                <span class="doc-lbl">${f.label}</span>
                <span class="doc-val">${f.val}</span>
            </div>
        `;
    });

    viewer.innerHTML = `
        <div class="doc-card">
            <div class="doc-card-header">
                <div class="doc-title-area">
                    <div class="doc-title">${doc.title}</div>
                    <div class="doc-issuer">${doc.issuer}</div>
                </div>
                <div class="doc-status-badge">${doc.status}</div>
            </div>
            <div class="doc-grid">
                ${fieldsHTML}
            </div>
        </div>
    `;

    document.getElementById('doc-viewer-title').innerText = `> DOCUMENT VIEWER: [${doc.refCode}]`;
}

function clearDocumentViewer() {
    const viewer = document.getElementById('doc-viewer-content');
    if (viewer) {
        viewer.innerHTML = `
            <div class="doc-placeholder">
                <div class="placeholder-text">NO DOCUMENT LOADED</div>
                <div class="placeholder-sub">Type a CLI command to retrieve files into the viewer:</div>
                <div class="placeholder-cmds">FETCH EDU | FETCH WATCH | FETCH FIN | FETCH BIO</div>
            </div>
        `;
    }
    const title = document.getElementById('doc-viewer-title');
    if (title) title.innerText = `> DOCUMENT VIEWER`;
}

window.renderCandidateDossier = renderCandidateDossier;
window.loadDocument = loadDocument;
window.clearDocumentViewer = clearDocumentViewer;

// 2. Decision Button Logic (Accept / Reject) with Cinematic Fade-to-Black Transition
let isTransitioning = false;

function transitionToNextCandidate(delayBeforeFade = 250) {
    if (isTransitioning) return;
    isTransitioning = true;

    const overlay = document.getElementById('transition-overlay');

    setTimeout(() => {
        // 1. Fade the entire screen smoothly to black
        if (overlay) overlay.classList.add('active');

        // 2. Once in total darkness (350ms fade duration)
        setTimeout(() => {
            // Load and render new candidate data, avatar, and dossier
            nextCandidate();

            // 3. Brief hold in darkness for cinematic weight, then reveal
            setTimeout(() => {
                if (overlay) overlay.classList.remove('active');

                // Re-enable decisions once fade-in completes
                setTimeout(() => {
                    isTransitioning = false;
                }, 350);
            }, 250);
        }, 350);
    }, delayBeforeFade);
}

function acceptEntry() {
    if (!currentCandidate || isTransitioning) return;
    acceptedCrew.push(currentCandidate);
    seatsFilled++;
    window.seatsFilled = seatsFilled;

    if (window.CrewLedger) {
        window.CrewLedger.isDirty = true;
        if (window.CrewLedger.isOpen) {
            window.CrewLedger.render();
            window.CrewLedger.isDirty = false;
        }
    }

    const logConsole = document.getElementById('log-console');
    const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
    TerminalCLI.printLog(logConsole, timeStr, `VERDICT: ACCEPTED ${currentCandidate.name} (${seatsFilled}/${maxSeats} Seats Filled)`, "normal", true);

    if (seatsFilled >= maxSeats) {
        TerminalCLI.printLog(logConsole, timeStr, `[COMPLEMENT COMPLETE] Maximum vessel capacity reached (${seatsFilled}/${maxSeats}).`, "cmd-echo", false);
        TerminalCLI.printLog(logConsole, timeStr, `Gate locked. Open Terminal CLI and type 'INITIATE LAUNCH' to begin departure sequence.`, "cmd-echo", false);
        const badge = document.getElementById('seat-capacity-badge');
        if (badge) {
            badge.innerText = `CREW SEATS: ${seatsFilled} / ${maxSeats} [READY]`;
        }
    } else {
        transitionToNextCandidate();
    }
}

window.onLaunchInitiated = function(details) {
    const badge = document.getElementById('seat-capacity-badge');
    if (badge) {
        badge.innerText = `STATUS: LAUNCH ENGAGED (${details.seats}/${details.max})`;
    }
};

function rejectEntry() {
    if (!currentCandidate || isTransitioning) return;
    const logConsole = document.getElementById('log-console');
    const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
    TerminalCLI.printLog(logConsole, timeStr, `VERDICT: REJECTED ${currentCandidate.name}. Candidate turned away.`, "warning", true);
    
    transitionToNextCandidate();
}

// 3. CLI Input & Terminal Commands Parser
function initCLIInput() {
    const input = document.getElementById('cli-input');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                submitCLI();
            }
        });
    }
}

function submitCLI() {
    const input = document.getElementById('cli-input');
    const logConsole = document.getElementById('log-console');
    if (!input || !logConsole) return;

    const cmd = input.value;
    if (cmd.trim() !== '') {
        TerminalCLI.parseCommand(cmd, currentCandidate, logConsole);
        input.value = '';
    }
}

// 4. Terminal View Zooming & Shortcuts
function openTerminal() {
    const termView = document.getElementById('terminal-screen-view');
    if (termView) {
        termView.classList.remove('hidden');
        isTerminalOpen = true;
        window.isTerminalOpen = true;
    }
}

function closeTerminal() {
    const termView = document.getElementById('terminal-screen-view');
    if (termView) {
        termView.classList.add('hidden');
        isTerminalOpen = false;
        window.isTerminalOpen = false;
        overloadSeconds = 0;
    }
}

window.openTerminal = openTerminal;
window.closeTerminal = closeTerminal;

function initKeyboardShortcuts() {
    const laptopHotspot = document.getElementById('laptop-hotspot');
    if (laptopHotspot) {
        laptopHotspot.addEventListener('click', openTerminal);
    }

    const bookHotspot = document.getElementById('book-hotspot');
    if (bookHotspot) {
        bookHotspot.addEventListener('click', () => {
            if (!isLampOn) return; // Cannot read manual when lamp is off
            ShipManual.openManual();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (window.CrewLedger && window.CrewLedger.isOpen) {
            if (e.key === 'Escape') {
                CrewLedger.closeLedger();
            }
            return;
        }

        if (window.ShipManual && window.ShipManual.isOpen) {
            if (e.key === 'Escape') {
                ShipManual.closeManual();
            } else if (e.key === 'ArrowLeft') {
                window.ShipManual.prevPage();
            } else if (e.key === 'ArrowRight') {
                window.ShipManual.nextPage();
            }
            return;
        }

        if (e.key === 'Escape') {
            closeTerminal();
        }
    });
}

// 5. Dynamic Dual-Layer Rain Parallax Animation (Back & Front of Candidate)
function initRainCanvas() {
    const canvasBack = document.getElementById('rain-canvas-back');
    const canvasFront = document.getElementById('rain-canvas-front');
    if (!canvasBack || !canvasFront) return;

    const ctxBack = canvasBack.getContext('2d');
    const ctxFront = canvasFront.getContext('2d');

    function resizeCanvases() {
        const parent = canvasBack.parentElement;
        if (parent) {
            const w = parent.clientWidth;
            const h = parent.clientHeight;
            canvasBack.width = w;
            canvasBack.height = h;
            canvasFront.width = w;
            canvasFront.height = h;
        }
    }
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);

    // A. Background Rain: ~85% of rain falls BEHIND the candidate in the outdoor atmosphere
    const backDrops = [];
    const numBackDrops = 75;
    for (let i = 0; i < numBackDrops; i++) {
        backDrops.push({
            x: Math.random() * (canvasBack.width || 600),
            y: Math.random() * (canvasBack.height || 600),
            length: Math.random() * 4.5 + 5,      // 5px - 9.5px (covers small, medium, and distant drops)
            speed: Math.random() * 1.4 + 0.8,     // 0.8 - 2.2 (natural outdoor drift)
            opacity: Math.random() * 0.28 + 0.20  // 0.20 - 0.48 (soft atmospheric rain)
        });
    }

    // B. Foreground Rain: Close drops streaking IN FRONT of candidate on glass
    const frontDrops = [];
    const numFrontDrops = 18;
    for (let i = 0; i < numFrontDrops; i++) {
        frontDrops.push({
            x: Math.random() * (canvasFront.width || 600),
            y: Math.random() * (canvasFront.height || 600),
            length: Math.random() * 5 + 9,        // 9px - 14px (previous natural length)
            speed: Math.random() * 1.8 + 3,     // 1.8 - 3.4 (previous speed)
            opacity: Math.random() * 0.35 + 0.40  // 0.40 - 0.75 (previous opacity)
        });
    }

    let lastTime = performance.now();
    function animateRain(now = performance.now()) {
        const dt = Math.min((now - lastTime) / 1000, 0.05); // Cap delta time at 50ms
        lastTime = now;

        const w = canvasBack.width;
        const h = canvasBack.height;

        ctxBack.clearRect(0, 0, w, h);
        ctxFront.clearRect(0, 0, w, h);

        // 1. Render Distant Background Rain (Thin, soft lines)
        ctxBack.strokeStyle = '#38bdf8';
        ctxBack.lineWidth = 0.8;
        for (let i = 0; i < backDrops.length; i++) {
            const d = backDrops[i];
            ctxBack.beginPath();
            ctxBack.globalAlpha = d.opacity;
            ctxBack.moveTo(d.x, d.y);
            ctxBack.lineTo(d.x - 0.9, d.y + d.length);
            ctxBack.stroke();

            d.y += d.speed * dt * 60;
            d.x -= 0.25 * dt * 60;

            if (d.y > h) {
                d.y = -d.length;
                d.x = Math.random() * w;
            }
        }

        // 2. Render Close Foreground Rain (Natural glass streaks)
        ctxFront.strokeStyle = '#7dd3fc';
        ctxFront.lineWidth = 1.15;
        for (let i = 0; i < frontDrops.length; i++) {
            const d = frontDrops[i];
            ctxFront.beginPath();
            ctxFront.globalAlpha = d.opacity;
            ctxFront.moveTo(d.x, d.y);
            ctxFront.lineTo(d.x - 1.2, d.y + d.length);
            ctxFront.stroke();

            d.y += d.speed * dt * 60;
            d.x -= 0.35 * dt * 60;

            if (d.y > h) {
                d.y = -d.length;
                d.x = Math.random() * w;
            }
        }

        requestAnimationFrame(animateRain);
    }
    animateRain();
}
