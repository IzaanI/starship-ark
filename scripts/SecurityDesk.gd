extends Control

# Cinematic First-Person POV Security Booth Scene
# Combines 3D GLB Furniture Models (Desk, Chairs, Bookshelf, Plant, Books)
# with Diegetic 2D Terminal Screen & Accept/Reject Levers.

var candidate_records_log: RichTextLabel
var candidate_portrait: CandidatePortrait
var candidate_speech_label: Label
var candidate_title_label: Label

var scene3d_root: Node3D
var candidate_sprite_3d: Sprite3D

func _ready():
	_build_cinematic_booth_scene()
	
	GameState.candidate_changed.connect(_on_candidate_changed)
	GameState.seat_accepted.connect(_on_seat_accepted)
	GameState.game_over.connect(_on_game_over)
	
	GameState.next_candidate()

func _build_cinematic_booth_scene():
	# Clear old nodes
	for child in get_children():
		child.queue_free()

	# 1. Real 3D Environment SubViewport (Renders 3D GLB Assets)
	var viewport_container = SubViewportContainer.new()
	viewport_container.set_anchors_preset(Control.PRESET_FULL_RECT)
	viewport_container.stretch = true
	add_child(viewport_container)

	var sub_viewport = SubViewport.new()
	sub_viewport.size = Vector2i(1440, 900)
	sub_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	viewport_container.add_child(sub_viewport)

	if ResourceLoader.exists("res://scenes/SecurityDesk3D.tscn"):
		var scene3d = load("res://scenes/SecurityDesk3D.tscn")
		scene3d_root = scene3d.instantiate()
		sub_viewport.add_child(scene3d_root)
		candidate_sprite_3d = scene3d_root.get_node_or_null("CandidateSprite3D")

	# Fallback background texture if viewport container isn't active
	var bg_tex = TextureRect.new()
	bg_tex.set_anchors_preset(Control.PRESET_FULL_RECT)
	if ResourceLoader.exists("res://assets/sprites/booth_room_bg.jpg") and not scene3d_root:
		bg_tex.texture = load("res://assets/sprites/booth_room_bg.jpg")
		bg_tex.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		bg_tex.stretch_mode = TextureRect.STRETCH_SCALE
		add_child(bg_tex)

	# 2. Main Room Layout Overlay (Left Window + Right Pinned Wall & Desk)
	var room_hbox = HBoxContainer.new()
	room_hbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	room_hbox.add_theme_constant_override("separation", 0)
	add_child(room_hbox)

	# =============================================================
	# LEFT HALF: WIDE RAIN WINDOW & DESK PROPS
	# =============================================================
	var left_zone = PanelContainer.new()
	left_zone.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left_zone.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var sb_left = StyleBoxFlat.new()
	sb_left.bg_color = Color(0, 0, 0, 0.2) # Semi-transparent overlay over 3D
	sb_left.border_color = Color("#111a24")
	sb_left.border_width_right = 2
	left_zone.add_theme_stylebox_override("panel", sb_left)
	room_hbox.add_child(left_zone)

	var left_margin = MarginContainer.new()
	left_margin.add_theme_constant_override("margin_left", 24)
	left_margin.add_theme_constant_override("margin_top", 24)
	left_margin.add_theme_constant_override("margin_right", 16)
	left_margin.add_theme_constant_override("margin_bottom", 120)
	left_zone.add_child(left_margin)

	var left_vbox = VBoxContainer.new()
	left_vbox.add_theme_constant_override("separation", 16)
	left_margin.add_child(left_vbox)

	# Window Frame
	var window_panel = PanelContainer.new()
	window_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var sb_win = StyleBoxFlat.new()
	sb_win.bg_color = Color(0.01, 0.03, 0.06, 0.6)
	sb_win.border_color = Color("#1e293b")
	sb_win.set_border_width_all(4)
	sb_win.set_corner_radius_all(12)
	window_panel.add_theme_stylebox_override("panel", sb_win)
	left_vbox.add_child(window_panel)

	var win_margin = MarginContainer.new()
	win_margin.add_theme_constant_override("margin_left", 12)
	win_margin.add_theme_constant_override("margin_top", 12)
	win_margin.add_theme_constant_override("margin_right", 12)
	win_margin.add_theme_constant_override("margin_bottom", 12)
	window_panel.add_child(win_margin)

	var win_vbox = VBoxContainer.new()
	win_margin.add_child(win_vbox)

	candidate_title_label = Label.new()
	candidate_title_label.text = "🌧️ BOOTH WINDOW — INSPECTION IN PROGRESS"
	candidate_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	candidate_title_label.add_theme_color_override("font_color", Color("#38bdf8"))
	win_vbox.add_child(candidate_title_label)

	var portrait_container = AspectRatioContainer.new()
	portrait_container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	portrait_container.ratio = 1.2
	win_vbox.add_child(portrait_container)

	candidate_portrait = CandidatePortrait.new()
	candidate_portrait.custom_minimum_size = Vector2(240, 240)
	candidate_portrait.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	candidate_portrait.size_flags_vertical = Control.SIZE_EXPAND_FILL
	portrait_container.add_child(candidate_portrait)

	candidate_speech_label = Label.new()
	candidate_speech_label.text = "\"Please verify my credentials. I am ready to serve.\""
	candidate_speech_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	candidate_speech_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	candidate_speech_label.add_theme_color_override("font_color", Color("#cbd5e1"))
	win_vbox.add_child(candidate_speech_label)

	# Left Desk Props Row
	var props_hbox = HBoxContainer.new()
	props_hbox.custom_minimum_size.y = 48
	props_hbox.add_theme_constant_override("separation", 24)
	left_vbox.add_child(props_hbox)

	var prop_lamp = Label.new()
	prop_lamp.text = "💡 Desk Lamp (3D)"
	prop_lamp.add_theme_color_override("font_color", Color("#f59e0b"))
	props_hbox.add_child(prop_lamp)

	var prop_mug = Label.new()
	prop_mug.text = "☕ Coffee Mug"
	prop_mug.add_theme_color_override("font_color", Color("#94a3b8"))
	props_hbox.add_child(prop_mug)

	var prop_book = Label.new()
	prop_book.text = "📓 Leather Notebook & Pen"
	prop_book.add_theme_color_override("font_color", Color("#64748b"))
	props_hbox.add_child(prop_book)

	# =============================================================
	# RIGHT HALF: PINNED WALL & LAPTOP TERMINAL
	# =============================================================
	var right_zone = PanelContainer.new()
	right_zone.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right_zone.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var sb_right = StyleBoxFlat.new()
	sb_right.bg_color = Color(0, 0, 0, 0.25)
	right_zone.add_theme_stylebox_override("panel", sb_right)
	room_hbox.add_child(right_zone)

	var right_margin = MarginContainer.new()
	right_margin.add_theme_constant_override("margin_left", 16)
	right_margin.add_theme_constant_override("margin_top", 16)
	right_margin.add_theme_constant_override("margin_right", 24)
	right_margin.add_theme_constant_override("margin_bottom", 120)
	right_zone.add_child(right_margin)

	var right_vbox = VBoxContainer.new()
	right_vbox.add_theme_constant_override("separation", 12)
	right_margin.add_child(right_vbox)

	var wall_hbox = HBoxContainer.new()
	wall_hbox.custom_minimum_size.y = 110
	wall_hbox.add_theme_constant_override("separation", 16)
	right_vbox.add_child(wall_hbox)

	var photo_card = PanelContainer.new()
	photo_card.custom_minimum_size = Vector2(100, 90)
	var sb_photo = StyleBoxFlat.new()
	sb_photo.bg_color = Color("#0f172a"); sb_photo.border_color = Color("#334155"); sb_photo.set_border_width_all(2)
	photo_card.add_theme_stylebox_override("panel", sb_photo)
	var photo_lbl = Label.new()
	photo_lbl.text = "🖼️\nCompound\nPhoto"
	photo_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	photo_lbl.add_theme_color_override("font_color", Color("#64748b"))
	photo_card.add_child(photo_lbl)
	wall_hbox.add_child(photo_card)

	var paper_card = PanelContainer.new()
	paper_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var sb_paper = StyleBoxFlat.new()
	sb_paper.bg_color = Color("#e2e4dc"); sb_paper.border_color = Color("#cbd5e1"); sb_paper.set_border_width_all(1)
	paper_card.add_theme_stylebox_override("panel", sb_paper)
	var paper_vbox = VBoxContainer.new()
	var paper_title = Label.new()
	paper_title.text = "Launch Checklist"
	paper_title.add_theme_color_override("font_color", Color("#0f172a"))
	var paper_body = Label.new()
	paper_body.text = "☑ Crew  ☑ Fuel  ☑ O2/Life Support\n☑ Navigation  ☑ Final Check"
	paper_body.add_theme_color_override("font_color", Color("#334155"))
	paper_vbox.add_child(paper_title)
	paper_vbox.add_child(paper_body)
	paper_card.add_child(paper_vbox)
	wall_hbox.add_child(paper_card)

	var poster_card = PanelContainer.new()
	poster_card.custom_minimum_size = Vector2(120, 90)
	var sb_post = StyleBoxFlat.new()
	sb_post.bg_color = Color("#020617"); sb_post.border_color = Color("#475569"); sb_post.set_border_width_all(1)
	poster_card.add_theme_stylebox_override("panel", sb_post)
	var poster_lbl = Label.new()
	poster_lbl.text = "\"A CLEAN PLANET\nIS A DEAD\nPLANET\""
	poster_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	poster_lbl.add_theme_color_override("font_color", Color("#94a3b8"))
	poster_card.add_child(poster_lbl)
	wall_hbox.add_child(poster_card)

	# Laptop Terminal Screen
	var laptop_panel = PanelContainer.new()
	laptop_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var sb_lap = StyleBoxFlat.new()
	sb_lap.bg_color = Color("#030712"); sb_lap.border_color = Color("#1e293b"); sb_lap.set_border_width_all(4); sb_lap.set_corner_radius_all(10)
	sb_lap.shadow_color = Color(0, 0, 0, 0.95); sb_lap.shadow_size = 15
	laptop_panel.add_theme_stylebox_override("panel", sb_lap)
	right_vbox.add_child(laptop_panel)

	var lap_margin = MarginContainer.new()
	lap_margin.add_theme_constant_override("margin_left", 12)
	lap_margin.add_theme_constant_override("margin_top", 12)
	lap_margin.add_theme_constant_override("margin_right", 12)
	lap_margin.add_theme_constant_override("margin_bottom", 12)
	laptop_panel.add_child(lap_margin)

	var lap_vbox = VBoxContainer.new()
	lap_margin.add_child(lap_vbox)

	var lap_hdr = Label.new()
	lap_hdr.text = "💻 LAUNCH_COMPOUND // CANDIDATE_RECORDS"
	lap_hdr.add_theme_color_override("font_color", Color("#38bdf8"))
	lap_vbox.add_child(lap_hdr)

	candidate_records_log = RichTextLabel.new()
	candidate_records_log.size_flags_vertical = Control.SIZE_EXPAND_FILL
	candidate_records_log.bbcode_enabled = true
	candidate_records_log.text = "[color=#38bdf8]> CANDIDATE_RECORDS[/color]\n"
	lap_vbox.add_child(candidate_records_log)

	var query_hbox = HBoxContainer.new()
	query_hbox.add_theme_constant_override("separation", 8)
	lap_vbox.add_child(query_hbox)

	var q1 = Button.new(); q1.text = "🎓 EDUCATION"; q1.pressed.connect(_on_query_edu_pressed); query_hbox.add_child(q1)
	var q2 = Button.new(); q2.text = "🔍 WATCHLIST"; q2.pressed.connect(_on_query_watch_pressed); query_hbox.add_child(q2)
	var q3 = Button.new(); q3.text = "🪙 FINANCIALS"; q3.pressed.connect(_on_query_fin_pressed); query_hbox.add_child(q3)

	# =============================================================
	# DIEGETIC FOREGROUND: DESK SURFACE, LEVERS & CHAIR BACKREST
	# =============================================================
	var foreground = Control.new()
	foreground.set_anchors_preset(Control.PRESET_FULL_RECT)
	foreground.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(foreground)

	var desk = ColorRect.new()
	desk.custom_minimum_size.y = 110
	desk.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	desk.color = Color("#090e15")
	foreground.add_child(desk)

	var desk_line = ColorRect.new()
	desk_line.custom_minimum_size.y = 3
	desk_line.set_anchors_preset(Control.PRESET_TOP_WIDE)
	desk_line.color = Color("#1e293b")
	desk.add_child(desk_line)

	var manuals_lbl = Label.new()
	manuals_lbl.position = Vector2(1160, 20)
	manuals_lbl.text = "📚 AEROSPACE SYSTEMS\n📚 SURVIVAL MANUAL"
	manuals_lbl.add_theme_color_override("font_color", Color("#475569"))
	desk.add_child(manuals_lbl)

	var levers_hbox = HBoxContainer.new()
	levers_hbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	levers_hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	levers_hbox.add_theme_constant_override("separation", 24)
	desk.add_child(levers_hbox)

	var accept_btn = Button.new()
	accept_btn.custom_minimum_size = Vector2(240, 52)
	accept_btn.text = "🟢 ACCEPT ENTRY (LEVER)"
	var sb_acc = StyleBoxFlat.new()
	sb_acc.bg_color = Color("#062e24"); sb_acc.border_color = Color("#10b981"); sb_acc.set_border_width_all(2); sb_acc.set_corner_radius_all(8)
	accept_btn.add_theme_stylebox_override("normal", sb_acc)
	accept_btn.add_theme_color_override("font_color", Color("#34d399"))
	accept_btn.pressed.connect(_on_accept_pressed)
	levers_hbox.add_child(accept_btn)

	var reject_btn = Button.new()
	reject_btn.custom_minimum_size = Vector2(240, 52)
	reject_btn.text = "🔴 REJECT ENTRY (LEVER)"
	var sb_rej = StyleBoxFlat.new()
	sb_rej.bg_color = Color("#311019"); sb_rej.border_color = Color("#f43f5e"); sb_rej.set_border_width_all(2); sb_rej.set_corner_radius_all(8)
	reject_btn.add_theme_stylebox_override("normal", sb_rej)
	reject_btn.add_theme_color_override("font_color", Color("#fb7185"))
	reject_btn.pressed.connect(_on_reject_pressed)
	levers_hbox.add_child(reject_btn)

	var chair_backrest = ColorRect.new()
	chair_backrest.custom_minimum_size = Vector2(400, 24)
	chair_backrest.position = Vector2(520, 880)
	chair_backrest.color = Color("#020407")
	var sb_chair = StyleBoxFlat.new()
	sb_chair.bg_color = Color("#0f172a"); sb_chair.border_color = Color("#334155"); sb_chair.set_border_width_all(2); sb_chair.set_corner_radius_all(12)
	foreground.add_child(chair_backrest)

