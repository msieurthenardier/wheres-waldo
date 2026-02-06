"use client";

import { useMemo } from "react";
import * as THREE from "three";

const atmosphereVertexShader = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 glowColor;
  uniform float intensity;
  uniform float power;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float rim = 1.0 - max(0.0, dot(viewDir, vWorldNormal));
    float edgeGlow = pow(rim, power) * intensity;
    float innerGlow = pow(rim, 2.0) * intensity * 0.3;
    float glow = edgeGlow + innerGlow;
    gl_FragColor = vec4(glowColor * glow, glow);
  }
`;

interface AtmosphereProps {
  color?: string;
  intensity?: number;
  power?: number;
  radius?: number;
}

export default function Atmosphere({
  color = "#4da6ff",
  intensity = 0.35,
  power = 6.0,
  radius = 1.005,
}: AtmosphereProps) {
  const uniforms = useMemo(
    () => ({
      glowColor: { value: new THREE.Color(color) },
      intensity: { value: intensity },
      power: { value: power },
    }),
    [color, intensity, power]
  );

  return (
    <mesh scale={[radius, radius, radius]}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        vertexShader={atmosphereVertexShader}
        fragmentShader={atmosphereFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}
