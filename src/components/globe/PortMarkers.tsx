"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVector3 } from "@/lib/geo";
import { TEST_PORTS } from "@/data/test-markers";

export default function PortMarkers() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const count = TEST_PORTS.length;

  // Pulse animation
  useFrame(({ clock }) => {
    if (materialRef.current) {
      const pulse = 1.0 + 0.3 * Math.sin(clock.elapsedTime * 2);
      materialRef.current.emissiveIntensity = pulse;
    }
  });

  const colorArray = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const color = new THREE.Color("#00fff2");
    for (let i = 0; i < count; i++) {
      arr[i * 3] = color.r;
      arr[i * 3 + 1] = color.g;
      arr[i * 3 + 2] = color.b;
    }
    return arr;
  }, [count]);

  useEffect(() => {
    if (!meshRef.current) return;

    const dummy = new THREE.Object3D();

    TEST_PORTS.forEach((port, i) => {
      const pos = latLonToVector3(port.lat, port.lon, 1.005);
      dummy.position.copy(pos);
      // Scale based on port value
      const scale = 0.008 + port.value * 0.012;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#00fff2"
        emissive="#00fff2"
        emissiveIntensity={1.2}
        toneMapped={false}
      />
      <instancedBufferAttribute
        attach="geometry-attributes-color"
        args={[colorArray, 3]}
      />
    </instancedMesh>
  );
}
