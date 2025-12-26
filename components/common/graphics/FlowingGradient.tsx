import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type FlowingGradientProps = {
  className?: string;
  style?: React.CSSProperties;
  colors: string[];
  speed?: number;
  noise?: number;
  frequency?: number;
  opacity?: number;
};

const MAX_COLORS = 5;

const vert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const frag = `
uniform float uTime;
uniform vec3 uColors[${MAX_COLORS}];
uniform float uSpeed;
uniform float uFrequency;
uniform float uNoise;
uniform float uOpacity;
varying vec2 vUv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = vUv;
    
    // Start with the first color
    vec3 color = uColors[0];
    
    // Mix in subsequent colors using sine waves of increasing frequency
    // This creates the "stacking sine waves" effect described by Alex Harri
    for (int i = 1; i < ${MAX_COLORS}; i++) {
        // Calculate a wave based on position, time, and index
        // Using float(i) to vary the frequency and phase for each color layer
        float waveFreq = uFrequency * (1.0 + float(i) * 0.5);
        float wavePhase = uTime * uSpeed * (1.0 + float(i) * 0.2) + float(i) * 2.0;
        
        float sineValue = sin(uv.x * waveFreq + wavePhase);
        
        // Normalize sine from [-1, 1] to [0, 1]
        float t = (sineValue + 1.0) * 0.5;
        
        // Use smoothstep for softer transitions
        t = smoothstep(0.0, 1.0, t);
        
        // Mix the current color with the new color
        // We use a lower mix factor to blend them nicely without completely overriding
        color = mix(color, uColors[i], t * 0.6); 
    }

    // Add noise/grain
    if (uNoise > 0.0) {
        float noiseVal = (random(uv + uTime * 0.1) - 0.5) * uNoise;
        color += noiseVal;
    }

    gl_FragColor = vec4(color, uOpacity);
}
`;

export default function FlowingGradient({
  className,
  style,
  colors,
  speed = 0.05,
  noise = 0.03,
  frequency = 2.0,
  opacity = 1.0
}: FlowingGradientProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    const container = containerRef.current!;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const geometry = new THREE.PlaneGeometry(2, 2);
    
    // Convert hex colors to THREE.Vector3 (r, g, b)
    const colorVectors = colors.slice(0, MAX_COLORS).map(c => {
      const color = new THREE.Color(c);
      return new THREE.Vector3(color.r, color.g, color.b);
    });
    
    // Pad with the last color if fewer than MAX_COLORS provided
    while (colorVectors.length < MAX_COLORS) {
      colorVectors.push(colorVectors[colorVectors.length - 1]);
    }

    const material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uTime: { value: 0 },
        uColors: { value: colorVectors },
        uSpeed: { value: speed },
        uFrequency: { value: frequency },
        uNoise: { value: noise },
        uOpacity: { value: opacity }
      },
      transparent: true
    });
    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance'
    });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const clock = new THREE.Clock();
    let animationId: number;

    const animate = () => {
      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      }
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (container && renderer) {
        renderer.setSize(container.clientWidth, container.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [colors, speed, noise, frequency, opacity]); // Re-init on prop change for simplicity

  return <div ref={containerRef} className={className} style={style} />;
}
