"use client";

import { useMemo } from "react";
import * as THREE from "three";

const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 glowColor;
  uniform float intensity;
  uniform float power;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = 1.0 - dot(viewDir, vNormal);
    fresnel = pow(fresnel, power) * intensity;
    gl_FragColor = vec4(glowColor, fresnel);
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
  intensity = 1.5,
  power = 3.0,
  radius = 1.12,
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
        side={THREE.BackSide}
      />
    </mesh>
  );
}
