class_name CandidateGenerator
extends RefCounted

static var roles = [
	{ "name": "Reactor Engineer", "station": "Reactor", "tool": "Calibration Meter", "icon": "📟" },
	{ "name": "Trauma Surgeon", "station": "Medbay", "tool": "Surgical Kit", "icon": "🧰" },
	{ "name": "Hydroponics Specialist", "station": "Hydroponics", "tool": "Seed Sample Case", "icon": "🌱" },
	{ "name": "Avionics Pilot", "station": "Cockpit", "tool": "Flight Helmet", "icon": "🪖" },
	{ "name": "Security Chief", "station": "Brig", "tool": "Tactical Stunner", "icon": "⚡" },
	{ "name": "Life Support Tech", "station": "O2 Bay", "tool": "Air Analyzer", "icon": "💨" },
	{ "name": "Biochemist", "station": "Medbay", "tool": "Micro-Centrifuge", "icon": "🔬" }
]

static var first_names = ["Vance", "Elena", "Marcus", "Kaito", "Zahra", "Sven", "Nadia", "Liam", "Yuki", "Cassandra", "Tariq"]
static var last_names = ["Sterling", "Rostova", "Vance", "Tanaka", "Al-Mansoor", "Lindqvist", "Kowalski", "Chen", "Sato", "Moreau"]
static var cities = ["Geneva", "Zurich", "Tokyo", "Berlin", "New York", "London", "Kyoto", "Edmonton"]
static var avatars = ["👩‍💼", "👨‍💼", "👩‍⚕️", "👨‍🔬", "👩‍✈️", "👨‍🔧", "👩‍💻", "🕵️‍♂️", "👩‍🚀", "👨‍🌾"]

static var true_identities = [
	{ "type": "LEGITIMATE_EXPERT", "weight": 35, "label": "Legitimate Expert" },
	{ "type": "DESPERATE_FRAUD", "weight": 25, "label": "Desperate Fraud" },
	{ "type": "DOOMSDAY_SABOTEUR", "weight": 15, "label": "Doomsday Saboteur" },
	{ "type": "RESOURCE_HOARDER", "weight": 10, "label": "Resource Hoarder" },
	{ "type": "CONTAGIOUS_CARRIER", "weight": 10, "label": "Contagious Carrier" },
	{ "type": "FRAGILE_UNSTABLE", "weight": 5, "label": "Fragile / Unstable" }
]

static func generate_candidate() -> CandidateData:
	var cand = CandidateData.new()
	var role = roles[randi() % roles.size()]
	
	cand.candidate_id = "REF-" + str(randi() % 8999 + 1000)
	cand.role_title = role["name"]
	cand.station = role["station"]
	cand.candidate_name = first_names[randi() % first_names.size()] + " " + last_names[randi() % last_names.size()]
	cand.avatar_icon = avatars[randi() % avatars.size()]
	cand.origin_city = cities[randi() % cities.size()]
	cand.passport_city = cand.origin_city
	cand.age = randi() % 25 + 28
	
	# Roll True Identity
	var total_weight = 0
	for i in true_identities:
		total_weight += i["weight"]
	var roll = randi() % total_weight
	var chosen_identity = true_identities[0]
	for i in true_identities:
		if roll < i["weight"]:
			chosen_identity = i
			break
		roll -= i["weight"]
		
	cand.true_identity = chosen_identity["type"]
	cand.true_identity_label = chosen_identity["label"]
	
	cand.education_log = "VERIFIED: M.Sc degree registered at " + cand.origin_city + " Tech."
	cand.watchlist_log = "CLEAR: No criminal or subversive group affiliation."
	cand.medical_log = "CLEAR: Biometric scan indicates normal respiratory function."
	cand.quote = "\"I've dedicated my career to " + cand.station + " systems. I just want a chance to help humanity survive.\""
	
	cand.luggage_items = ["Laptop (Personal)", "Clothing (Normal)", role["tool"]]
	
	# Apply Flaw Rules
	if cand.true_identity == "DESPERATE_FRAUD":
		cand.is_diploma_forged = true
		cand.diploma_flaw = "Seal Mismatch (Red instead of Gold)"
		cand.education_log = "FAIL: No graduate record registered under " + cand.candidate_name
		cand.flagged_item = "ID Stamp Kit (Forgery)"
		cand.luggage_items.append("Stamp Kit (Forgery)")
	elif cand.true_identity == "DOOMSDAY_SABOTEUR":
		cand.is_saboteur = true
		cand.watchlist_log = "FLAGGED: Affiliated with radical anti-tech cult 'Earth's Final Dawn'"
		cand.flagged_item = "Thermite Incendiary Canister"
		cand.luggage_items.append("Thermite Canister")
	elif cand.true_identity == "RESOURCE_HOARDER":
		cand.watchlist_log = "FLAGGED: Prior arrest for black-market warehouse theft"
		cand.flagged_item = "15kg Stashed Rations"
		cand.luggage_items.append("Stashed Rations")
	elif cand.true_identity == "CONTAGIOUS_CARRIER":
		cand.medical_log = "WARNING: Exposure to airborne fungal spores"
		cand.flagged_item = "Unmarked Bio-Vials"
		cand.luggage_items.append("Bio-Vials")
		
	return cand
