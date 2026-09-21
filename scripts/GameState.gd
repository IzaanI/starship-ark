extends Node

var current_candidate: CandidateData
var accepted_crew: Array = []
var seats_filled: int = 2 # You + Assistant
var max_seats: int = 7
var seconds_remaining: int = 599 # 10 minutes countdown

signal candidate_changed(candidate: CandidateData)
signal seat_accepted(seats_filled: int)
signal game_over(crew: Array)

func _ready():
	randomize()

func next_candidate():
	current_candidate = CandidateGenerator.generate_candidate()
	candidate_changed.emit(current_candidate)

func accept_candidate():
	if current_candidate:
		accepted_crew.append(current_candidate)
		seats_filled += 1
		seat_accepted.emit(seats_filled)
		
		if seats_filled >= max_seats:
			game_over.emit(accepted_crew)
			return
			
	next_candidate()

func reject_candidate():
	next_candidate()
