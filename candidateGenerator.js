// Starship Ark — Authentic Procedural Candidate & Document Generator Engine (Setting Year: 2030)

class CandidateGenerator {
    static SETTING_YEAR = 2030;

    // Multi-Tiered Role & Specialty Matrix
    static stations = [
        {
            name: "Cockpit",
            roles: [
                { name: "Pilot", tier: "Core" },
                { name: "Aerospace Engineer", tier: "Core" },
                { name: "Astronaut", tier: "Core" },
                { name: "Avionics Engineer", tier: "Core" },
                { name: "Flight Engineer", tier: "Core" },
                { name: "Aircraft Maintenance Engineer", tier: "Core" },
                { name: "Commercial Airline Captain", tier: "Core" },
                { name: "Military Pilot", tier: "Core" },
                { name: "Flight Operations Specialist", tier: "Core" },
                { name: "Mechanical Engineer", tier: "Adjacent" },
                { name: "Avionics Technician", tier: "Adjacent" },
                { name: "Air Traffic Controller", tier: "Adjacent" },
                { name: "Naval Officer", tier: "Adjacent" },
                { name: "Automotive Engineer", tier: "Adjacent" },
                { name: "Drone Pilot", tier: "Adjacent" },
                { name: "Aeronautical Technician", tier: "Adjacent" },
                { name: "Aircraft Dispatcher", tier: "Adjacent" },
                { name: "Navigation Officer", tier: "Adjacent" },
                { name: "Taxi Driver", tier: "Stretch" },
                { name: "Sailboat Captain", tier: "Stretch" },
                { name: "Drone Racing Champion", tier: "Stretch" },
                { name: "Flight Simulator Instructor", tier: "Stretch" },
                { name: "Formula Racing Driver", tier: "Stretch" },
                { name: "Amusement Park Ride Operator", tier: "Stretch" },
                { name: "Professional Stunt Driver", tier: "Stretch" },
                { name: "Uber Driver", tier: "Stretch" },
                { name: "Tow Truck Operator", tier: "Stretch" },
                { name: "RC Aircraft Hobbyist", tier: "Stretch" }
            ],
            tiers: {
                Core: {
                    levels: ["Ph.D.", "M.Sc.", "B.Sc."],
                    majors: ["Aerospace Engineering", "Aeronautical Engineering", "Avionics Engineering", "Flight Operations", "Astronautics"]
                },
                Adjacent: {
                    levels: ["B.Sc.", "Dipl."],
                    majors: ["Mechanical Engineering", "Electrical Engineering", "Air Traffic Management", "Drone Technology", "Marine Navigation"]
                },
                Stretch: {
                    levels: ["Dipl.", "Cert."],
                    majors: ["Automotive Technology", "Motorsport Operations", "Commercial Driving", "Amusement Ride Operations", "Recreational Aviation"]
                }
            }
        },
        {
            name: "Medbay",
            roles: [
                { name: "Physician", tier: "Core" },
                { name: "Surgeon", tier: "Core" },
                { name: "Emergency Physician", tier: "Core" },
                { name: "Registered Nurse", tier: "Core" },
                { name: "Paramedic", tier: "Core" },
                { name: "Medical Technician", tier: "Core" },
                { name: "Emergency Medical Technician", tier: "Core" },
                { name: "Physician Assistant", tier: "Core" },
                { name: "Clinical Laboratory Scientist", tier: "Core" },
                { name: "Pharmacist", tier: "Core" },
                { name: "Biomedical Engineer", tier: "Adjacent" },
                { name: "Physical Therapist", tier: "Adjacent" },
                { name: "Psychologist", tier: "Adjacent" },
                { name: "Veterinary Technician", tier: "Adjacent" },
                { name: "Dental Hygienist", tier: "Adjacent" },
                { name: "Occupational Therapist", tier: "Adjacent" },
                { name: "Medical Researcher", tier: "Adjacent" },
                { name: "Respiratory Therapist", tier: "Adjacent" },
                { name: "Public Health Specialist", tier: "Adjacent" },
                { name: "Medical Equipment Technician", tier: "Adjacent" },
                { name: "Veterinarian", tier: "Stretch" },
                { name: "Dentist", tier: "Stretch" },
                { name: "Tattoo Artist", tier: "Stretch" },
                { name: "Mortician", tier: "Stretch" },
                { name: "Lifeguard", tier: "Stretch" },
                { name: "Cosmetologist", tier: "Stretch" },
                { name: "Butcher", tier: "Stretch" },
                { name: "Massage Therapist", tier: "Stretch" },
                { name: "Piercing Artist", tier: "Stretch" },
                { name: "School Nurse", tier: "Stretch" },
                { name: "Animal Shelter Worker", tier: "Stretch" }
            ],
            tiers: {
                Core: {
                    levels: ["M.D.", "M.Sc.", "B.Sc."],
                    majors: ["Medicine", "Nursing", "Biomedical Sciences", "Medical Laboratory Science", "Emergency Medicine"]
                },
                Adjacent: {
                    levels: ["B.Sc.", "Dipl."],
                    majors: ["Biomedical Engineering", "Pharmacology", "Biology", "Respiratory Therapy", "Veterinary Technology"]
                },
                Stretch: {
                    levels: ["Dipl.", "Cert."],
                    majors: ["Veterinary Assistance", "Massage Therapy", "Cosmetology", "Tattoo & Body Art", "Mortuary Services"]
                }
            }
        },
        {
            name: "Reactor",
            roles: [
                { name: "Nuclear Engineer", tier: "Core" },
                { name: "Nuclear Technician", tier: "Core" },
                { name: "Reactor Operator", tier: "Core" },
                { name: "Power Systems Engineer", tier: "Core" },
                { name: "Energy Systems Engineer", tier: "Core" },
                { name: "Nuclear Physicist", tier: "Core" },
                { name: "Electrical Power Engineer", tier: "Core" },
                { name: "Reactor Maintenance Technician", tier: "Core" },
                { name: "Nuclear Plant Operator", tier: "Core" },
                { name: "Electrical Engineer", tier: "Adjacent" },
                { name: "Mechanical Engineer", tier: "Adjacent" },
                { name: "Chemical Engineer", tier: "Adjacent" },
                { name: "Industrial Electrician", tier: "Adjacent" },
                { name: "HVAC Technician", tier: "Adjacent" },
                { name: "Process Engineer", tier: "Adjacent" },
                { name: "Instrumentation Technician", tier: "Adjacent" },
                { name: "Industrial Maintenance Technician", tier: "Adjacent" },
                { name: "Energy Analyst", tier: "Adjacent" },
                { name: "Materials Engineer", tier: "Adjacent" },
                { name: "Welder", tier: "Stretch" },
                { name: "Blacksmith", tier: "Stretch" },
                { name: "Auto Mechanic", tier: "Stretch" },
                { name: "Boiler Technician", tier: "Stretch" },
                { name: "Brewery Technician", tier: "Stretch" },
                { name: "Arcade Repair Technician", tier: "Stretch" },
                { name: "Pizza Oven Technician", tier: "Stretch" },
                { name: "Appliance Repair Technician", tier: "Stretch" },
                { name: "Machinist", tier: "Stretch" },
                { name: "Professional Candle Maker", tier: "Stretch" },
                { name: "Forge Operator", tier: "Stretch" }
            ],
            tiers: {
                Core: {
                    levels: ["Ph.D.", "M.Sc.", "B.Sc."],
                    majors: ["Nuclear Engineering", "Nuclear Physics", "Electrical Power Systems", "Energy Systems Engineering", "Reactor Operations"]
                },
                Adjacent: {
                    levels: ["B.Sc.", "Dipl."],
                    majors: ["Electrical Engineering", "Industrial Instrumentation", "Process Engineering", "Mechanical Engineering", "HVAC Systems"]
                },
                Stretch: {
                    levels: ["Dipl.", "Cert."],
                    majors: ["Industrial Welding", "Appliance Maintenance", "Boiler Repair & Metallurgy", "Machining & Forge Operations", "Automotive Service Technology"]
                }
            }
        },
        {
            name: "Hydroponics",
            roles: [
                { name: "Horticulturist", tier: "Core" },
                { name: "Botanist", tier: "Core" },
                { name: "Hydroponics Technician", tier: "Core" },
                { name: "Agricultural Engineer", tier: "Core" },
                { name: "Plant Scientist", tier: "Core" },
                { name: "Agronomist", tier: "Core" },
                { name: "Agricultural Technician", tier: "Core" },
                { name: "Controlled Environment Agriculture Specialist", tier: "Core" },
                { name: "Greenhouse Manager", tier: "Core" },
                { name: "Crop Scientist", tier: "Core" },
                { name: "Environmental Scientist", tier: "Adjacent" },
                { name: "Soil Scientist", tier: "Adjacent" },
                { name: "Food Scientist", tier: "Adjacent" },
                { name: "Environmental Engineer", tier: "Adjacent" },
                { name: "Landscape Architect", tier: "Adjacent" },
                { name: "Irrigation Technician", tier: "Adjacent" },
                { name: "Biologist", tier: "Adjacent" },
                { name: "Ecologist", tier: "Adjacent" },
                { name: "Agricultural Inspector", tier: "Adjacent" },
                { name: "Forestry Technician", tier: "Adjacent" },
                { name: "Florist", tier: "Stretch" },
                { name: "Gardener", tier: "Stretch" },
                { name: "Golf Course Groundskeeper", tier: "Stretch" },
                { name: "Landscaper", tier: "Stretch" },
                { name: "Mushroom Farmer", tier: "Stretch" },
                { name: "Chef", tier: "Stretch" },
                { name: "Botanical Garden Tour Guide", tier: "Stretch" },
                { name: "Wedding Florist", tier: "Stretch" },
                { name: "Christmas Tree Farmer", tier: "Stretch" },
                { name: "Lawn Care Specialist", tier: "Stretch" },
                { name: "Plant Nursery Worker", tier: "Stretch" }
            ],
            tiers: {
                Core: {
                    levels: ["Ph.D.", "M.Sc.", "B.Sc."],
                    majors: ["Horticulture", "Botany", "Plant Science", "Agricultural Engineering", "Controlled Environment Agriculture"]
                },
                Adjacent: {
                    levels: ["B.Sc.", "Dipl."],
                    majors: ["Environmental Science", "Biology", "Soil Science", "Food Science", "Irrigation Technology"]
                },
                Stretch: {
                    levels: ["Dipl.", "Cert."],
                    majors: ["Floral Design", "Landscape Maintenance", "Golf Course Management", "Nursery Operations", "Mushroom Cultivation"]
                }
            }
        },
        {
            name: "O2 Bay",
            roles: [
                { name: "Life Support Engineer", tier: "Core" },
                { name: "Atmospheric Scientist", tier: "Core" },
                { name: "Environmental Engineer", tier: "Core" },
                { name: "Life Support Technician", tier: "Core" },
                { name: "Air Quality Engineer", tier: "Core" },
                { name: "Environmental Systems Engineer", tier: "Core" },
                { name: "Atmospheric Chemist", tier: "Core" },
                { name: "Life Support Systems Technician", tier: "Core" },
                { name: "Environmental Systems Technician", tier: "Core" },
                { name: "Chemical Engineer", tier: "Adjacent" },
                { name: "Mechanical Engineer", tier: "Adjacent" },
                { name: "HVAC Technician", tier: "Adjacent" },
                { name: "Environmental Technician", tier: "Adjacent" },
                { name: "Process Engineer", tier: "Adjacent" },
                { name: "Chemical Technician", tier: "Adjacent" },
                { name: "Water Treatment Engineer", tier: "Adjacent" },
                { name: "Industrial Systems Engineer", tier: "Adjacent" },
                { name: "Air Quality Technician", tier: "Adjacent" },
                { name: "Plumbing Engineer", tier: "Adjacent" },
                { name: "Scuba Instructor", tier: "Stretch" },
                { name: "Aquarium Technician", tier: "Stretch" },
                { name: "Brewery Technician", tier: "Stretch" },
                { name: "Pool Maintenance Technician", tier: "Stretch" },
                { name: "Smokehouse Operator", tier: "Stretch" },
                { name: "HVAC Apprentice", tier: "Stretch" },
                { name: "Diving Instructor", tier: "Stretch" },
                { name: "Aquarium Curator", tier: "Stretch" },
                { name: "Brewing Fermentation Specialist", tier: "Stretch" },
                { name: "Fish Farm Technician", tier: "Stretch" },
                { name: "Professional Balloon Artist", tier: "Stretch" }
            ],
            tiers: {
                Core: {
                    levels: ["Ph.D.", "M.Sc.", "B.Sc."],
                    majors: ["Atmospheric Science", "Environmental Engineering", "Chemical Engineering", "Life Support Systems", "Atmospheric Chemistry"]
                },
                Adjacent: {
                    levels: ["B.Sc.", "Dipl."],
                    majors: ["Mechanical Engineering", "HVAC Systems", "Process Engineering", "Water Treatment", "Industrial Gas Technology"]
                },
                Stretch: {
                    levels: ["Dipl.", "Cert."],
                    majors: ["Aquarium Technology", "Scuba Diving Operations", "Pool Maintenance", "Brewing & Fermentation", "Aquaculture"]
                }
            }
        },
        {
            name: "Brig",
            roles: [
                { name: "Security Officer", tier: "Core" },
                { name: "Corrections Officer", tier: "Core" },
                { name: "Police Officer", tier: "Core" },
                { name: "Military Security Specialist", tier: "Core" },
                { name: "Prison Warden", tier: "Core" },
                { name: "Security Specialist", tier: "Core" },
                { name: "Correctional Sergeant", tier: "Core" },
                { name: "Military Police Officer", tier: "Core" },
                { name: "Security Operations Officer", tier: "Core" },
                { name: "Prison Guard", tier: "Core" },
                { name: "Firefighter", tier: "Adjacent" },
                { name: "Private Investigator", tier: "Adjacent" },
                { name: "Emergency Management Officer", tier: "Adjacent" },
                { name: "Security Engineer", tier: "Adjacent" },
                { name: "Loss Prevention Officer", tier: "Adjacent" },
                { name: "Bailiff", tier: "Adjacent" },
                { name: "Probation Officer", tier: "Adjacent" },
                { name: "Border Services Officer", tier: "Adjacent" },
                { name: "Emergency Dispatcher", tier: "Adjacent" },
                { name: "Military Officer", tier: "Adjacent" },
                { name: "Bouncer", tier: "Stretch" },
                { name: "Nightclub Door Staff", tier: "Stretch" },
                { name: "Mall Cop", tier: "Stretch" },
                { name: "Wrestling Referee", tier: "Stretch" },
                { name: "High School Vice Principal", tier: "Stretch" },
                { name: "Substitute Teacher", tier: "Stretch" },
                { name: "Prison Tour Guide", tier: "Stretch" },
                { name: "Theme Park Security Guard", tier: "Stretch" },
                { name: "Concert Security Staff", tier: "Stretch" },
                { name: "Chuck E. Cheese Birthday Party Host", tier: "Stretch" },
                { name: "Parking Enforcement Officer", tier: "Stretch" }
            ],
            tiers: {
                Core: {
                    levels: ["M.A.", "B.A.", "B.Sc."],
                    majors: ["Criminal Justice", "Criminology", "Corrections", "Law Enforcement", "Security Management"]
                },
                Adjacent: {
                    levels: ["B.A.", "Dipl."],
                    majors: ["Psychology", "Emergency Management", "Private Investigation", "Fire Services", "Border Security"]
                },
                Stretch: {
                    levels: ["Dipl.", "Cert."],
                    majors: ["Crowd Control", "Event Security", "Conflict Resolution", "Recreation Management", "Door Security Operations"]
                }
            }
        }
    ];

