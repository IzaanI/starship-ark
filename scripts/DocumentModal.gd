extends Control

@onready var title_label = $Margin/Panel/VBox/Header/Title
@onready var content_label = $Margin/Panel/VBox/ContentText

func show_document(doc_type: String, candidate: CandidateData):
	show()
	if doc_type == "passport":
		title_label.text = "INTERNATIONAL PASSPORT INSPECTION"
		content_label.text = "Candidate Name: " + candidate.candidate_name + "\n"
		content_label.text += "Issue City: " + candidate.passport_city + "\n"
		content_label.text += "Reference ID: " + candidate.candidate_id + "\n"
		content_label.text += "Expiry Date: 2028-11\n"
		content_label.text += "Status: Authentic Official Stamp"
	elif doc_type == "medical":
		title_label.text = "MEDICAL REPORT INSPECTION"
		content_label.text = "Patient: " + candidate.candidate_name + "\n"
		content_label.text += "Vaccination: Verified\n"
		content_label.text += "Respiratory Scan: Clear\n"
		content_label.text += "Status: " + candidate.medical_log
	elif doc_type == "background":
		title_label.text = "BACKGROUND CHECK SHEET INSPECTION"
		content_label.text = "Subject: " + candidate.candidate_name + "\n"
		content_label.text += "Identity Verification: OK\n"
		content_label.text += "Education Record: " + (candidate.diploma_flaw if candidate.is_diploma_forged else "Confirmed") + "\n"
		content_label.text += "Watchlist Status: " + candidate.watchlist_log

func _on_close_pressed():
	hide()
