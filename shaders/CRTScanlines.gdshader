shader_type canvas_item;

uniform float scanline_count : hint_range(50.0, 400.0) = 150.0;
uniform float scanline_intensity : hint_range(0.0, 1.0) = 0.25;
uniform float vignette_intensity : hint_range(0.0, 1.0) = 0.4;
uniform vec4 phosphor_color : source_color = vec4(0.2, 0.9, 0.5, 1.0);

void fragment() {
	vec2 uv = UV;
	vec4 col = texture(TEXTURE, uv);
	
	// Scanlines pattern
	float scanline = sin(uv.y * scanline_count * 3.14159 * 2.0);
	scanline = (scanline + 1.0) * 0.5;
	scanline = pow(scanline, 1.5) * scanline_intensity;
	
	// Vignette effect
	vec2 center_uv = uv - vec2(0.5);
	float dist = length(center_uv);
	float vignette = smoothstep(0.7, 0.2, dist * vignette_intensity);
	
	col.rgb -= scanline;
	col.rgb *= vignette;
	
	COLOR = col;
}
