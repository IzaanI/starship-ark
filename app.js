// Starship Ark — Game Loop, Procedural Queue & Terminal CLI Integration

let currentCandidate = null;
let acceptedCrew = [];
let seatsFilled = 2; // Captain + Assistant
const maxSeats = 7;
let isLampOn = true;

document.addEventListener('DOMContentLoaded', () => {
    initRainCanvas();
    initKeyboardShortcuts();
    initCLIInput();
    nextCandidate();
});

// Interactive Desk Lamp Hardware Toggle
function toggleLamp() {
    isLampOn = !isLampOn;
    const roomView = document.getElementById('room-view');
    const lampOffImg = document.getElementById('room-bg-lamp-off');
    const flickerOverlay = document.getElementById('lamp-flicker-overlay');

    if (isLampOn) {
        if (roomView) roomView.classList.remove('lamp-off');
        if (lampOffImg) lampOffImg.style.opacity = '0';
        if (flickerOverlay) flickerOverlay.style.display = 'block';
    } else {
        if (roomView) roomView.classList.add('lamp-off');
        if (lampOffImg) lampOffImg.style.opacity = '1';
        if (flickerOverlay) flickerOverlay.style.display = 'none';
    }

    // Dynamically re-render avatar lighting to match lamp state
    drawAvatar(currentAvatarIndex);
}
window.toggleLamp = toggleLamp;

// Procedural Avatar Sprite System (Hazmat & Environmental Suits)
const avatarBasesImg = new Image();
avatarBasesImg.src = 'hazmat_bases.png';
let currentAvatarIndex = 0;

function drawAvatar(colIndex) {
    const canvas = document.getElementById('avatar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Pixel-perfect rendering without anti-aliasing blur
    ctx.imageSmoothingEnabled = false;

    const sw = 1024 / 4; // 256px wide per suit
    const sh = 422;      // tight crop to character height (eliminating empty top/bottom space)
    const sx = colIndex * sw;
    const sy = 75;       // start at character head

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(avatarBasesImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    // 1. Stormy Outdoor Blue/Teal Ambient Atmosphere (Underneath lamp layer)
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const stormGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    stormGrad.addColorStop(0, 'rgba(16, 52, 64, 0.18)');   // Murky cyan-teal storm sky hue
    stormGrad.addColorStop(1, 'rgba(8, 28, 36, 0.6)');    // Deeper cold shadow towards bottom sill
    ctx.fillStyle = stormGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // 2. Dynamic Desk Lamp Rim-Lighting (On top of stormy base!)
    if (isLampOn) {
        ctx.save();
        // source-atop paints strictly onto the character pixels without spilling
        ctx.globalCompositeOperation = 'source-atop';
        
        // Gradient from right (near desk lamp) stretching gradually across the flat torso to the left chest
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
    currentAvatarIndex = Math.floor(Math.random() * 4);
    if (avatarBasesImg.complete && avatarBasesImg.naturalWidth > 0) {
        drawAvatar(currentAvatarIndex);
    } else {
        avatarBasesImg.onload = () => drawAvatar(currentAvatarIndex);
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

// 2. Decision Button Logic (Accept / Reject)
function acceptEntry() {
    if (!currentCandidate) return;
    acceptedCrew.push(currentCandidate);
    seatsFilled++;

    const logConsole = document.getElementById('log-console');
    const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
    TerminalCLI.printLog(logConsole, timeStr, `VERDICT: ACCEPTED ${currentCandidate.name} (${seatsFilled}/${maxSeats} Seats Filled)`, "normal", true);

    const avatarContainer = document.getElementById('candidate-avatar-container');
    if (avatarContainer) avatarContainer.classList.add('hidden');

    if (seatsFilled >= maxSeats) {
        TerminalCLI.printLog(logConsole, timeStr, `CAPACITY REACHED: Maximum seats filled. Starship Ark ready for launch.`, "cmd-echo", false);
        alert(`CAPACITY REACHED\n\nStarship Ark capacity filled with ${acceptedCrew.length + 2} total personnel. Ready for launch.`);
    } else {
        setTimeout(() => nextCandidate(), 1000);
    }
}

function rejectEntry() {
    if (!currentCandidate) return;
    const logConsole = document.getElementById('log-console');
    const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
    TerminalCLI.printLog(logConsole, timeStr, `VERDICT: REJECTED ${currentCandidate.name}. Candidate turned away.`, "warning", true);
    
    const avatarContainer = document.getElementById('candidate-avatar-container');
    if (avatarContainer) avatarContainer.classList.add('hidden');

    setTimeout(() => nextCandidate(), 1000);
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
    }
}

function closeTerminal() {
    const termView = document.getElementById('terminal-screen-view');
    if (termView) {
        termView.classList.add('hidden');
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
        bookHotspot.addEventListener('click', () => ShipManual.openManual());
    }

    document.addEventListener('keydown', (e) => {
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

// 5. Dynamic Rain Canvas Animation
function initRainCanvas() {
    const canvas = document.getElementById('rain-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        if (canvas.parentElement) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        }
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const drops = [];
    const numDrops = 75;

    for (let i = 0; i < numDrops; i++) {
        drops.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            length: Math.random() * 3 + 6,
            speed: Math.random() * 1.8 + 0.9,
            opacity: Math.random() * 0.45 + 0.25
        });
    }

    let lastTime = performance.now();
    function animateRain(now = performance.now()) {
        const dt = Math.min((now - lastTime) / 1000, 0.05); // Cap delta time at 50ms
        lastTime = now;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 0.95;

        for (let i = 0; i < drops.length; i++) {
            const d = drops[i];
            ctx.beginPath();
            ctx.globalAlpha = d.opacity;
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - 1.0, d.y + d.length);
            ctx.stroke();

            d.y += d.speed * dt * 60;
            d.x -= 0.3 * dt * 60;

            if (d.y > canvas.height) {
                d.y = -d.length;
                d.x = Math.random() * canvas.width;
            }
        }

        requestAnimationFrame(animateRain);
    }
    animateRain();
}
