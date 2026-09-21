@tool
extends SceneTree

func _init():
	print("Building 3D Security Booth scene using imported GLB assets...")

	var root = Node3D.new()
	root.name = "SecurityDesk3D"

	# 1. World Environment & Lighting
	var env_node = WorldEnvironment.new()
	env_node.name = "WorldEnvironment"
	var env = Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#030712") # Dark sci-fi atmospheric room
	env.ambient_light_color = Color("#1e293b")
	env.ambient_light_energy = 0.6
	env_node.environment = env
	root.add_child(env_node)

	# Warm Desk Spotlight (Lamp effect)
	var lamp_light = SpotLight3D.new()
	lamp_light.name = "DeskLampLight"
	lamp_light.position = Vector3(0.8, 1.4, -0.6)
	lamp_light.rotation_degrees = Vector3(-60, 45, 0)
	lamp_light.light_color = Color("#f59e0b") # Warm tungsten yellow-amber
	lamp_light.light_energy = 3.5
	lamp_light.spot_range = 5.0
	lamp_light.spot_angle = 45.0
	root.add_child(lamp_light)

	# Cool Blue Ambient Room Light
	var room_light = OmniLight3D.new()
	room_light.name = "AmbientRoomLight"
	room_light.position = Vector3(-1.2, 1.8, -1.0)
	room_light.light_color = Color("#0284c7") # Sci-fi blue fill
	room_light.light_energy = 1.2
	room_light.omni_range = 6.0
	root.add_child(room_light)

	# 2. Main 1st Person Camera (POV Anchor)
	var camera = Camera3D.new()
	camera.name = "POVCamera"
	camera.position = Vector3(0.0, 1.15, 0.4) # Eyeline height sitting in chair
	camera.rotation_degrees = Vector3(-12.0, 0.0, 0.0) # Looking slightly down at desk
	camera.fov = 68.0
	camera.current = true
	root.add_child(camera)

	# 3. Instantiate User's 3D Furniture Assets (.glb)

	# Main Work Desk (Table01.glb)
	if ResourceLoader.exists("res://Table01.glb"):
		var table_scene = load("res://Table01.glb")
		var table = table_scene.instantiate()
		table.name = "PlayerDesk"
		table.position = Vector3(0.0, 0.0, -0.7)
		table.scale = Vector3(1.2, 1.0, 1.0)
		root.add_child(table)

	# Candidate / Visitor Chair across the desk (Chair01.glb)
	if ResourceLoader.exists("res://Chair01.glb"):
		var chair_scene = load("res://Chair01.glb")
		var visitor_chair = chair_scene.instantiate()
		visitor_chair.name = "VisitorChair"
		visitor_chair.position = Vector3(-0.4, 0.0, -1.6)
		visitor_chair.rotation_degrees = Vector3(0, 180, 0)
		root.add_child(visitor_chair)

	# Candidate 3D Billboard Sprite sitting in Visitor Chair
	var cand_sprite = Sprite3D.new()
	cand_sprite.name = "CandidateSprite3D"
	cand_sprite.position = Vector3(-0.4, 0.85, -1.6)
	cand_sprite.pixel_size = 0.003
	cand_sprite.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	if ResourceLoader.exists("res://assets/sprites/cand_pilot.jpg"):
		cand_sprite.texture = load("res://assets/sprites/cand_pilot.jpg")
	root.add_child(cand_sprite)

	# Bookshelf behind the desk on the right (Bookshelf01.glb)
	if ResourceLoader.exists("res://Bookshelf01.glb"):
		var shelf_scene = load("res://Bookshelf01.glb")
		var shelf = shelf_scene.instantiate()
		shelf.name = "Bookshelf"
		shelf.position = Vector3(1.4, 0.0, -1.5)
		shelf.rotation_degrees = Vector3(0, -45, 0)
		root.add_child(shelf)

	# Potted Plant on desk corner (Plant01.glb)
	if ResourceLoader.exists("res://Plant01.glb"):
		var plant_scene = load("res://Plant01.glb")
		var plant = plant_scene.instantiate()
		plant.name = "DeskPlant"
		plant.position = Vector3(-0.9, 0.72, -0.8)
		plant.scale = Vector3(0.6, 0.6, 0.6)
		root.add_child(plant)

	# Books on desk (Books01.glb & Books02.glb)
	if ResourceLoader.exists("res://Books01.glb"):
		var books_scene = load("res://Books01.glb")
		var books = books_scene.instantiate()
		books.name = "DeskBooks"
		books.position = Vector3(0.85, 0.72, -0.6)
		books.rotation_degrees = Vector3(0, 15, 0)
		root.add_child(books)

	# Set ownership recursively so PackedScene packs all child nodes
	set_owner_recursive(root, root)

	# Save packed scene
	var packed = PackedScene.new()
	var err = packed.pack(root)
	if err == OK:
		var save_err = ResourceSaver.save(packed, "res://scenes/SecurityDesk3D.tscn")
		if save_err == OK:
			print("SUCCESS: 3D Security Booth scene saved successfully to res://scenes/SecurityDesk3D.tscn!")
		else:
			print("ERROR saving scene: ", save_err)
	else:
		print("ERROR packing scene: ", err)
	quit()

func set_owner_recursive(node: Node, owner_node: Node):
	for child in node.get_children():
		child.owner = owner_node
		set_owner_recursive(child, owner_node)
