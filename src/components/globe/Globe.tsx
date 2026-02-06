"use client";

import { useTexture } from "@react-three/drei";
import { Suspense, useCallback } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { useFilters } from "@/stores/filters";

function GlobeMesh() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const texture = useTexture(`${basePath}/textures/earth_daymap_8k.jpg`);
  const { selectItem } = useFilters();

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      // Only deselect if this click wasn't already handled by a vessel/port
      // (those call e.stopPropagation())
      selectItem(null, null);
    },
    [selectItem]
  );

  return (
    <mesh onClick={handleClick}>
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