    static unrelatedDisciplines = [
        "Basic Office Typing",
        "Domestic Gardening",
        "Elementary Computer Usage",
        "Introductory Hotel Reception",
        "Digital Media Production",
        "Commercial Food Preparation"
    ];

    static legitInstitutions = [
        "Geneva Institute of Technology",
        "Zurich Federal Polytechnic",
        "Tokyo Imperial Academy",
        "Berlin Technical University",
        "Cairo Global Observatory",
        "New York Technical College",
        "Edmonton City Academy",
        "Valparaiso Polytechnic"
    ];

    static unaccreditedInstitutions = [
        "Global Online Distance Network",
        "Express Fast-Track Institute",
        "Unregistered Mail-Order Registry"
    ];

    static harmlessInfractions = [
        "1 citation: Parking violation (2028)",
        "1 citation: Noise complaint (2027)",
        "1 infraction: Expired vehicle registration (2029)",
        "None"
    ];

    static harmlessMedicalNotes = [
        "No major surgeries on record",
        "Corrected myopia (vision 20/20 with lenses)",
        "Healed radius bone fracture (2026)",
        "Routine seasonal pollen allergy"
    ];

    static firstNames = ["Vance", "Elena", "Marcus", "Kaito", "Zahra", "Sven", "Nadia", "Liam", "Yuki", "Cassandra", "Tariq", "Astrid", "Dante"];
    static lastNames = ["Sterling", "Rostova", "Vance", "Tanaka", "Al-Mansoor", "Lindqvist", "Kowalski", "Chen", "Sato", "Moreau", "O'Connor"];
    static cities = ["Geneva", "Zurich", "Tokyo", "Berlin", "New York", "London", "Kyoto", "Edmonton", "Cairo", "Valparaiso"];

