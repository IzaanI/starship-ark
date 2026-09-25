// Starship Ark — Retro Green CRT Terminal Command Parser

class TerminalCLI {
    static pendingLaunchConfirm = false;

    static parseCommand(rawCommand, candidate, logConsole) {
        if (!rawCommand || !logConsole) return;

        const cmd = rawCommand.trim().toUpperCase();
        const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);

        // Echo command to log console (UNINDENTED command line at margin)
        this.printLog(logConsole, timeStr, `> ${rawCommand}`, "cmd-echo", false);

        // Handle active Y/N Launch Confirmation Prompt
        if (this.pendingLaunchConfirm) {
            if (cmd === "Y" || cmd === "YES" || cmd === "CONFIRM") {
                this.pendingLaunchConfirm = false;
                this.executeLaunchSequence(logConsole, timeStr);
                return;
            } else if (cmd === "N" || cmd === "NO" || cmd === "CANCEL" || cmd === "ABORT") {
                this.pendingLaunchConfirm = false;
                this.printLog(logConsole, timeStr, `[ABORTED] Launch sequence cancelled. Resuming booth inspection protocols.`, "normal", true);
                return;
            } else {
                this.printLog(logConsole, timeStr, `[CONFIRMATION PENDING] Authorize liftoff? Enter 'Y' to confirm departure, or 'N' to cancel.`, "warning", true);
                return;
            }
        }

