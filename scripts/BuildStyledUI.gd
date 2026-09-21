@tool
extends SceneTree

func _init():
	print("Building fully styled Godot 4 UI theme and scene layout...")
	
	# Load base SecurityDesk scene
	var scene = load("res://scenes/SecurityDesk.tscn")
	if not scene:
		print("Error: Could not load res://scenes/SecurityDesk.tscn")
		quit()
		return
		
	var root = scene.instantiate()
	
	# Create StyleBoxes
	var sb_panel = StyleBoxFlat.new()
	sb_panel.bg_color = Color("#0b1219")
	sb_panel.border_color = Color("#172533")
	sb_panel.set_border_width_all(1)
	sb_panel.set_corner_radius_all(8)
	
	var sb_crt = StyleBoxFlat.new()
	sb_crt.bg_color = Color("#04090f")
	sb_crt.border_color = Color("#162736")
	sb_crt.set_border_width_all(2)
	sb_crt.set_corner_radius_all(6)
	
	var sb_accept = StyleBoxFlat.new()
	sb_accept.bg_color = Color("#0c272a")
	sb_accept.border_color = Color("#2dd4bf")
	sb_accept.set_border_width_all(1)
	sb_accept.set_corner_radius_all(6)
	
	var sb_reject = StyleBoxFlat.new()
	sb_reject.bg_color = Color("#1e1319")
	sb_reject.border_color = Color("#e11d48")
	sb_reject.set_border_width_all(1)
	sb_reject.set_corner_radius_all(6)

	var sb_btn = StyleBoxFlat.new()
	sb_btn.bg_color = Color("#0d1822")
	sb_btn.border_color = Color("#1d3347")
	sb_btn.set_border_width_all(1)
	sb_btn.set_corner_radius_all(4)

	# Apply styles to Zone panels
	var z1 = root.get_node_or_null("MainWorkbench/Zone1")
	var z2 = root.get_node_or_null("MainWorkbench/Zone2")
	var z3 = root.get_node_or_null("MainWorkbench/Zone3")
	var z4 = root.get_node_or_null("MainWorkbench/Zone4")
	
	if z1: z1.add_theme_stylebox_override("panel", sb_panel)
	if z2: z2.add_theme_stylebox_override("panel", sb_panel)
	if z3: z3.add_theme_stylebox_override("panel", sb_panel)
	if z4: z4.add_theme_stylebox_override("panel", sb_panel)
	
	var crt = root.get_node_or_null("MainWorkbench/Zone4/Margin/VBox/HBox/CRTScreen")
	if crt: crt.add_theme_stylebox_override("panel", sb_crt)
	
	var accept_btn = root.get_node_or_null("MainWorkbench/Zone4/Margin/VBox/DecisionBar/AcceptBtn")
	var reject_btn = root.get_node_or_null("MainWorkbench/Zone4/Margin/VBox/DecisionBar/RejectBtn")
	
	if accept_btn:
		accept_btn.add_theme_stylebox_override("normal", sb_accept)
		accept_btn.add_theme_stylebox_override("hover", sb_accept)
		accept_btn.add_theme_color_override("font_color", Color("#2dd4bf"))
		
	if reject_btn:
		reject_btn.add_theme_stylebox_override("normal", sb_reject)
		reject_btn.add_theme_stylebox_override("hover", sb_reject)
		reject_btn.add_theme_color_override("font_color", Color("#fb7185"))

	# Style Query Buttons
	var q_btns = ["BtnEdu", "BtnWatch", "BtnFin", "BtnTravel"]
	for bname in q_btns:
		var btn = root.get_node_or_null("MainWorkbench/Zone4/Margin/VBox/HBox/QueryButtons/" + bname)
		if btn:
			btn.add_theme_stylebox_override("normal", sb_btn)
			btn.add_theme_stylebox_override("hover", sb_btn)
			btn.add_theme_color_override("font_color", Color("#cbd5e1"))

	# Save packed scene
	var packed = PackedScene.new()
	packed.pack(root)
	ResourceSaver.save(packed, "res://scenes/SecurityDesk.tscn")
	
	print("SecurityDesk.tscn updated with full custom Godot 4 themes & styles!")
	quit()
