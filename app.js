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
}
window.toggleLamp = toggleLamp;

// 1. Procedural Candidate Queue Manager
function nextCandidate() {
    currentCandidate = CandidateGenerator.generateCandidate();
    renderCandidateDossier(currentCandidate);

    const logConsole = document.getElementById('log-console');
    if (logConsole) {
        const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
        TerminalCLI.printLog(logConsole, timeStr, `[CANDIDATE ARRIVED] Ref: ${currentCandidate.id} - ${currentCandidate.name}, ${currentCandidate.roleTitle}`, "cmd-echo");
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
                <div class="placeholder-icon">📄</div>
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

    if (seatsFilled >= maxSeats) {
        TerminalCLI.printLog(logConsole, timeStr, `CAPACITY REACHED: Maximum seats filled. Starship Ark ready for launch.`, "cmd-echo", false);
        alert(`CAPACITY REACHED\n\nStarship Ark capacity filled with ${acceptedCrew.length + 2} total personnel. Ready for launch.`);
    } else {
        nextCandidate();
    }
}

function rejectEntry() {
    if (!currentCandidate) return;
    const logConsole = document.getElementById('log-console');
    const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
    TerminalCLI.printLog(logConsole, timeStr, `VERDICT: REJECTED ${currentCandidate.name}. Candidate turned away.`, "warning", true);
    
    nextCandidate();
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

function initKeyboardShortcuts() {
    const laptopHotspot = document.getElementById('laptop-hotspot');
    if (laptopHotspot) {
        laptopHotspot.addEventListener('click', openTerminal);
    }

    document.addEventListener('keydown', (e) => {
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