        if (cmd === "HELP" || cmd === "/HELP" || cmd === "?") {
            this.printHelp(logConsole, timeStr);
        } else if (cmd === "FETCH EDU" || cmd === "SCAN EDU" || cmd === "EDUCATION" || cmd === "EDU") {
            if (candidate && candidate.eduDoc) {
                if (window.loadDocument) window.loadDocument(candidate.eduDoc);
                this.printLog(logConsole, timeStr, `[DOCUMENT RETRIEVED] ${candidate.eduDoc.title} loaded into viewer.`, "normal", true);
            }
        } else if (cmd === "FETCH WATCH" || cmd === "SCAN WATCH" || cmd === "WATCHLIST" || cmd === "WATCH") {
            const alreadyFetched = candidate && candidate.watchFetched;
            if (!alreadyFetched) {
                if (window.PowerSystem && !window.PowerSystem.canAfford(2)) {
                    this.printLog(logConsole, timeStr, `[QUERY FAILED: POWER DEPLETED] Insufficient auxiliary power (Requires 2 PWR, Current: ${window.PowerSystem.currentPower}/${window.PowerSystem.maxPower}). Secure police link unavailable.`, "warning", true);
                    return;
                }
                if (window.PowerSystem) {
                    window.PowerSystem.drain(2, "Secure police database lookup");
                }
                if (candidate) candidate.watchFetched = true;
            }
            if (candidate && candidate.watchDoc) {
                if (window.loadDocument) window.loadDocument(candidate.watchDoc);
                const pwrMsg = alreadyFetched ? `(Local Archive - 0 PWR)` : `(-2 PWR)`;
                this.printLog(logConsole, timeStr, `[DOCUMENT RETRIEVED] ${candidate.watchDoc.title} loaded into viewer. ${pwrMsg}`, "normal", true);
            }
        } else if (cmd === "FETCH FIN" || cmd === "SCAN FIN" || cmd === "FINANCIALS" || cmd === "FIN") {
            if (candidate && candidate.finDoc) {
                if (window.loadDocument) window.loadDocument(candidate.finDoc);
                this.printLog(logConsole, timeStr, `[DOCUMENT RETRIEVED] ${candidate.finDoc.title} loaded into viewer.`, "normal", true);
            }
        } else if (cmd === "FETCH BIO" || cmd === "SCAN MED" || cmd === "MEDICAL" || cmd === "BIO") {
            const alreadyFetched = candidate && candidate.bioFetched;
            if (!alreadyFetched) {
                if (window.PowerSystem && !window.PowerSystem.canAfford(2)) {
                    this.printLog(logConsole, timeStr, `[QUERY FAILED: POWER DEPLETED] Insufficient auxiliary power (Requires 2 PWR, Current: ${window.PowerSystem.currentPower}/${window.PowerSystem.maxPower}). Biometric medical registry offline.`, "warning", true);
                    return;
                }
                if (window.PowerSystem) {
                    window.PowerSystem.drain(2, "Biometric medical scan query");
                }
                if (candidate) candidate.bioFetched = true;
            }
            if (candidate && candidate.bioDoc) {
                if (window.loadDocument) window.loadDocument(candidate.bioDoc);
                const pwrMsg = alreadyFetched ? `(Local Archive - 0 PWR)` : `(-2 PWR)`;
                this.printLog(logConsole, timeStr, `[DOCUMENT RETRIEVED] ${candidate.bioDoc.title} loaded into viewer. ${pwrMsg}`, "normal", true);
            }
        } else if (cmd === "INITIATE LAUNCH" || cmd === "LAUNCH" || cmd === "START LAUNCH") {
            const seats = window.seatsFilled !== undefined ? window.seatsFilled : (window.acceptedCrew ? window.acceptedCrew.length + 1 : 1);
            const max = window.maxSeats || 6;
            const recruits = window.acceptedCrew ? window.acceptedCrew.length : (seats - 1);
            const remaining = max - seats;

            this.pendingLaunchConfirm = true;

            if (remaining > 0) {
                this.printLog(logConsole, timeStr, `[PRE-FLIGHT WARNING: INCOMPLETE COMPLEMENT]`, "warning", true);
                this.printLog(logConsole, timeStr, `Current roster has only ${seats} of ${max} authorized seats filled (${recruits} recruit(s) + 1 Security Officer).`, "warning", true);
                this.printLog(logConsole, timeStr, `${remaining} station position(s) remain UNFILLED. Operating with an understaffed crew increases risk of critical station failure.`, "warning", true);
                this.printLog(logConsole, timeStr, `Are you sure you want to authorize emergency departure now? [Y/N]`, "cmd-echo", true);
            } else {
                this.printLog(logConsole, timeStr, `[LAUNCH READINESS VERIFIED]`, "normal", true);
                this.printLog(logConsole, timeStr, `Full complement assembled: ${seats} / ${max} authorized personnel aboard.`, "normal", true);
                this.printLog(logConsole, timeStr, `All primary station seats accounted for. Umbilical disconnect primed.`, "normal", true);
                this.printLog(logConsole, timeStr, `Confirm launch authorization and seal Ark blast airlocks? [Y/N]`, "cmd-echo", true);
            }
        } else if (cmd === "CLOSE DOC" || cmd === "CLEAR DOC") {
            if (window.clearDocumentViewer) window.clearDocumentViewer();
            this.printLog(logConsole, timeStr, `Document viewer cleared.`, "normal", true);
        } else if (cmd === "CLEAR") {
            logConsole.innerHTML = "";
            this.printLog(logConsole, timeStr, "CRT console buffer cleared.", "normal", true);
        } else if (cmd === "STATUS") {
            const pwr = window.PowerSystem ? `${window.PowerSystem.currentPower}/${window.PowerSystem.maxPower} PWR` : "30/30 PWR";
            const lampState = window.isLampOn ? "ACTIVE (Overload: +1 PWR / 20s while terminal open)" : "OFF";
            const seats = window.seatsFilled !== undefined ? window.seatsFilled : (window.acceptedCrew ? window.acceptedCrew.length + 1 : 1);
            const max = window.maxSeats || 6;
            this.printLog(logConsole, timeStr, `SYSTEM STATUS: Security Terminal online.`, "normal", true);
            this.printLog(logConsole, timeStr, `  CREW COMPLEMENT: ${seats} / ${max} personnel aboard`, "normal", true);
            this.printLog(logConsole, timeStr, `  AUXILIARY POWER: ${pwr}`, "normal", true);
            this.printLog(logConsole, timeStr, `  DESK HALOGEN LAMP: ${lampState}`, "normal", true);
            this.printLog(logConsole, timeStr, `  SECURE QUERIES (WATCH, BIO): 2 PWR / query`, "normal", true);
            this.printLog(logConsole, timeStr, `  PUBLIC ARCHIVES (EDU, FIN): Free (0 PWR)`, "normal", true);
        } else {
            this.printLog(logConsole, timeStr, `Command not recognized: '${rawCommand}'. Type 'HELP' for a list of valid commands.`, "warning", true);
        }
    }

    static executeLaunchSequence(logConsole, timeStr) {
        const seats = window.seatsFilled !== undefined ? window.seatsFilled : (window.acceptedCrew ? window.acceptedCrew.length + 1 : 1);
        const max = window.maxSeats || 6;
        const recruits = window.acceptedCrew ? window.acceptedCrew.length : (seats - 1);

        this.printLog(logConsole, timeStr, `=========================================================`, "cmd-echo", false);
        this.printLog(logConsole, timeStr, `[LAUNCH SEQUENCE ENGAGED]`, "cmd-echo", false);
        this.printLog(logConsole, timeStr, `Airlock security seals engaged. External boarding ramp retracted.`, "normal", true);
        this.printLog(logConsole, timeStr, `Gantry umbilicals released. Main drive ignition sequence verified.`, "normal", true);
        this.printLog(logConsole, timeStr, `Final Vessel Roster: ${seats} / ${max} Souls (${recruits} Recruits + 1 Security Officer).`, "normal", true);
        this.printLog(logConsole, timeStr, `Checkpoint Security Post 04 decommissioned. Atmospheric ascent initiated.`, "normal", true);
        this.printLog(logConsole, timeStr, `=========================================================`, "cmd-echo", false);
        this.printLog(logConsole, timeStr, `[ARK FLIGHT CORE] Phase I complete. Standing by for Phase II orbital station deployment.`, "normal", true);

        if (window.onLaunchInitiated) {
            window.onLaunchInitiated({ seats, max, recruits });
        }
    }

    static printHelp(logConsole, timeStr) {
        const helpLines = [
            "============== CLI COMMAND MANUAL ==============",
            "  HELP            - Display this CLI command directory",
            "  FETCH EDU       - Load Academic Transcript & Accreditation [0 PWR]",
            "  FETCH WATCH     - Load Police Incident & Security Index [2 PWR]",
            "  FETCH FIN       - Load Financial Transaction Ledger Audit [0 PWR]",
            "  FETCH BIO       - Load Biometric & Medical Scan Chart [2 PWR]",
            "  INITIATE LAUNCH - Authorize liftoff & seal Ark airlocks (Y/N)",
            "  CLOSE DOC       - Unload active document from viewer",
            "  STATUS          - Check vessel complement, power & systems",
            "  CLEAR           - Clear console buffer",
            "========================================================="
        ];
        helpLines.forEach(line => {
            this.printLog(logConsole, timeStr, line, "normal", true);
        });
    }

    static printLog(logConsole, timeStr, text, styleClass, isIndented = true) {
        const div = document.createElement("div");
        const indentClass = isIndented ? "log-indented" : "";
        div.className = `log-line ${styleClass || "normal"} ${indentClass}`.trim();
        div.innerHTML = `<span class="time">${timeStr}</span> <span class="log-text">${text}</span>`;
        logConsole.appendChild(div);
        logConsole.scrollTop = logConsole.scrollHeight;
    }
}
