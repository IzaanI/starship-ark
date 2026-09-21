extends Control

# Phase 2: Starship Ark Deep Spaceflight Simulator
# Real-time station management, hazard detection & airlock ejection mechanism.

var distance_au: float = 0.0
var goal_au: float = 100.0

# Resource levels (0-100%)
var hull_integrity: float = 100.0
var o2_level: float = 100.0
var food_level: float = 100.0
var reactor_level: float = 100.0

var is_flight_active: bool = true

# UI References
var distance_lbl: Label
var o2_bar: ProgressBar
var food_bar: ProgressBar
var reactor_bar: ProgressBar
var hull_bar: ProgressBar
var log_text: RichTextLabel
var crew_container: VBoxContainer

func _ready():
	_build_spaceflight_ui()
	_populate_crew_stations()

func _process(delta):
	if not is_flight_active:
		return

	# Flight progress
	distance_au += delta * 1.5
	if distance_lbl:
		distance_lbl.text = "🌌 DISTANCE TO PROXIMA CENTAURI: " + str(snapped(distance_au, 0.1)) + " / 100.0 AU"

	# Resource drain tick
	o2_level -= delta * 0.4
	food_level -= delta * 0.3
	reactor_level -= delta * 0.2

	# Hazard effect from flawed crew
	for cand in GameState.accepted_crew:
		if cand.true_identity == "DOOMSDAY_SABOTEUR":
			reactor_level -= delta * 1.2 # Rapid sabotage
			hull_integrity -= delta * 0.4
		elif cand.true_identity == "CONTAGIOUS_CARRIER":
			o2_level -= delta * 1.0 # Spore contamination
		elif cand.true_identity == "RESOURCE_HOARDER":
			food_level -= delta * 1.2 # Secretly eating food

	# Update progress bars
	if o2_bar: o2_bar.value = o2_level
	if food_bar: food_bar.value = food_level
	if reactor_bar: reactor_bar.value = reactor_level
	if hull_bar: hull_bar.value = hull_integrity

	# Check Game Over / Victory
	if o2_level <= 0 or reactor_level <= 0 or hull_integrity <= 0:
		is_flight_active = false
		_show_flight_result(false, "MISSION CRITICAL FAILURE: Ship systems depleted in deep space!")
	elif distance_au >= goal_au:
		is_flight_active = false
		_show_flight_result(true, "MISSION SUCCESS! Starship Ark safely reached New Earth with remaining crew!")

func _build_spaceflight_ui():
	# Background Space Dark
	var bg = ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color("#02040a")
	add_child(bg)

	var main_vbox = VBoxContainer.new()
	main_vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	main_vbox.add_theme_constant_override("separation", 12)
	add_child(main_vbox)

	# Top Bar: Flight Vector & Telemetry
	var top_panel = PanelContainer.new()
	var sb_top = StyleBoxFlat.new()
	sb_top.bg_color = Color("#090e17"); sb_top.border_color = Color("#1e293b"); sb_top.set_border_width_all(2)
	top_panel.add_theme_stylebox_override("panel", sb_top)
	main_vbox.add_child(top_panel)

	var top_margin = MarginContainer.new()
	top_margin.add_theme_constant_override("margin_left", 16)
	top_margin.add_theme_constant_override("margin_top", 12)
	top_margin.add_theme_constant_override("margin_right", 16)
	top_margin.add_theme_constant_override("margin_bottom", 12)
	top_panel.add_child(top_margin)

	var top_hbox = HBoxContainer.new()
	top_margin.add_child(top_hbox)

	distance_lbl = Label.new()
	distance_lbl.text = "🌌 DISTANCE TO PROXIMA CENTAURI: 0.0 / 100.0 AU"
	distance_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	distance_lbl.add_theme_color_override("font_color", Color("#38bdf8"))
	top_hbox.add_child(distance_lbl)

	# Middle Content: Left Starship Stations Cross-Section + Right Crew Manifest & Airlock Controls
	var mid_hbox = HBoxContainer.new()
	mid_hbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	mid_hbox.add_theme_constant_override("separation", 16)
	main_vbox.add_child(mid_hbox)

	# Left: Station Gauges & Telemetry
	var station_panel = PanelContainer.new()
	station_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var sb_st = StyleBoxFlat.new()
	sb_st.bg_color = Color("#070a12"); sb_st.border_color = Color("#1e293b"); sb_st.set_border_width_all(2)
	station_panel.add_theme_stylebox_override("panel", sb_st)
	mid_hbox.add_child(station_panel)

	var st_margin = MarginContainer.new()
	st_margin.add_theme_constant_override("margin_left", 16)
	st_margin.add_theme_constant_override("margin_top", 16)
	st_margin.add_theme_constant_override("margin_right", 16)
	st_margin.add_theme_constant_override("margin_bottom", 16)
	station_panel.add_child(st_margin)

	var st_vbox = VBoxContainer.new()
	st_vbox.add_theme_constant_override("separation", 16)
	st_margin.add_child(st_vbox)

	var st_title = Label.new()
	st_title.text = "🚀 STARSHIP ARK — STATION INTEGRITY & LIFE SUPPORT"
	st_title.add_theme_color_override("font_color", Color("#f8fafc"))
	st_vbox.add_child(st_title)

	# O2 Bar
	st_vbox.add_child(_create_gauge_row("💨 O2 LIFE SUPPORT", Color("#0284c7")))
	o2_bar = st_vbox.get_child(st_vbox.get_child_count() - 1).get_node("ProgressBar")

	# Food Bar
	st_vbox.add_child(_create_gauge_row("🌱 HYDROPONICS FOOD", Color("#16a34a")))
	food_bar = st_vbox.get_child(st_vbox.get_child_count() - 1).get_node("ProgressBar")

	# Reactor Bar
	st_vbox.add_child(_create_gauge_row("⚡ REACTOR CORE POWER", Color("#d97706")))
	reactor_bar = st_vbox.get_child(st_vbox.get_child_count() - 1).get_node("ProgressBar")

	# Hull Bar
	st_vbox.add_child(_create_gauge_row("🛡️ HULL INTEGRITY", Color("#e11d48")))
	hull_bar = st_vbox.get_child(st_vbox.get_child_count() - 1).get_node("ProgressBar")

	log_text = RichTextLabel.new()
	log_text.size_flags_vertical = Control.SIZE_EXPAND_FILL
	log_text.bbcode_enabled = true
	log_text.text = "[color=#38bdf8]> FLIGHT_LOG:[/color] Starship Ark departed Earth orbit. Course locked to Proxima Centauri.\n"
	st_vbox.add_child(log_text)

	# Right: Crew Manifest & Airlock Ejection Station
	var crew_panel = PanelContainer.new()
	crew_panel.custom_minimum_size.x = 480
	var sb_cr = StyleBoxFlat.new()
	sb_cr.bg_color = Color("#070a12"); sb_cr.border_color = Color("#1e293b"); sb_cr.set_border_width_all(2)
	crew_panel.add_theme_stylebox_override("panel", sb_cr)
	mid_hbox.add_child(crew_panel)

	var cr_margin = MarginContainer.new()
	cr_margin.add_theme_constant_override("margin_left", 16)
	cr_margin.add_theme_constant_override("margin_top", 16)
	cr_margin.add_theme_constant_override("margin_right", 16)
	cr_margin.add_theme_constant_override("margin_bottom", 16)
	crew_panel.add_child(cr_margin)

	var cr_vbox = VBoxContainer.new()
	cr_vbox.add_theme_constant_override("separation", 12)
	cr_margin.add_child(cr_vbox)

	var cr_title = Label.new()
	cr_title.text = "👥 ONBOARD CREW & AIRLOCK CONTROL"
	cr_title.add_theme_color_override("font_color", Color("#fb7185"))
	cr_vbox.add_child(cr_title)

	var scroll = ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	cr_vbox.add_child(scroll)

	crew_container = VBoxContainer.new()
	crew_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	crew_container.add_theme_constant_override("separation", 8)
	scroll.add_child(crew_container)

