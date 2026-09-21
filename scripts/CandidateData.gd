class_name CandidateData
extends Resource

@export var candidate_id: String
@export var candidate_name: String
@export var role_title: String
@export var station: String
@export var age: int
@export var origin_city: String
@export var avatar_icon: String
@export var true_identity: String # LEGITIMATE_EXPERT, DESPERATE_FRAUD, DOOMSDAY_SABOTEUR, RESOURCE_HOARDER, CONTAGIOUS_CARRIER, FRAGILE_UNSTABLE
@export var true_identity_label: String

@export var passport_city: String
@export var is_diploma_forged: bool = false
@export var diploma_flaw: String = ""

@export var education_log: String = ""
@export var watchlist_log: String = ""
@export var medical_log: String = ""

@export var luggage_items: Array = []
@export var flagged_item: String = "None"
@export var is_saboteur: bool = false
@export var quote: String = ""
