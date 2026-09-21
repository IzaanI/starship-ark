@tool
extends SceneTree

func _init():
	print("Creating Godot 4 placeholder textures...")

	var dir = DirAccess.open("res://")
	if not dir.dir_exists("res://assets/sprites/placeholders"):
		dir.make_dir_recursive("res://assets/sprites/placeholders")

	# Helper to create colored PNG image
	create_png("res://assets/sprites/placeholders/avatar_placeholder.png", 180, 210, Color(0.06, 0.1, 0.15), Color(0.22, 0.74, 0.97))
	create_png("res://assets/sprites/placeholders/passport_cover.png", 160, 220, Color(0.06, 0.11, 0.17), Color(0.87, 0.69, 0.36))
	create_png("res://assets/sprites/placeholders/medical_report.png", 160, 220, Color(0.92, 0.91, 0.86), Color(0.86, 0.15, 0.15))
	create_png("res://assets/sprites/placeholders/background_check.png", 180, 230, Color(0.89, 0.88, 0.83), Color(0.09, 0.17, 0.25))
	create_png("res://assets/sprites/placeholders/xray_luggage.png", 280, 180, Color(0.02, 0.07, 0.1), Color(0.22, 0.74, 0.97))
	create_png("res://assets/sprites/placeholders/earth_skyline.png", 100, 60, Color(0.04, 0.07, 0.1), Color(0.94, 0.25, 0.25))

	print("Placeholder textures created successfully!")
	quit()

func create_png(path: String, width: int, height: int, bg_color: Color, border_color: Color):
	var img = Image.create(width, height, false, Image.FORMAT_RGBA8)
	img.fill(bg_color)

	# Draw 2px border
	for x in range(width):
		for y in range(height):
			if x < 3 or x >= width - 3 or y < 3 or y >= height - 3:
				img.set_pixel(x, y, border_color)

	img.save_png(path)