func _on_candidate_changed(cand: CandidateData):
	if cand:
		if candidate_portrait:
			candidate_portrait.set_candidate(cand)
		if candidate_speech_label:
			candidate_speech_label.text = cand.quote
		if candidate_title_label:
			candidate_title_label.text = "🌧️ BOOTH WINDOW — " + cand.candidate_name.to_upper() + " (" + cand.role_title + ")"
			
		if candidate_sprite_3d and candidate_portrait and candidate_portrait.portrait_texture:
			candidate_sprite_3d.texture = candidate_portrait.portrait_texture
			
		if candidate_records_log:
			candidate_records_log.text = "[color=#38bdf8]> CANDIDATE_RECORDS[/color]\n\n"
			candidate_records_log.text += "[color=#f8fafc]NAME:[/color] " + cand.candidate_name + "\n"
			candidate_records_log.text += "[color=#f8fafc]CLAIMED ROLE:[/color] " + cand.role_title + " (" + cand.station + ")\n"
			candidate_records_log.text += "[color=#f8fafc]ORIGIN:[/color] " + cand.origin_city + "  |  [color=#f8fafc]AGE:[/color] " + str(cand.age) + "\n"
			candidate_records_log.text += "[color=#eab308]REF CODE:[/color] " + cand.candidate_id + "\n\n"
			candidate_records_log.text += "[color=#94a3b8]\"" + cand.quote + "\"[/color]"

func _on_seat_accepted(seats: int):
	print("Seat accepted: ", seats)

func _on_game_over(crew: Array):
	get_tree().change_scene_to_file("res://scenes/SpaceFlightSim.tscn")

func _on_accept_pressed():
	GameState.accept_candidate()

func _on_reject_pressed():
	GameState.reject_candidate()

func _on_query_edu_pressed():
	if GameState.current_candidate and candidate_records_log:
		candidate_records_log.text += "\n\n[color=#34d399]> EDUCATION QUERY:[/color] " + GameState.current_candidate.education_log

func _on_query_watch_pressed():
	if GameState.current_candidate and candidate_records_log:
		candidate_records_log.text += "\n\n[color=#fb7185]> WATCHLIST QUERY:[/color] " + GameState.current_candidate.watchlist_log

func _on_query_fin_pressed():
	if GameState.current_candidate and candidate_records_log:
		candidate_records_log.text += "\n\n[color=#38bdf8]> FINANCIAL QUERY:[/color] Clear. No offshore accounts."
