export type ToolParamType = 'number' | 'color' | 'boolean';

export interface ToolParameter {
    id: string;
    name: string;
    type: ToolParamType;
    min?: number;
    max?: number;
    step?: number;
    defaultValue: string | number | boolean;
}

export interface WebGLToolConfig {
    id: string;
    name: string;
    description: string;
    thumbnail?: string;
    fragmentShader: string;
    parameters: ToolParameter[];
}

export const WEBGL_TOOLS: WebGLToolConfig[] = [
    {
        id: 'deep-sea-flow',
        name: 'Deep Sea Flow',
        description: 'A mesmerizing fluid simulation with deep navy and orange gradients.',
        fragmentShader: `
uniform float iTime;
uniform vec2 iResolution;
uniform float waveIntensity;
uniform float flowSpeed;

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = 1.0 * fragCoord/iResolution.xy;
    
    for (int n = 1; n < 20; n++) {
        float i = float(n);
        uv += vec2(1.0 / i * sin(i * uv.y + iTime * flowSpeed * i ) + 0.8, 1.0 / i * sin(uv.x + iTime * flowSpeed * i) + 1.6);
    }
    
    float gradientValue = cos((uv.x + uv.y) * waveIntensity) * 0.5 + 0.5;
    
    vec3 deepNavy = vec3(0.05, 0.08, 0.15);
    vec3 darkBlue = vec3(0.1, 0.2, 0.35);
    vec3 mediumBlue = vec3(0.1, 0.3, 0.65);
    vec3 richBlue = vec3(0.24, 0.35, 0.67);
    vec3 tealBlue = vec3(0.47, 0.36, 0.66);
    vec3 deepOrange = vec3(0.8, 0.3, 0.2);
    vec3 brightOrange = vec3(0.98, 0.36, 0.29);
    vec3 warmYellow = vec3(1.0, 0.56, 0.28);
    
    vec3 color;
    if (gradientValue < 0.15) {
      color = mix(deepNavy, darkBlue, gradientValue * 6.667);
    } else if (gradientValue < 0.35) {
      color = mix(darkBlue, mediumBlue, (gradientValue - 0.15) * 5.0);
    } else if (gradientValue < 0.55) {
      color = mix(mediumBlue, richBlue, (gradientValue - 0.35) * 5.0);
    } else if (gradientValue < 0.7) {
      color = mix(richBlue, tealBlue, (gradientValue - 0.55) * 6.667);
    } else if (gradientValue < 0.82) {
      color = mix(tealBlue, deepOrange, (gradientValue - 0.7) * 8.333);
    } else if (gradientValue < 0.92) {
      color = mix(deepOrange, brightOrange, (gradientValue - 0.82) * 10.0);
    } else {
      color = mix(brightOrange, warmYellow, (gradientValue - 0.92) * 12.5);
    }
    
    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
    `,
        parameters: [
            {
                id: 'flowSpeed',
                name: 'Flow Speed',
                type: 'number',
                min: 0.01,
                max: 0.5,
                step: 0.01,
                defaultValue: 0.1
            },
            {
                id: 'waveIntensity',
                name: 'Wave Intensity',
                type: 'number',
                min: 0.1,
                max: 5.0,
                step: 0.1,
                defaultValue: 1.0
            }
        ]
    }
];
