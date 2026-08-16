import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { forwardRef, useRef, useMemo, useLayoutEffect, MutableRefObject } from 'react';
import { Color, Mesh, ShaderMaterial } from 'three';
import vertexShader from "@/app/assets/shaders/silk.vert.glsl";
import fragmentShader from "@/app/assets/shaders/silk.frag.glsl";

const hexToNormalizedRGB = (hex: string): [number, number, number] => {
  if (hex.startsWith('var(')) return [0.72, 0.68, 0.76];
  hex = hex.replace('#', '');
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255
  ];
};

interface SilkPlaneProps {
  uniforms: {
    uSpeed: { value: number };
    uScale: { value: number };
    uNoiseIntensity: { value: number };
    uColor: { value: Color };
    uRotation: { value: number };
    uTime: { value: number };
  };
}

const SilkPlane = forwardRef<Mesh, SilkPlaneProps>(function SilkPlane({ uniforms }, ref) {
  const { viewport } = useThree();
  const localRef = useRef<Mesh>(null);

  useLayoutEffect(() => {
    if (localRef.current) {
      localRef.current.scale.set(viewport.width, viewport.height, 1);
    }
  }, [viewport]);

  useFrame((_, delta) => {
    if (localRef.current) {
      const material = localRef.current.material as ShaderMaterial;
      if (material && material.uniforms && material.uniforms.uTime) {
        material.uniforms.uTime.value += 0.1 * delta;
      }
    }
  });

  useLayoutEffect(() => {
    if (!ref) return;
    if (typeof ref === 'function') {
      ref(localRef.current);
    } else {
      (ref as MutableRefObject<Mesh | null>).current = localRef.current;
    }
  });

  return (
    <mesh ref={localRef}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} />
    </mesh>
  );
});
SilkPlane.displayName = 'SilkPlane';

interface SilkProps {
  speed?: number;
  scale?: number;
  color?: string;
  noiseIntensity?: number;
  rotation?: number;
}

const Silk = ({ speed = 5, scale = 1, color = '#7B7481', noiseIntensity = 1.5, rotation = 0 }: SilkProps) => {
  const meshRef = useRef<Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uSpeed: { value: speed },
      uScale: { value: scale },
      uNoiseIntensity: { value: noiseIntensity },
      uColor: { value: new Color(...hexToNormalizedRGB(color)) },
      uRotation: { value: rotation },
      uTime: { value: 0 }
    }),
    [speed, scale, noiseIntensity, color, rotation]
  );

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop="always"
      gl={{ alpha: false, antialias: false }}
      style={{ background: 'var(--silk-canvas-bg)' }}
    >
      <SilkPlane ref={meshRef} uniforms={uniforms} />
    </Canvas>
  );
};

export default Silk;
