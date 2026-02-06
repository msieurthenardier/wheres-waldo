"use client";

import { useTexture } from "@react-three/drei";
import { Suspense } from "react";

function GlobeMesh() {
  const texture = useTexture("/textures/earth_nightmap_8k.jpg");

  return (
    <mesh>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        map={texture}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

function GlobeFallback() {
  return (
    <mesh>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial color="#0a1628" roughness={1} metalness={0} />
    </mesh>
  );
}

export default function Globe() {
  return (
    <Suspense fallback={<GlobeFallback />}>
      <GlobeMesh />
    </Suspense>
  );
}
