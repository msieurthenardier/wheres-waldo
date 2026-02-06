"use client";

import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { latLonToVector3 } from "@/lib/geo";
import type { EnrichedVesselPosition } from "@/lib/ais";
import { COMMODITIES } from "@/lib/commodity";

const DEFAULT_COLOR = new THREE.Color("#00fff2");

function getCommodityColor(commodity: string | null): THREE.Color {
  if (!commodity) return DEFAULT_COLOR;
  const info = COMMODITIES[commodity as keyof typeof COMMODITIES];
  if (!info) return DEFAULT_COLOR;
  return new THREE.Color(info.color);
}

interface VesselsProps {
  vessels: EnrichedVesselPosition[];
}

export default function Vessels({ vessels }: VesselsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = vessels.length;

  const colorArray = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const color = getCommodityColor(vessels[i].commodity);
      arr[i * 3] = color.r;
      arr[i * 3 + 1] = color.g;
      arr[i * 3 + 2] = color.b;
    }
    return arr;
  }, [vessels, count]);

  useEffect(() => {
    if (!meshRef.current) return;

    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3();
    const forward = new THREE.Vector3();

    vessels.forEach((vessel, i) => {
      const pos = latLonToVector3(vessel.lat, vessel.lon, 1.01);
      dummy.position.copy(pos);

      up.copy(pos).normalize();

      // Heading fallback: heading -> cog -> 0
      const headingDeg = !isNaN(vessel.heading)
        ? vessel.heading
        : !isNaN(vessel.cog)
          ? vessel.cog
          : 0;
      const headingRad = (headingDeg * Math.PI) / 180;

      forward.set(0, 1, 0);
      if (Math.abs(up.dot(forward)) > 0.99) {
        forward.set(1, 0, 0);
      }
      forward.cross(up).normalize();
      forward.applyAxisAngle(up, headingRad);

      const lookTarget = dummy.position.clone().add(forward);
      dummy.lookAt(lookTarget);
      dummy.rotateX(Math.PI / 2);

      // Scale by estimated value (larger vessels = bigger markers)
      const valueScale = vessel.estimatedValueUsd > 0
        ? Math.min(2.0, 0.8 + Math.log10(vessel.estimatedValueUsd) / 10)
        : 1.0;
      const base = 0.012 * valueScale;
      const height = 0.025 * valueScale;
      dummy.scale.set(base, height, base);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [vessels]);

  if (count === 0) return null;

  return (
    <instancedMesh key={count} ref={meshRef} args={[undefined, undefined, count]}>
      <coneGeometry args={[1, 2, 6]} />
      <meshStandardMaterial
        vertexColors
        emissive="#ffffff"
        emissiveIntensity={0.3}
      />
      <instancedBufferAttribute
        attach="geometry-attributes-color"
        args={[colorArray, 3]}
      />
    </instancedMesh>
  );
}
