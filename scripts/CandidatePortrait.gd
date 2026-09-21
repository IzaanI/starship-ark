class_name CandidatePortrait
extends Control

var candidate_data: CandidateData
var portrait_texture: Texture2D

# Styling fallback attributes
var skin_color: Color = Color("#e0ac69")
var hair_color: Color = Color("#2c1b18")
var outfit_color: Color = Color("#1e293b")
var eye_color: Color = Color("#38bdf8")
var hair_style: int = 0
var face_shape: int = 0
var has_glasses: bool = false
var has_cyber_eye: bool = false

func set_candidate(cand: CandidateData):
	candidate_data = cand
	portrait_texture = null
	if not cand:
		queue_redraw()
		return

	# Load asset texture based on role / identity
	var path = ""
	if cand.true_identity == "DOOMSDAY_SABOTEUR" and randf() < 0.4:
		path = "res://assets/sprites/cand_saboteur.jpg"
	elif cand.station == "Cockpit":
		path = "res://assets/sprites/cand_pilot.jpg"
	elif cand.station == "Medbay":
		path = "res://assets/sprites/cand_doctor.jpg"
	elif cand.station == "Reactor":
		path = "res://assets/sprites/cand_engineer.jpg"
	else:
		var opts = ["res://assets/sprites/cand_pilot.jpg", "res://assets/sprites/cand_doctor.jpg", "res://assets/sprites/cand_engineer.jpg"]
		path = opts[abs(cand.candidate_id.hash()) % opts.size()]

	if ResourceLoader.exists(path):
		portrait_texture = load(path)

	# Hash candidate ID for fallback feature randomization
	var seed_val = cand.candidate_id.hash() + cand.candidate_name.hash()
	var rng = RandomNumberGenerator.new()
	rng.seed = seed_val

	var skins = [
		Color("#fce0c6"), Color("#e0ac69"), Color("#c68642"), 
		Color("#8d5524"), Color("#523318"), Color("#d1a784")
	]
	skin_color = skins[rng.randi() % skins.size()]

	var hairs = [
		Color("#1c1917"), Color("#451a03"), Color("#78350f"), 
		Color("#ca8a04"), Color("#94a3b8"), Color("#0284c7")
	]
	hair_color = hairs[rng.randi() % hairs.size()]

	match cand.station:
		"Cockpit": outfit_color = Color("#1e3a8a")
		"Medbay": outfit_color = Color("#0f766e")
		"Reactor": outfit_color = Color("#b45309")
		"Hydroponics": outfit_color = Color("#15803d")
		"O2 Bay": outfit_color = Color("#0369a1")
		"Brig": outfit_color = Color("#334155")
		_: outfit_color = Color("#374151")

	hair_style = rng.randi() % 5
	face_shape = rng.randi() % 3
	has_glasses = rng.randf() < 0.25
	has_cyber_eye = rng.randf() < 0.15

	queue_redraw()