func _create_gauge_row(label_text: String, bar_color: Color) -> HBoxContainer:
	var hbox = HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 12)

	var lbl = Label.new()
	lbl.text = label_text
	lbl.custom_minimum_size.x = 180
	lbl.add_theme_color_override("font_color", Color("#cbd5e1"))
	hbox.add_child(lbl)

	var pb = ProgressBar.new()
	pb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	pb.custom_minimum_size.y = 24
	pb.value = 100
	pb.show_percentage = true
	var sb_fill = StyleBoxFlat.new()
	sb_fill.bg_color = bar_color
	pb.add_theme_stylebox_override("fill", sb_fill)
	hbox.add_child(pb)

	return hbox

func _populate_crew_stations():
	for child in crew_container.get_children():
		child.queue_free()

	for cand in GameState.accepted_crew:
		var card = PanelContainer.new()
		card.custom_minimum_size.y = 54
		var sb_card = StyleBoxFlat.new()
		sb_card.bg_color = Color("#0f172a"); sb_card.border_color = Color("#334155"); sb_card.set_border_width_all(1); sb_card.set_corner_radius_all(6)
		card.add_theme_stylebox_override("panel", sb_card)

		var card_margin = MarginContainer.new()
		card_margin.add_theme_constant_override("margin_left", 8)
		card_margin.add_theme_constant_override("margin_right", 8)
		card.add_child(card_margin)

		var card_hbox = HBoxContainer.new()
		card_hbox.add_theme_constant_override("separation", 12)
		card_margin.add_child(card_hbox)

		var info_lbl = Label.new()
		info_lbl.text = cand.candidate_name + "\n" + cand.role_title + " (" + cand.station + ")"
		info_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		info_lbl.add_theme_color_override("font_color", Color("#f8fafc"))
		card_hbox.add_child(info_lbl)

		var eject_btn = Button.new()
		eject_btn.text = "🚨 AIRLOCK EJECT"
		var sb_eject = StyleBoxFlat.new()
		sb_eject.bg_color = Color("#450a0a"); sb_eject.border_color = Color("#dc2626"); sb_eject.set_border_width_all(1)
		eject_btn.add_theme_stylebox_override("normal", sb_eject)
		eject_btn.add_theme_color_override("font_color", Color("#fca5a5"))
		eject_btn.pressed.connect(func(): _eject_crew_member(cand))
		card_hbox.add_child(eject_btn)

		crew_container.add_child(card)

func _eject_crew_member(cand: CandidateData):
	GameState.accepted_crew.erase(cand)
	if log_text:
		log_text.text += "\n[color=#ef4444]🚨 AIRLOCK EJECTED:[/color] " + cand.candidate_name + " was jettisoned into space!"
		if cand.true_identity == "DOOMSDAY_SABOTEUR":
			log_text.text += " [color=#34d399](CONFIRMED SABOTEUR ELIMINATED!)[/color]"
		elif cand.true_identity == "CONTAGIOUS_CARRIER":
			log_text.text += " [color=#34d399](BIOHAZARD CONTAINED!)[/color]"
			
	_populate_crew_stations()

func _show_flight_result(success: bool, message: String):
	if success:
		OS.alert("🎉 " + message)
	else:
		OS.alert("💀 " + message)
