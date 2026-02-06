"use client";

import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { latLonToVector3 } from "@/lib/geo";
import type { VesselPosition } from "@/lib/ais";

interface VesselsProps {
  vessels: VesselPosition[];
}

export default function Vessels({ vessels }: VesselsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = vessels.length;

  const colorArray = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const defaultColor = new THREE.Color("#00fff2");
    for (let i = 0; i < count; i++) {
      arr[i * 3] = defaultColor.r;
      arr[i * 3 + 1] = defaultColor.g;
      arr[i * 3 + 2] = defaultColor.b;
    }
    return arr;
  }, [count]);

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

      dummy.scale.set(0.012, 0.025, 0.012);
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
        emissive="#00fff2"
        emissiveIntensity={0.5}
      />
      <instancedBufferAttribute
        attach="geometry-attributes-color"
        args={[colorArray, 3]}
      />
    </instancedMesh>
  );
}