func _draw():
	var w = size.x
	var h = size.y
	if w <= 0 or h <= 0:
		return

	# If high quality texture asset is available, draw texture
	if portrait_texture:
		var rect = Rect2(0, 0, w, h)
		draw_texture_rect(portrait_texture, rect, false)
		return

	var center_x = w * 0.5
	var bottom_y = h

	# 1. Torso / Shoulders / Outfit
	var shoulder_width = w * 0.75
	var shoulder_top = h * 0.62
	var poly_shoulders = PackedVector2Array([
		Vector2(center_x - shoulder_width * 0.5, bottom_y),
		Vector2(center_x - shoulder_width * 0.42, shoulder_top + 20),
		Vector2(center_x - shoulder_width * 0.25, shoulder_top),
		Vector2(center_x + shoulder_width * 0.25, shoulder_top),
		Vector2(center_x + shoulder_width * 0.42, shoulder_top + 20),
		Vector2(center_x + shoulder_width * 0.5, bottom_y)
	])
	draw_polygon(poly_shoulders, PackedColorArray([outfit_color]))
	
	# Collar / V-neck detail
	var poly_collar = PackedVector2Array([
		Vector2(center_x - 18, shoulder_top),
		Vector2(center_x, shoulder_top + 35),
		Vector2(center_x + 18, shoulder_top)
	])
	draw_polygon(poly_collar, PackedColorArray([skin_color.darkened(0.2)]))
	
	# 2. Neck
	var neck_width = 36.0
	var neck_top = h * 0.50
	draw_rect(Rect2(center_x - neck_width * 0.5, neck_top, neck_width, shoulder_top - neck_top), skin_color.darkened(0.15))
	
	# 3. Head / Face Shape
	var head_center = Vector2(center_x, h * 0.38)
	var head_radius = Vector2(42, 52)
	
	_draw_custom_ellipse(head_center, head_radius, skin_color)

	# 4. Ears
	_draw_custom_ellipse(Vector2(head_center.x - head_radius.x - 3, head_center.y), Vector2(8, 12), skin_color.darkened(0.1))
	_draw_custom_ellipse(Vector2(head_center.x + head_radius.x + 3, head_center.y), Vector2(8, 12), skin_color.darkened(0.1))

	# 5. Eyes
	var eye_y = head_center.y - 4
	var eye_sep = 18.0
	
	# Left Eye
	_draw_custom_ellipse(Vector2(head_center.x - eye_sep, eye_y), Vector2(7, 5), Color.WHITE)
	if has_cyber_eye:
		draw_circle(Vector2(head_center.x - eye_sep, eye_y), 4.0, Color("#ef4444"))
		draw_circle(Vector2(head_center.x - eye_sep, eye_y), 2.0, Color.WHITE)
	else:
		draw_circle(Vector2(head_center.x - eye_sep, eye_y), 3.5, eye_color)
		draw_circle(Vector2(head_center.x - eye_sep, eye_y), 1.5, Color("#090d16"))
		
	# Right Eye
	_draw_custom_ellipse(Vector2(head_center.x + eye_sep, eye_y), Vector2(7, 5), Color.WHITE)
	draw_circle(Vector2(head_center.x + eye_sep, eye_y), 3.5, eye_color)
	draw_circle(Vector2(head_center.x + eye_sep, eye_y), 1.5, Color("#090d16"))
	
	# Eyebrows
	draw_line(Vector2(head_center.x - eye_sep - 8, eye_y - 9), Vector2(head_center.x - eye_sep + 7, eye_y - 9), hair_color.darkened(0.2), 3.0)
	draw_line(Vector2(head_center.x + eye_sep - 7, eye_y - 9), Vector2(head_center.x + eye_sep + 8, eye_y - 9), hair_color.darkened(0.2), 3.0)

	# Nose
	var nose_poly = PackedVector2Array([
		Vector2(head_center.x, eye_y + 4),
		Vector2(head_center.x - 3, eye_y + 16),
		Vector2(head_center.x + 3, eye_y + 16)
	])
	draw_polyline(nose_poly, skin_color.darkened(0.25), 2.0)

	# Mouth / Expression
	var mouth_y = head_center.y + 26
	draw_line(Vector2(head_center.x - 10, mouth_y), Vector2(head_center.x + 10, mouth_y), skin_color.darkened(0.35), 2.5)

	# 6. Hair Styles
	match hair_style:
		0:
			var hair_poly = PackedVector2Array([
				Vector2(head_center.x - head_radius.x - 4, head_center.y - 10),
				Vector2(head_center.x - head_radius.x, head_center.y - head_radius.y - 8),
				Vector2(head_center.x, head_center.y - head_radius.y - 14),
				Vector2(head_center.x + head_radius.x, head_center.y - head_radius.y - 8),
				Vector2(head_center.x + head_radius.x + 4, head_center.y - 10),
				Vector2(head_center.x + head_radius.x - 6, head_center.y - head_radius.y + 10),
				Vector2(head_center.x - head_radius.x + 6, head_center.y - head_radius.y + 10)
			])
			draw_polygon(hair_poly, PackedColorArray([hair_color]))
		1:
			var hair_poly = PackedVector2Array([
				Vector2(head_center.x - head_radius.x - 6, head_center.y + 20),
				Vector2(head_center.x - head_radius.x - 6, head_center.y - head_radius.y - 10),
				Vector2(head_center.x, head_center.y - head_radius.y - 16),
				Vector2(head_center.x + head_radius.x + 6, head_center.y - head_radius.y - 10),
				Vector2(head_center.x + head_radius.x + 6, head_center.y + 20),
				Vector2(head_center.x + head_radius.x - 2, head_center.y - head_radius.y + 12),
				Vector2(head_center.x - head_radius.x + 2, head_center.y - head_radius.y + 12)
			])
			draw_polygon(hair_poly, PackedColorArray([hair_color]))
		2:
			var hair_poly = PackedVector2Array([
				Vector2(head_center.x - head_radius.x, head_center.y - 15),
				Vector2(head_center.x - head_radius.x - 2, head_center.y - head_radius.y - 12),
				Vector2(head_center.x, head_center.y - head_radius.y - 18),
				Vector2(head_center.x + head_radius.x + 2, head_center.y - head_radius.y - 12),
				Vector2(head_center.x + head_radius.x, head_center.y - 15),
				Vector2(head_center.x, head_center.y - head_radius.y + 8)
			])
			draw_polygon(hair_poly, PackedColorArray([hair_color]))
		3:
			for i in range(7):
				var angle = lerpf(-1.2, 1.2, i / 6.0)
				var tip = head_center + Vector2(sin(angle), -cos(angle)) * (head_radius.y + 20)
				var base1 = head_center + Vector2(sin(angle - 0.2), -cos(angle - 0.2)) * (head_radius.y - 5)
				var base2 = head_center + Vector2(sin(angle + 0.2), -cos(angle + 0.2)) * (head_radius.y - 5)
				draw_polygon(PackedVector2Array([base1, tip, base2]), PackedColorArray([hair_color]))
		4:
			var cap_poly = PackedVector2Array([
				Vector2(head_center.x - head_radius.x - 8, head_center.y - 8),
				Vector2(head_center.x - head_radius.x - 4, head_center.y - head_radius.y - 12),
				Vector2(head_center.x, head_center.y - head_radius.y - 16),
				Vector2(head_center.x + head_radius.x + 4, head_center.y - head_radius.y - 12),
				Vector2(head_center.x + head_radius.x + 8, head_center.y - 8)
			])
			draw_polygon(cap_poly, PackedColorArray([outfit_color.darkened(0.3)]))
			draw_line(Vector2(head_center.x - head_radius.x - 12, head_center.y - 8), Vector2(head_center.x + head_radius.x + 12, head_center.y - 8), Color("#0f172a"), 5.0)

	if has_glasses:
		var glass_frame_col = Color("#cbd5e1")
		draw_rect(Rect2(head_center.x - eye_sep - 10, eye_y - 7, 20, 14), glass_frame_col, false, 2.0)
		draw_rect(Rect2(head_center.x + eye_sep - 10, eye_y - 7, 20, 14), glass_frame_col, false, 2.0)
		draw_line(Vector2(head_center.x - eye_sep + 10, eye_y), Vector2(head_center.x + eye_sep - 10, eye_y), glass_frame_col, 2.0)

func _draw_custom_ellipse(center: Vector2, radii: Vector2, color: Color):
	var points = PackedVector2Array()
	var num_points = 32
	for i in range(num_points):
		var angle = i * TAU / num_points
		points.append(center + Vector2(cos(angle) * radii.x, sin(angle) * radii.y))
	draw_polygon(points, PackedColorArray([color]))