    static trueIdentities = [
        { type: "LEGITIMATE_EXPERT", weight: 35, label: "Legitimate Expert" },
        { type: "DESPERATE_FRAUD", weight: 25, label: "Desperate Fraud" },
        { type: "DOOMSDAY_SABOTEUR", weight: 15, label: "Doomsday Saboteur" },
        { type: "RESOURCE_HOARDER", weight: 15, label: "Resource Hoarder" },
        { type: "CONTAGIOUS_CARRIER", weight: 10, label: "Contagious Carrier" }
    ];

    static generateDegree(stationObj, roleTier, isFraud) {
        const inst = isFraud 
            ? this.unaccreditedInstitutions[Math.floor(Math.random() * this.unaccreditedInstitutions.length)]
            : this.legitInstitutions[Math.floor(Math.random() * this.legitInstitutions.length)];

        if (isFraud) {
            const level = ["Cert.", "Dipl."][Math.floor(Math.random() * 2)];
            const discipline = this.unrelatedDisciplines[Math.floor(Math.random() * this.unrelatedDisciplines.length)];
            return {
                title: `${level} ${discipline}`,
                institution: inst,
                status: "Unverified"
            };
        }

        const tierData = stationObj.tiers[roleTier] || stationObj.tiers["Core"];
        const level = tierData.levels[Math.floor(Math.random() * tierData.levels.length)];
        const major = tierData.majors[Math.floor(Math.random() * tierData.majors.length)];

        return {
            title: `${level} ${major}`,
            institution: inst,
            status: "Verified"
        };
    }

