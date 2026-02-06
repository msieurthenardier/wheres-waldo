"use client";

import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { latLonToVector3 } from "@/lib/geo";
import { TEST_VESSELS } from "@/data/test-markers";

const VESSEL_COLORS: Record<string, string> = {
  container: "#00fff2",
  bulk: "#f59e0b",
  tanker: "#ef4444",
};

export default function Vessels() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = TEST_VESSELS.length;

  const colorArray = useMemo(() => {
    const arr = new Float32Array(count * 3);
    TEST_VESSELS.forEach((v, i) => {
      const color = new THREE.Color(VESSEL_COLORS[v.type] || "#00fff2");
      arr[i * 3] = color.r;
      arr[i * 3 + 1] = color.g;
      arr[i * 3 + 2] = color.b;
    });
    return arr;
  }, [count]);

  useEffect(() => {
    if (!meshRef.current) return;

    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const quat = new THREE.Quaternion();

    TEST_VESSELS.forEach((vessel, i) => {
      // Position slightly above globe surface
      const pos = latLonToVector3(vessel.lat, vessel.lon, 1.01);
      dummy.position.copy(pos);

      // Orient tangent to globe surface
      up.copy(pos).normalize();
      // Heading: rotate around surface normal
      const headingRad = (vessel.heading * Math.PI) / 180;
      // Create a tangent vector (arbitrary but consistent)
      forward.set(0, 1, 0);
      if (Math.abs(up.dot(forward)) > 0.99) {
        forward.set(1, 0, 0);
      }
      forward.cross(up).normalize();
      // Rotate forward by heading around up
      forward.applyAxisAngle(up, headingRad);

      // Look in forward direction, with up as the "up"
      const lookTarget = dummy.position.clone().add(forward);
      dummy.lookAt(lookTarget);
      // Rotate so cone tip points forward (cone default points +Y)
      dummy.rotateX(Math.PI / 2);

      dummy.scale.set(0.012, 0.025, 0.012);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
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
