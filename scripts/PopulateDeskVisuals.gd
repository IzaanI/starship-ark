@tool
extends SceneTree

func _init():
	print("Populating Zone 2 Document Props and Zone 3 X-Ray Scanner Visuals...")

	var scene = load("res://scenes/SecurityDesk.tscn")
	if not scene: quit(); return
	var root = scene.instantiate()

	# Zone 2 Desk Area Setup
	var desk_area = root.get_node_or_null("MainWorkbench/Zone2/Margin/VBox/DeskArea")
	if desk_area:
		# Clear old children
		for child in desk_area.get_children():
			child.queue_free()

		# 1. Passport Card
		var passport = PanelContainer.new()
		passport.name = "PassportProp"
		passport.custom_minimum_size = Vector2(140, 190)
		passport.position = Vector2(30, 20)
		passport.rotation_degrees = -4.0

		var sb_pass = StyleBoxFlat.new()
		sb_pass.bg_color = Color("#0f1d2c")
		sb_pass.border_color = Color("#2b4b68")
		sb_pass.set_border_width_all(2)
		sb_pass.set_corner_radius_all(6)
		passport.add_theme_stylebox_override("panel", sb_pass)

		var pass_vbox = VBoxContainer.new()
		pass_vbox.alignment = BoxContainer.ALIGNMENT_CENTER
		var lbl_pass1 = Label.new()
		lbl_pass1.text = "PASSPORT"
		lbl_pass1.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl_pass1.add_theme_color_override("font_color", Color("#dfb15b"))
		
		var lbl_pass2 = Label.new()
		lbl_pass2.text = "🌐\nINTERNATIONAL"
		lbl_pass2.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl_pass2.add_theme_color_override("font_color", Color("#dfb15b"))

		var btn_pass = Button.new()
		btn_pass.name = "BtnPassport"
		btn_pass.text = "INSPECT"
		btn_pass.flat = true

		pass_vbox.add_child(lbl_pass1)
		pass_vbox.add_child(lbl_pass2)
		pass_vbox.add_child(btn_pass)
		passport.add_child(pass_vbox)
		desk_area.add_child(passport)

		# 2. Medical Report Card
		var med = PanelContainer.new()
		med.name = "MedicalProp"
		med.custom_minimum_size = Vector2(140, 190)
		med.position = Vector2(170, 10)
		med.rotation_degrees = 3.0

		var sb_med = StyleBoxFlat.new()
		sb_med.bg_color = Color("#ebe8dc")
		sb_med.border_color = Color("#c5c0af")
		sb_med.set_border_width_all(2)
		sb_med.set_corner_radius_all(4)
		med.add_theme_stylebox_override("panel", sb_med)

		var med_vbox = VBoxContainer.new()
		var lbl_med1 = Label.new()
		lbl_med1.text = "MEDICAL REPORT"
		lbl_med1.add_theme_color_override("font_color", Color("#222222"))
		
		var lbl_stamp = Label.new()
		lbl_stamp.text = "PENDING"
		lbl_stamp.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl_stamp.add_theme_color_override("font_color", Color("#dc2626"))

		var btn_med = Button.new()
		btn_med.name = "BtnMedical"
		btn_med.text = "INSPECT"
		btn_med.flat = true

		med_vbox.add_child(lbl_med1)
		med_vbox.add_child(lbl_stamp)
		med_vbox.add_child(btn_med)
		med.add_child(med_vbox)
		desk_area.add_child(med)

		# 3. Background Check Sheet Card
		var bg_sheet = PanelContainer.new()
		bg_sheet.name = "BackgroundProp"
		bg_sheet.custom_minimum_size = Vector2(160, 200)
		bg_sheet.position = Vector2(310, 20)
		bg_sheet.rotation_degrees = 5.0

		var sb_bg = StyleBoxFlat.new()
		sb_bg.bg_color = Color("#e4e1d5")
		sb_bg.border_color = Color("#c2bda9")
		sb_bg.set_border_width_all(2)
		sb_bg.set_corner_radius_all(4)
		bg_sheet.add_theme_stylebox_override("panel", sb_bg)

		var bg_vbox = VBoxContainer.new()
		var lbl_bg1 = Label.new()
		lbl_bg1.text = "BACKGROUND CHECK"
		lbl_bg1.add_theme_color_override("font_color", Color("#1c242c"))

		var lbl_bg_lines = Label.new()
		lbl_bg_lines.text = "Identity: Verified\nEmployment: Confirmed\nEducation: Confirmed\nCriminal: Clear"
		lbl_bg_lines.add_theme_color_override("font_color", Color("#334155"))

		var btn_bg = Button.new()
		btn_bg.name = "BtnBackground"
		btn_bg.text = "INSPECT"
		btn_bg.flat = true

		bg_vbox.add_child(lbl_bg1)
		bg_vbox.add_child(lbl_bg_lines)
		bg_vbox.add_child(btn_bg)
		bg_sheet.add_child(bg_vbox)
		desk_area.add_child(bg_sheet)

	# Save packed scene
	var packed = PackedScene.new()
	packed.pack(root)
	ResourceSaver.save(packed, "res://scenes/SecurityDesk.tscn")
	print("Zone 2 & Zone 3 visual props successfully built into SecurityDesk.tscn!")
	quit()
