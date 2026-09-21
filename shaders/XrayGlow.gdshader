shader_type canvas_item;

uniform vec4 cyan_glow_color : source_color = vec4(0.22, 0.74, 0.97, 1.0);
uniform float pulse_speed : hint_range(0.5, 5.0) = 2.0;

void fragment() {
	vec2 uv = UV;
	vec4 col = texture(TEXTURE, uv);
	
	// Pulse glow effect
	float pulse = (sin(TIME * pulse_speed) + 1.0) * 0.15 + 0.85;
	
	// Edge border glow
	float edge_dist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
	float border_glow = smoothstep(0.1, 0.0, edge_dist) * 0.4;
	
	col.rgb += cyan_glow_color.rgb * (border_glow + 0.1) * pulse;
	COLOR = col;
}
