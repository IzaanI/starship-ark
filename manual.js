// Starship Ark — Ship Operations & Station Directives Manual (Interactive Brown Book)

const ShipManual = {
    currentPageIndex: 0,
    isOpen: false,

    pages: [
        // PAGE 0: TITLE PAGE
        {
            id: "title-page",
            chapter: "",
            contentHtml: `
                <div class="manual-page-content" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; margin-top: 15%;">
                    <div style="font-family: 'Georgia', serif; font-size: 32px; font-weight: bold; color: #1a0f09; margin-bottom: 24px; letter-spacing: 2px;">STARSHIP ARK</div>
                    <div style="font-family: 'Courier New', monospace; font-size: 16px; color: #5c3a21; letter-spacing: 1px; margin-bottom: 40px;">OFFICIAL OPERATIONS MANUAL</div>
                    <div style="width: 60px; height: 2px; background: #5c3a21; margin: 20px auto;"></div>
                    <div style="font-family: 'Georgia', serif; font-size: 15px; color: #2b1f17; font-style: italic; margin-top: 40px;">Revision 2030.4</div>
                    <div style="font-family: 'Courier New', monospace; font-size: 13px; color: #9a3412; margin-top: 80px; font-weight: bold; text-transform: uppercase;">RESTRICTED ACCESS // STATION SECURITY DIVISION</div>
                </div>
            `
        },

        // PAGE 1: TABLE OF CONTENTS & INDEX
        {
            id: "toc",
            chapter: "DOCUMENT INDEX",
            contentHtml: `
                <div class="manual-toc-container">
                    <div class="toc-header-stamp">STATION SECURITY DIVISION // CONFIDENTIAL</div>
                    <p class="toc-intro">
                        This manual contains official operational directives for the booth security officer aboard 
                        the <strong>Starship Ark</strong>. Use the index below to jump directly to protocol guidelines and station directives.
                    </p>
                    
                    <div class="toc-grid">
                        <div class="toc-section">
                            <div class="toc-section-title">CHAPTER 1: SURVIVAL PROTOCOL & LOGISTICS</div>
                            <ul class="toc-list">
                                <li onclick="ShipManual.goToPage(2)"><span class="toc-page-num">1</span> Mission Charter & Earth Evacuation</li>
                                <li onclick="ShipManual.goToPage(3)"><span class="toc-page-num">2</span> Core Vessel Resources</li>
                                <li onclick="ShipManual.goToPage(4)"><span class="toc-page-num">3</span> Credential & Timeline Audit Protocol</li>
                            </ul>
                        </div>

                        <div class="toc-section">
                            <div class="toc-section-title">CHAPTER 2: STATION DIRECTIVES & QUALIFICATIONS</div>
                            <ul class="toc-list">
                                <li onclick="ShipManual.goToPage(5)"><span class="toc-page-num">4</span> Cockpit</li>
                                <li onclick="ShipManual.goToPage(6)"><span class="toc-page-num">5</span> Medbay</li>
                                <li onclick="ShipManual.goToPage(7)"><span class="toc-page-num">6</span> Reactor</li>
                                <li onclick="ShipManual.goToPage(8)"><span class="toc-page-num">7</span> Hydroponics</li>
                                <li onclick="ShipManual.goToPage(9)"><span class="toc-page-num">8</span> O2 Bay</li>
                                <li onclick="ShipManual.goToPage(10)"><span class="toc-page-num">9</span> Brig</li>
                            </ul>
                        </div>

                        <div class="toc-section">
                            <div class="toc-section-title">CHAPTER 3: BOOTH CONTROLS & TERMINAL PROTOCOL</div>
                            <ul class="toc-list">
                                <li onclick="ShipManual.goToPage(11)"><span class="toc-page-num">10</span> Terminal Operations & Power Protocol</li>
                                <li onclick="ShipManual.goToPage(12)"><span class="toc-page-num">11</span> Gate Decision & Wall Switch Protocol</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `
        },

        // PAGE 2: MISSION CHARTER & EARTH EVACUATION
        {
            id: "ch1-p1",
            chapter: "CHAPTER 1: SURVIVAL PROTOCOL & LOGISTICS",
            contentHtml: `
                <div class="manual-page-content">
                    <div class="section-stamp">CLASSIFICATION: TOP SECRET // ARK PROTOCOL 2030</div>
                    
                    <h3 class="manual-heading">The Crisis & Earth Evacuation</h3>
                    <p>
                        It is the year <strong>2030</strong>. Atmospheric degradation on Earth has reached critical thresholds. 
                        The <em>Starship Ark</em> represents humanity's final deep-space evacuation vessel. As the designated 
                        Booth Security Officer, your primary mandate is assembling a team built for <strong> survival</strong>.
                    </p>

                    <h3 class="manual-heading">Security Officer Duties</h3>
                    <p>
                        You are stationed at the primary embarkation booth. Candidates arrive continuously requesting passage aboard the Ark. 
                        You must scrutinize their identification, clearance documentation, work history, and payroll records to separate genuine, 
                        qualified crew candidates from desperate frauds or saboteurs.
                    </p>

                    <h3 class="manual-heading">Vessel Capacity Constraints</h3>
                    <div class="manual-callout-box">
                        <strong>CREW CAPACITY LIMIT: 6 SEATS TOTAL</strong><br>
                        • Seat 1: Security Officer (Stationed — You)<br>
                        • Seats 2–6: Candidate Positions (Evaluated by You)<br>
                    </div>
                    <p>
                        Once you have assembled 5 qualified crew members, the Ark will seal its airlocks and initiate space launch. Every candidate you accept fills 
                        a vital seat required for long-term vessel survival.
                    </p>
                </div>
            `
        },

        // PAGE 3: CORE VESSEL RESOURCES
        {
            id: "ch1-p2",
            chapter: "CHAPTER 1: SURVIVAL PROTOCOL & LOGISTICS",
            contentHtml: `
                <div class="manual-page-content">
                    <div class="section-stamp">DIRECTIVE: RESOURCE MANAGEMENT</div>
                    
                    <h3 class="manual-heading">The Three Pillars of Survival</h3>
                    <p>
                        The Starship Ark relies on a supply of three finite resources for deep-space travel. 
                        A failure or total depletion in any of these categories guarantees mission failure.
                    </p>

                    <div class="manual-callout-box">
                        <strong>RESOURCE CATEGORIES:</strong><br>
                        • <strong>Fuel (Energy Core):</strong> Powers the propulsion drives and electrical grids. Managed by the Reactor.<br>
                        • <strong>O2 (Atmosphere):</strong> Breathable air and atmospheric pressure. Managed by the O2 Bay Scrubbers.<br>
                        • <strong>Rations (Food/Water):</strong> Hydration and caloric intake. Managed by the Hydroponics Bay.
                    </div>

                    <h3 class="manual-heading">Closed-Loop Scarcity</h3>
                    <p>
                        Every candidate accepted aboard the vessel introduces a continuous drain on O2 and Rations over the multi-year journey. 
                        The precise rate of resource consumption is highly dependent on individual crew profiles and station assignments 
                        (detailed further in Chapter 2).
                    </p>
                </div>
            `
        },

        // PAGE 4: CREDENTIAL & TIMELINE AUDIT PROTOCOL
        {
            id: "ch1-p3",
            chapter: "CHAPTER 1: SURVIVAL PROTOCOL & LOGISTICS",
            contentHtml: `
                <div class="manual-page-content">
                    <div class="section-stamp">AUDIT DIRECTIVE: PROCEDURAL FLAW DETECTION</div>
                    
                    <h3 class="manual-heading">Setting Year Standard (2030)</h3>
                    <p>
                        All candidate documentation is issued relative to the setting year <strong>2030</strong>. It is advised to perform cross-document 
                        validation across candidate documents prior to approving entry.
                    </p>

                    <div class="manual-callout-box warning-box">
                        <strong>TIMELINE DISCREPANCY MATH FORMULA:</strong><br>
                        <code>2030 - Graduation Year = Registered Experience</code><br><br>
                        <em>Example of Flaw:</em> If a candidate graduated in 2024, their maximum legitimate experience in 2030 is <strong>6 years</strong>. 
                        If their watch-doc claims 10 years of experience, it is an inflated fraud!
                    </div>

                    <h3 class="manual-heading">Red Flag Indicators</h3>
                    <ul class="manual-bullet-list">
                        <li><strong>Pre-Dated Payroll:</strong> Payroll start year predating the candidate's graduation year.</li>
                        <li><strong>Major Mismatch:</strong> Degree major that is completely unrelated to the candidate's claimed profession.</li>
                        <li><strong>Document Mismatch:</strong> Name, age, or reference ID discrepancies across documents.</li>
                    </ul>
                </div>
            `
        },

        // PAGE 5: COCKPIT
        {
            id: "ch2-p4",
            chapter: "CHAPTER 2: STATION DIRECTIVES & QUALIFICATIONS",
            contentHtml: `
                <div class="manual-page-content">
                    <div class="section-stamp">COCKPIT: PILOTING & TRAJECTORY</div>
                    <h3 class="manual-heading">Cockpit Overview</h3>
                    <p>The Cockpit manages navigation, deep-space trajectory plotting, and orbital maneuvers. Efficient piloting ensures the Starship Ark reaches its destination within the projected timeline.</p>
                    
                    <h3 class="manual-heading">Recommended Profile</h3>
                    <p>Degrees in aerospace engineering, astrophysics, or extensive military piloting experience are heavily recommended. Candidates should have a proven track record of complex navigational command.</p>

                    <h3 class="manual-heading">Risk Factor: Journey Duration</h3>
                    <div class="manual-callout-box">
                        <strong>TRAJECTORY DELAYS:</strong> Inexperienced pilots will extend the total duration of the voyage.
                    </div>
                    <p>If a candidate lacks sufficient years of high-level piloting experience, they will struggle with the Ark's advanced navigation systems. Constant course corrections and sub-optimal routing will increase the total length of the journey, forcing all other life-support stations to stretch their resources over a longer period.</p>
                </div>
            `
        },

        // PAGE 6: MEDBAY
        {
            id: "ch2-p5",
            chapter: "CHAPTER 2: STATION DIRECTIVES & QUALIFICATIONS",
            contentHtml: `
                <div class="manual-page-content">
                    <div class="section-stamp">MEDBAY: TRAUMA & DIAGNOSTICS</div>
                    <h3 class="manual-heading">Medbay Overview</h3>
                    <p>The Medbay is responsible for crew physical health, injury triage, and preventing biological outbreaks in closed quarters. A competent medical officer keeps the rest of the crew functioning optimally.</p>
                    
                    <h3 class="manual-heading">Recommended Profile</h3>
                    <p>Advanced degrees in medicine, pharmacology, or trauma surgery are highly recommended. Candidates must possess official, verifiable medical licenses from recognized terrestrial authorities.</p>

                    <h3 class="manual-heading">Risk Factor: Malpractice & Watchlist Flags</h3>
                    <div class="manual-callout-box warning-box">
                        <strong>UNVERIFIED PRACTITIONERS:</strong> Capable but unlicensed doctors carry severe internal risks.
                    </div>
                    <p>In desperate times, "back-alley" surgeons or candidates with flagged criminal histories may present themselves as medical professionals. While they might be capable of treating injuries, placing an unlicensed or unstable individual in control of the ship's pharmaceutical supplies drastically increases the risk of internal incidents, malpractice, or drug theft.</p>
                </div>
            `
        },

        // PAGE 7: REACTOR
        {
            id: "ch2-p6",
            chapter: "CHAPTER 2: STATION DIRECTIVES & QUALIFICATIONS",
            contentHtml: `
                <div class="manual-page-content">
                    <div class="section-stamp">REACTOR: POWER & CORE STABILITY</div>
                    <h3 class="manual-heading">Reactor Overview</h3>
                    <p>The Reactor is the beating heart of the Starship Ark, supplying power to the propulsion drives and all internal grids. An inefficient reactor drains fuel exponentially faster, threatening to strand the vessel in deep space.</p>
                    
                    <h3 class="manual-heading">Recommended Profile</h3>
                    <p>Advanced degrees in nuclear engineering, quantum mechanics, or heavy-machinery operation are heavily recommended. Experience in high-stress, industrial environments is preferred over purely academic backgrounds.</p>

                    <h3 class="manual-heading">Risk Factor: Security & Sabotage</h3>
                    <div class="manual-callout-box warning-box">
                        <strong>EXTREME VULNERABILITY:</strong> The Reactor Chief has unrestricted access to the ship's most critical systems.
                    </div>
                    <p>Candidates with criminal histories or radical affiliations pose a catastrophic sabotage risk. A highly qualified candidate is worthless if they intentionally detonate the core.</p>
                </div>
            `
        },

        // PAGE 8: HYDROPONICS
        {
            id: "ch2-p7",
            chapter: "CHAPTER 2: STATION DIRECTIVES & QUALIFICATIONS",
            contentHtml: `
                <div class="manual-page-content">
                    <div class="section-stamp">HYDROPONICS: FOOD CULTIVATION</div>
                    <h3 class="manual-heading">Hydroponics Overview</h3>
                    <p>The Hydroponics Bay is responsible for cultivating caloric sustenance and recycling the ship's water supply. A failure here guarantees slow starvation for the entire crew during the transit.</p>
                    
                    <h3 class="manual-heading">Recommended Profile</h3>
                    <p>Backgrounds in botany, agricultural engineering, or bio-chemistry are recommended. Candidates with practical farming or closed-loop ecosystem experience often excel here.</p>

                    <h3 class="manual-heading">Risk Factor: Crew Physical Mass</h3>
                    <div class="manual-callout-box">
                        <strong>RATION DRAIN:</strong> Heavier crew members consume greater quantities of daily food and water.
                    </div>
                    <p>If you approve heavy candidates for other stations, an elite Hydroponics officer is necessary to offset the massive resource drain. Bigger is not always better, so find balance in your crew to manage food/water consumption.</p>
                </div>
            `
        },

        // PAGE 9: O2 BAY
        {
            id: "ch2-p8",
            chapter: "CHAPTER 2: STATION DIRECTIVES & QUALIFICATIONS",
            contentHtml: `
                <div class="manual-page-content">
                    <div class="section-stamp">O2 BAY: LIFE SUPPORT & SCRUBBERS</div>
                    <h3 class="manual-heading">O2 Bay Overview</h3>
                    <p>The O2 Bay manages atmospheric pressure, temperature regulation, and CO2 scrubbing. It is the primary life support mechanism preventing toxic air buildup within the vessel.</p>
                    
                    <h3 class="manual-heading">Recommended Profile</h3>
                    <p>Degrees or certifications in HVAC systems, atmospheric mechanics, or chemical engineering are recommended. Practical experience with hazardous environment containment is highly valued.</p>

                    <h3 class="manual-heading">Risk Factor: Age & Respiratory Strain</h3>
                    <div class="manual-callout-box">
                        <strong>ATMOSPHERIC STRAIN:</strong> Elderly crew require higher baseline O2 concentrations.
                    </div>
                    <p>Older candidates, or those with flagged medical histories, inherently strain the O2 scrubbers to remain healthy. If your crew roster skews older, a highly skilled O2 Bay technician becomes essential to prevent total life support collapse.</p>
                </div>
            `
        },

        // PAGE 10: BRIG
        {
            id: "ch2-p9",
            chapter: "CHAPTER 2: STATION DIRECTIVES & QUALIFICATIONS",
            contentHtml: `
                <div class="manual-page-content">
                    <div class="section-stamp">BRIG: INTERNAL SECURITY & THREAT CONTAINMENT</div>
                    <h3 class="manual-heading">Brig Overview</h3>
                    <p>The Brig serves as the internal law enforcement center of the Ark. The Chief of Security is responsible for maintaining order, mitigating crew panic, and carrying out executive disciplinary actions.</p>
                    
                    <h3 class="manual-heading">Recommended Profile</h3>
                    <p>Backgrounds in criminal justice, military police, or high-level physical security are recommended. A disciplined and level-headed temperament is crucial for this role.</p>

                    <h3 class="manual-heading">Risk Factor: Crew Panic & Ejection Protocols</h3>
                    <div class="manual-callout-box">
                        <strong>MAINTAINING ORDER:</strong> A qualified Brig officer suppresses panic and ensures bloodless ejections.
                    </div>
                    <p> A qualified Brig officer actively maintains discipline, keeping the crew calm and panic low. Should a crew member need to be discharged from the Ark, the Brig officer is needed to execute the ejection sequence. Without them, panic goes unchecked, and attempting to eject a hostile crew member may result in violent resistance or collateral damage to ship systems.</p>
                </div>
            `
        },

        // PAGE 11: TERMINAL & POWER PROTOCOL
        {
            id: "ch3-p10",
            chapter: "CHAPTER 3: BOOTH CONTROLS & TERMINAL PROTOCOL",
            contentHtml: `
                <div class="manual-page-content">
                    <div class="section-stamp">OPERATIONS PROTOCOL: TERMINAL & POWER DIRECTIVES</div>
                    
                    <h3 class="manual-heading">The Security Terminal (Security_CLI)</h3>
                    <p>
                        The desktop workstation connects to the Ark embarkation datanet. Access the terminal by clicking the 
                        desk console (or pressing ESC to return). Officers use the terminal to retrieve candidate files:
                    </p>
                    <ul class="manual-bullet-list">
                        <li><strong>FETCH EDU & FIN:</strong> Public records (academics, financials). Free of power cost.</li>
                        <li><strong>FETCH WATCH:</strong> Police incident records and security flags. Drains <strong>2 PWR</strong> (initial fetch only).</li>
                        <li><strong>FETCH BIO:</strong> Biometric scans, lung capacity, and medical flags. Drains <strong>2 PWR</strong> (initial fetch only).</li>
                    </ul>

                    <h3 class="manual-heading">Auxiliary Power Grid (30 PWR Reserve)</h3>
                    <p>
                        The checkpoint station operates on a finite 30-unit auxiliary battery reserve. Private queries 
                        (WATCH and BIO) draw 2 PWR on their first retrieval per candidate; requerying cached records for the same candidate 
                        costs 0 PWR. When reserves hit <strong>0 PWR</strong>, un-fetched private records cannot be accessed.
                    </p>

                    <h3 class="manual-heading">Desk Lamp & Power Overload Hazard</h3>
                    <div class="manual-callout-box warning-box">
                        <strong>CIRCUIT OVERLOAD NOTICE:</strong><br>
                        Operating the terminal while the Halogen Desk Lamp is <strong>ON</strong> draws excess current from the backup cell, 
                        draining <strong>1 additional PWR every 20 seconds</strong>.<br><br>
                        <em>Protocol:</em> Always toggle the desk lamp <strong>OFF</strong> during extended terminal analysis to conserve auxiliary power.
                    </div>
                </div>
            `
        },

        // PAGE 12: WALL SWITCH PROTOCOL
        {
            id: "ch3-p11",
            chapter: "CHAPTER 3: BOOTH CONTROLS & TERMINAL PROTOCOL",
            contentHtml: `
                <div class="manual-page-content">
                    <div class="section-stamp">DECISION PROTOCOL: GATE CONTROLS</div>
                    <h3 class="manual-heading">The Assessment Verdict</h3>
                    <p>Once you have thoroughly audited a candidate's dossier, you must render a final verdict using your booth controls.</p>
                    
                    <h3 class="manual-heading">Approval (Green Sequence)</h3>
                    <p>Authorize entry only if the candidate is vital to the Ark's survival and passes all cross-document audits. Granting access permanently fills one of the six vessel crew seats. Once filled, a seat cannot be easily vacated.</p>

                    <h3 class="manual-heading">Rejection (Red Sequence)</h3>
                    <p>Turn away frauds, saboteurs, and unnecessary liabilities. Rejection simply denies them entry to the boarding ramp. However, if a candidate becomes hostile or attempts to force entry upon rejection, coordinate with your Brig officer to initiate <strong>Ejection Protocols</strong>.</p>
                </div>
            `
        }
    ],

    // Controller Methods
    openManual() {
        this.isOpen = true;
        const modal = document.getElementById('manual-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.renderPage(this.currentPageIndex);
        }
    },

    closeManual() {
        this.isOpen = false;
        const modal = document.getElementById('manual-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    goToPage(index) {
        if (index >= 0 && index < this.pages.length) {
            this.currentPageIndex = index;
            this.renderPage(this.currentPageIndex);
        }
    },

    nextPage() {
        if (this.currentPageIndex < this.pages.length - 1) {
            this.currentPageIndex++;
            this.renderPage(this.currentPageIndex);
        }
    },

    prevPage() {
        if (this.currentPageIndex > 0) {
            this.currentPageIndex--;
            this.renderPage(this.currentPageIndex);
        }
    },

    renderPage(index) {
        const page = this.pages[index];
        if (!page) return;

        document.getElementById('manual-chapter-tag').innerText = page.chapter;
        document.getElementById('manual-page-content-area').innerHTML = page.contentHtml;
        
        let indicator = '';
        if (index === 0) indicator = '';
        else if (index === 1) indicator = 'INDEX';
        else indicator = index - 1;
        document.getElementById('manual-page-indicator').innerText = indicator;

        // Disable/enable prev/next buttons
        const btnPrev = document.getElementById('manual-btn-prev');
        const btnNext = document.getElementById('manual-btn-next');
        if (btnPrev) btnPrev.disabled = (index === 0);
        if (btnNext) btnNext.disabled = (index === this.pages.length - 1);
    }
};

window.ShipManual = ShipManual;
