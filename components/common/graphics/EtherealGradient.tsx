import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { shaderMaterial, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// --- Shader Material Definition ---

const MeshGradientMaterial = shaderMaterial(
  {
    uTime: 0,
    uFrequency: new THREE.Vector2(3, 6),
    uAmount: 0.2,
    uSpeed: 0.02,
    uColor: [
      new THREE.Color(),
      new THREE.Color(),
      new THREE.Color(),
      new THREE.Color(),
      new THREE.Color()
    ],
  },
  // Vertex Shader
  `
    precision highp float;

    uniform vec2 uFrequency;
    uniform float uTime;
    uniform float uAmount;
    uniform float uSpeed;
    uniform vec3 uColor[5];

    varying vec2 vUv;
    varying vec3 vColor;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) { 
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 =   v - i + dot(i, C.xxx) ;

      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;

      i = mod289(i); 
      vec4 p = permute( permute( permute( 
                 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
               + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

      float n_ = 0.142857142857; 
      vec3  ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );    

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );

      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
      vec3 pos = position;
      vec2 noiseCoord = uv * uFrequency;
      
      // 动画位移
      float displacement = snoise(vec3(noiseCoord.x + uTime * 0.02, noiseCoord.y, uTime * uSpeed));
      pos.z += displacement * uAmount;

      // 颜色混合逻辑 - 基于多层噪声的色彩层叠
      vColor = uColor[4]; // 底色
      for(int i = 0; i < 4; i++){
          float noiseFlow = 0.0002 + float(i) * 0.045;
          float noiseSpeed = 0.0001 + float(i) * 0.035;
          float noiseSeed = float(i) * 15.34;
          
          vec2 noiseFreq = vec2(0.4, 0.8);
          float noiseFloor = 0.08;
          float noiseCeiling = 0.62 + float(i) * 0.07;

          float n = smoothstep(noiseFloor, noiseCeiling, snoise(vec3(noiseCoord * noiseFreq + vec2(uTime * noiseFlow), uTime * noiseSpeed + noiseSeed)));
          vColor = mix(vColor, uColor[i], n);
      }

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      vUv = uv;
    }
  `,
  // Fragment Shader
  `
    precision highp float;
    varying vec3 vColor;

    void main(){
        gl_FragColor = vec4(vColor, 1.0);
    }
  `
);

extend({ MeshGradientMaterial });

// --- Component Definition ---

interface EtherealGradientProps {
  className?: string;
  style?: React.CSSProperties;
  colors: string[];
  wireframe?: boolean;
  density?: number;
  amplitude?: number;
  speed?: number;
  frequency?: number;
  scaleX?: number;
  scaleY?: number;
  enableOrbit?: boolean;
  paused?: boolean;
  camPosX?: number;
  camPosY?: number;
  camPosZ?: number;
  targetX?: number;
  targetY?: number;
  targetZ?: number;
  onChange?: (id: string, value: number | string | boolean) => void;
}

const WaveMesh: React.FC<EtherealGradientProps> = ({
  colors: inputColors,
  wireframe = false,
  density = 64,
  amplitude = 0.2,
  speed = 0.02,
  frequency = 3.0,
  scaleX = 1.0,
  scaleY = 1.0,
  paused = false
}) => {
  const materialRef = useRef<any>(null);

  // Convert sRGB hex to Linear for higher fidelity color mixing in the shader
  const colors = useMemo(() =>
    inputColors.slice(0, 5).map(c => new THREE.Color(c).convertSRGBToLinear()),
    [inputColors]
  );

  // Pad colors if less than 5
  while (colors.length < 5) {
    colors.push(new THREE.Color(0x000000));
  }

  useFrame((state) => {
    if (materialRef.current) {
      if (!paused) {
        materialRef.current.uTime = state.clock.getElapsedTime();
      }
      materialRef.current.uAmount = amplitude;
      materialRef.current.uSpeed = speed;
      // Adaptive frequency mapping
      materialRef.current.uFrequency.set(frequency, frequency * 2.0);
      materialRef.current.uColor = colors;
    }
  });

  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(5 * scaleX, 5 * scaleY, density, density);
  }, [density, scaleX, scaleY]);

  return (
    <mesh rotation={[-Math.PI / 2.2, 0, 0]} geometry={geometry}>
      {/* @ts-ignore - MeshGradientMaterial is extended via @react-three/fiber */}
      <meshGradientMaterial
        ref={materialRef}
        wireframe={wireframe}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default function EtherealGradient({
  className,
  style,
  colors,
  wireframe = false,
  density = 64,
  amplitude = 0.2,
  speed = 0.02,
  frequency = 3.0,
  scaleX = 1.0,
  scaleY = 1.0,
  enableOrbit = false,
  paused = false,
  camPosX = 0,
  camPosY = 1.0,
  camPosZ = 1.8,
  targetX = 0,
  targetY = 0,
  targetZ = 0,
  onChange
}: EtherealGradientProps) {
  const controlsRef = useRef<any>(null);

  const handleOrbitChange = () => {
    if (!controlsRef.current || !onChange) return;
    const { object, target } = controlsRef.current;

    // We only update if significant change to avoid feedback loops? 
    // Actually framer-motion/react state handles this fine.
    onChange('camPosX', object.position.x);
    onChange('camPosY', object.position.y);
    onChange('camPosZ', object.position.z);
    onChange('targetX', target.x);
    onChange('targetY', target.y);
    onChange('targetZ', target.z);
  };

  return (
    <div className={className} style={style}>
      <Canvas
        camera={{ position: [camPosX, camPosY, camPosZ], fov: 35 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          stencil: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
          outputColorSpace: THREE.SRGBColorSpace
        }}
      >
        {enableOrbit && (
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.05}
            target={[targetX, targetY, targetZ]}
            onEnd={handleOrbitChange}
          />
        )}
        <WaveMesh
          colors={colors}
          wireframe={wireframe}
          density={density}
          amplitude={amplitude}
          speed={speed}
          frequency={frequency}
          scaleX={scaleX}
          scaleY={scaleY}
          paused={paused}
        />
      </Canvas>
    </div>
  );
}
