precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec2  uResolution;
uniform float uIsDark;
uniform float uPadding;
uniform float uEdgeFade;

varying vec2 vUv;

vec3 drawSiriBundle(float x, float y, float env, float freq, float speed, float maxAmp, vec3 colorStart, vec3 colorEnd) {
    vec3 colorOut = vec3(0.0);
    
    float colorMix = sin(x * 3.14159265);
    vec3 baseColor = mix(colorStart, colorEnd, colorMix);
    
    const int NUM_LINES = 30;
    for(int i = 0; i < NUM_LINES; i++) {
        float fi = float(i) / float(NUM_LINES - 1); 
        
        float amp = maxAmp * pow(fi, 1.2); 
        
        float phase = fi * 1.2; 
        
        float wave = sin(x * freq - uTime * speed + phase);
        wave += sin(x * freq * 1.5 - uTime * speed * 1.2 + phase * 1.5) * 0.35;
        
        wave = wave * amp * env; 
        
        float dist = abs(y - wave);
        
        float weight = mix(0.0002, 0.005, pow(fi, 5.0)); 
        
        float glow = weight / (dist + 0.002);
        glow = pow(glow, 1.3);
        
        colorOut += baseColor * glow;
    }
    
    return colorOut;
}

void main() {
    vec2 uv = vUv;
    float x = clamp((uv.x - uPadding) / max(1.0 - uPadding * 2.0, 0.0001), 0.0, 1.0);
    float y = (uv.y - 0.5) * 3.0; 

    float env = sin(x * 3.14159265);
    env = pow(env, 1.2); 

    float amp = 0.3 + uAmplitude * 1.5; 

    vec3 color = vec3(0.0);

    vec3 c1Start = vec3(0.0, 1.0, 0.9);
    vec3 c1End   = vec3(0.4, 0.1, 1.0); 
    color += drawSiriBundle(x, y, env, 2.2, 0.6, amp * 1.0, c1Start, c1End);

    vec3 c2Start = vec3(1.0, 0.0, 0.8);
    vec3 c2End   = vec3(0.1, 0.3, 1.0); 
    color += drawSiriBundle(x, y, env, 1.8, 0.8, amp * -1.2, c2Start, c2End);

    vec3 c3Start = vec3(0.1, 0.4, 1.0);
    vec3 c3End   = vec3(0.0, 1.0, 0.8); 
    color += drawSiriBundle(x, y, env, 2.5, 0.5, amp * 0.85, c3Start, c3End);

    vec3 finalColor;
    float finalAlpha;

    if (uIsDark > 0.5) {
        finalColor = 1.0 - exp(-color * 1.5);
        finalAlpha = max(finalColor.r, max(finalColor.g, finalColor.b));
        finalAlpha = smoothstep(0.02, 0.2, finalAlpha);
    } else {
        float maxChannel = max(color.r, max(color.g, color.b));
        vec3 pureColor = color / (maxChannel + 0.0001);
        finalColor = pureColor * 0.8;
        finalAlpha = maxChannel;
        finalAlpha = smoothstep(0.05, 0.5, finalAlpha) * 1.5;
    }

    float verticalEnvelope = smoothstep(1.2, 0.9, abs(y)); 
    float horizontalEnvelope = smoothstep(0.0, uEdgeFade, x) * smoothstep(0.0, uEdgeFade, 1.0 - x);
    finalAlpha *= verticalEnvelope * horizontalEnvelope;

    finalAlpha = clamp(finalAlpha, 0.0, 1.0);

    gl_FragColor = vec4(finalColor * finalAlpha, finalAlpha);
}
