// Combinatorial Procedural Generator Engine for Starship Ark Sim
export const roles = [
  { name: "Reactor Engineer", station: "Reactor", toolName: "Calibration Meter", toolIcon: "📟" },
  { name: "Trauma Surgeon", station: "Medbay", toolName: "Surgical Kit", toolIcon: "🧰" },
  { name: "Hydroponics Specialist", station: "Hydroponics", toolName: "Seed Sample Case", toolIcon: "🌱" },
  { name: "Avionics Pilot", station: "Cockpit", toolName: "Flight Helmet", toolIcon: "🪖" },
  { name: "Security Chief", station: "Brig", toolName: "Tactical Stunner", toolIcon: "⚡" },
  { name: "Life Support Tech", station: "O2 Bay", toolName: "Air Analyzer", toolIcon: "💨" },
  { name: "Biochemist", station: "Medbay", toolName: "Micro-Centrifuge", toolIcon: "🔬" }
];

const firstNames = ["Vance", "Elena", "Marcus", "Kaito", "Zahra", "Sven", "Nadia", "Liam", "Yuki", "Cassandra", "Tariq", "Astrid"];
const lastNames = ["Sterling", "Rostova", "Vance", "Tanaka", "Al-Mansoor", "Lindqvist", "Kowalski", "Chen", "Sato", "Moreau", "O'Connor"];
const cities = ["Geneva", "Zurich", "Tokyo", "Berlin", "New York", "London", "Kyoto", "Montreal"];
const avatars = ["👨‍💼", "👩‍⚕️", "👨‍🔬", "👩‍✈️", "👨‍🔧", "👩‍💻", "🕵️‍♂️", "👩‍🚀", "👨‍🌾"];

const trueIdentities = [
  { type: "LEGITIMATE_EXPERT", weight: 35, label: "Legitimate Expert", color: "text-emerald-400" },
  { type: "DESPERATE_FRAUD", weight: 25, label: "Desperate Fraud", color: "text-amber-400" },
  { type: "DOOMSDAY_SABOTEUR", weight: 15, label: "Doomsday Saboteur", color: "text-rose-400" },
  { type: "RESOURCE_HOARDER", weight: 10, label: "Resource Hoarder", color: "text-purple-400" },
  { type: "CONTAGIOUS_CARRIER", weight: 10, label: "Contagious Carrier", color: "text-sky-400" },
  { type: "FRAGILE_UNSTABLE", weight: 5, label: "Fragile / Unstable", color: "text-pink-400" }
];

export function generateCandidate() {
  const role = roles[Math.floor(Math.random() * roles.length)];
  const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  const avatar = avatars[Math.floor(Math.random() * avatars.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const age = Math.floor(Math.random() * 25) + 28;

  const totalWeight = trueIdentities.reduce((acc, i) => acc + i.weight, 0);
  let roll = Math.random() * totalWeight;
  let identity = trueIdentities[0];
  for (let i of trueIdentities) {
    if (roll < i.weight) { identity = i; break; }
    roll -= i.weight;
  }

  let cand = {
    id: "ref_" + Math.floor(Math.random() * 8999 + 1000),
    name,
    role: role.name,
    station: role.station,
    avatar,
    city,
    age,
    trueIdentity: identity.type,
    identityLabel: identity.label,
    identityColor: identity.color,
    documents: {
      idCard: { issueCity: city, expiry: "2028-11", isValid: true },
      diploma: { school: `${city} Institute of Tech`, year: 2023, isForged: false, flaw: null }
    },
    database: {
      education: { verified: true, log: `VERIFIED: M.Sc degree registered at ${city} Institute of Tech.` },
      watchlist: { flagged: false, log: `CLEAR: No criminal or subversive group affiliation.` },
      medical: { flagged: false, log: `CLEAR: Biometric scan indicates normal respiratory function.` }
    },
    luggage: [
      { name: "Civilian Clothes", icon: "👕", type: "benign", desc: "Standard personal clothing." },
      { name: role.toolName, icon: role.toolIcon, type: "benign", desc: `Professional tool for ${role.name}.` }
    ],
    dialogue: {
      greeting: `"Please! I am a certified ${role.name}. I can keep the ${role.station} operating!"`,
      answers: {}
    }
  };

  if (identity.type === 'DESPERATE_FRAUD') {
    cand.documents.diploma.isForged = true;
    cand.documents.diploma.flaw = "Seal Mismatch (Red instead of Gold)";
    cand.documents.diploma.flawDetail = "The university seal color does not match official accreditation standards.";
    cand.database.education.verified = false;
    cand.database.education.log = `FAIL: No graduate record registered under ${name}.`;
    cand.luggage.push({ name: "ID Stamp Kit", icon: "📦", type: "suspicious", desc: "Handheld stamp kit used for altering paper seals." });
  } else if (identity.type === 'DOOMSDAY_SABOTEUR') {
    cand.database.watchlist.flagged = true;
    cand.database.watchlist.log = `FLAGGED: Affiliated with radical anti-tech cult 'Earth's Final Dawn'.`;
    cand.luggage.push({ name: "Thermite Canister", icon: "💣", type: "dangerous", desc: "High-density incendiary chemical fuse." });
  } else if (identity.type === 'RESOURCE_HOARDER') {
    cand.database.watchlist.flagged = true;
    cand.database.watchlist.log = `FLAGGED: Prior arrest for black-market warehouse theft.`;
    cand.luggage.push({ name: "15kg Canned Rations", icon: "🥫", type: "contraband", desc: "Stashed emergency food rations hidden in false bag bottom." });
  } else if (identity.type === 'CONTAGIOUS_CARRIER') {
    cand.database.medical.flagged = true;
    cand.database.medical.log = `WARNING: Pre-collapse quarantine record shows exposure to airborne fungal spores.`;
    cand.luggage.push({ name: "Unmarked Bio-Vials", icon: "🧪", type: "suspicious", desc: "Vials containing dark liquid medication." });
  }

  return cand;
}