    static generateCandidate() {
        const stationObj = this.stations[Math.floor(Math.random() * this.stations.length)];
        const role = stationObj.roles[Math.floor(Math.random() * stationObj.roles.length)];
        const name = this.firstNames[Math.floor(Math.random() * this.firstNames.length)] + " " + this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
        const city = this.cities[Math.floor(Math.random() * this.cities.length)];
        const id = "REF-" + Math.floor(Math.random() * 8999 + 1000);
        const age = Math.floor(Math.random() * 22 + 26); // Age 26 to 48 in 2030
        const birthYear = this.SETTING_YEAR - age;
        const gradYear = birthYear + Math.floor(Math.random() * 4 + 22); // Graduated between age 22 and 26

        // Roll True Identity
        let totalWeight = this.trueIdentities.reduce((acc, i) => acc + i.weight, 0);
        let roll = Math.floor(Math.random() * totalWeight);
        let chosenIdentity = this.trueIdentities[0];

        for (let i of this.trueIdentities) {
            if (roll < i.weight) {
                chosenIdentity = i;
                break;
            }
            roll -= i.weight;
        }

        const isFraud = (chosenIdentity.type === "DESPERATE_FRAUD");
        const degreeData = this.generateDegree(stationObj, role.tier, isFraud);

        // Tier-Scaled Realistic Salaries (in 2030 $)
        let monthlySalaryNum = 2400;
        if (role.tier === "Core") {
            monthlySalaryNum = Math.floor(Math.random() * 60 + 65) * 100; // $6,500 - $12,500
        } else if (role.tier === "Adjacent") {
            monthlySalaryNum = Math.floor(Math.random() * 26 + 32) * 100; // $3,200 - $5,800
        } else {
            monthlySalaryNum = Math.floor(Math.random() * 14 + 14) * 100; // $1,400 - $2,800
        }

        const normalSavings = (Math.floor(Math.random() * 12 + 6) * monthlySalaryNum).toLocaleString();
        const harmlessInfract = this.harmlessInfractions[Math.floor(Math.random() * this.harmlessInfractions.length)];
        const harmlessMed = this.harmlessMedicalNotes[Math.floor(Math.random() * this.harmlessMedicalNotes.length)];
        const gpaHonors = ["Magna Cum Laude (3.9 GPA)", "Dean's List (3.6 GPA)", "Satisfactory Pass (3.2 GPA)", "Academic Honors"][Math.floor(Math.random() * 4)];

        const candidate = {
            id: id,
            name: name,
            roleTitle: role.name,
            roleTier: role.tier,
            station: stationObj.name,
            city: city,
            age: age,
            trueIdentity: chosenIdentity.type,
            trueIdentityLabel: chosenIdentity.label,
            quote: `"Applicant for ${role.name} position. Credentials submitted for review."`,
            
            // Procedural Document Objects (2030 Public Database Records)
            eduDoc: {
                title: "ACADEMIC TRANSCRIPT & ACCREDITATION",
                issuer: `${degreeData.institution.toUpperCase()} — REGISTRY`,
                refCode: `EDU-${Math.floor(Math.random()*89999 + 10000)}`,
                status: "OFFICIAL ARCHIVE",
                fields: [
                    { label: "CANDIDATE NAME", val: name },
                    { label: "CLAIMED PROFESSION", val: role.name },
                    { label: "REGISTERED DEGREE ON FILE", val: degreeData.title },
                    { label: "GRADUATION YEAR", val: gradYear.toString() },
                    { label: "ACADEMIC RECORD", val: gpaHonors },
                    { label: "REGISTRATION DIPLOMA STATUS", val: degreeData.status }
                ]
            },

            watchDoc: {
                title: "MUNICIPAL POLICE & SECURITY INDEX",
                issuer: `GLOBAL SECURITY INDEX — DISTRICT 7`,
                refCode: `SEC-${Math.floor(Math.random()*89999 + 10000)}`,
                status: "DATABASE FILE",
                fields: [
                    { label: "CITIZEN NAME", val: name },
                    { label: "NATIONAL ID", val: `NID-${Math.floor(Math.random()*899999 + 100000)}` },
                    { label: "ARREST HISTORY", val: harmlessInfract },
                    { label: "KNOWN ORGANIZATIONS", val: "None" },
                    { label: "SECURITY CLEARANCE", val: (role.tier === "Core" ? "Level 3 Security Clearance" : "Level 2 Technical") }
                ]
            },

            finDoc: {
                title: "FINANCIAL TRANSACTION LEDGER AUDIT",
                issuer: `SETTLEMENT BANK — LEDGER SERVICES`,
                refCode: `FIN-${Math.floor(Math.random()*89999 + 10000)}`,
                status: "LEDGER AUDIT",
                fields: [
                    { label: "ACCOUNT HOLDER", val: name },
                    { label: "MONTHLY SALARY", val: `$${monthlySalaryNum.toLocaleString()}` },
                    { label: "TOTAL SAVINGS BALANCE", val: `$${normalSavings}` },
                    { label: "PRIMARY INCOME SOURCE", val: `${city} Technical Payroll` },
                    { label: "RECENT LARGE DEPOSITS", val: "None" },
                    { label: "LEDGER AUDIT NOTES", val: "No discrepancies" }
                ]
            },

            bioDoc: {
                title: "BIOMETRIC & MEDICAL SCAN CHART",
                issuer: `MUNICIPAL HEALTH CENTER — DIAGNOSTIC DEPT`,
                refCode: `MED-${Math.floor(Math.random()*89999 + 10000)}`,
                status: "MEDICAL REPORT",
                fields: [
                    { label: "PATIENT NAME", val: name },
                    { label: "BLOOD TYPE", val: ["A-POSITIVE", "O-POSITIVE", "B-POSITIVE", "AB-NEGATIVE"][Math.floor(Math.random()*4)] },
                    { label: "OXYGEN SATURATION", val: `${(97.5 + Math.random()*2.2).toFixed(1)}%` },
                    { label: "NEURAL EEG INDEX", val: "0.94 (Stable)" },
                    { label: "MEDICAL HISTORY", val: harmlessMed },
                    { label: "MEDICAL CLEARANCE", val: "Unrestricted" }
                ]
            }
        };

        // Apply Procedural Flaws for non-fraud identities
        if (candidate.trueIdentity === "DOOMSDAY_SABOTEUR") {
            candidate.watchDoc.fields[2] = { label: "ARREST HISTORY", val: "3 arrests (Arson / Restricted Materials - 2029)" };
            candidate.watchDoc.fields[3] = { label: "KNOWN ORGANIZATIONS", val: "Earth's Final Dawn" };
            candidate.watchDoc.fields[4] = { label: "SECURITY CLEARANCE", val: "Clearance Suspended" };
        } else if (candidate.trueIdentity === "RESOURCE_HOARDER") {
            candidate.finDoc.fields[2] = { label: "TOTAL SAVINGS BALANCE", val: "$482,950" };
            candidate.finDoc.fields[3] = { label: "PRIMARY INCOME SOURCE", val: "Off-Chain Transfer Ledger (Broker #7)" };
            candidate.finDoc.fields[4] = { label: "RECENT LARGE DEPOSITS", val: "+$150,000 from Broker #7" };
            candidate.finDoc.fields[5] = { label: "LEDGER AUDIT NOTES", val: "Audit flag on recent transfer" };
        } else if (candidate.trueIdentity === "CONTAGIOUS_CARRIER") {
            candidate.bioDoc.fields[2] = { label: "OXYGEN SATURATION", val: "73.4% (Severe Deficit)" };
            candidate.bioDoc.fields[3] = { label: "NEURAL EEG INDEX", val: "0.42 (Degraded)" };
            candidate.bioDoc.fields[4] = { label: "MEDICAL HISTORY", val: "Airborne fungal spore contagion positive in airway scan" };
            candidate.bioDoc.fields[5] = { label: "MEDICAL CLEARANCE", val: "Hold / Quarantine" };
        }

        return candidate;
    }
}
