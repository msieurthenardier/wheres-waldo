"use client";

import { useRef, useEffect, useMemo, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { latLonToVector3 } from "@/lib/geo";
import type { EnrichedVesselPosition } from "@/lib/ais";
import { COMMODITIES } from "@/lib/commodity";

const DEFAULT_COLOR = new THREE.Color("#00fff2");
const MAX_VISIBLE_VESSELS = 12000;

function getCommodityColor(commodity: string | null): THREE.Color {
  if (!commodity) return DEFAULT_COLOR;
  const info = COMMODITIES[commodity as keyof typeof COMMODITIES];
  if (!info) return DEFAULT_COLOR;
  return new THREE.Color(info.color);
}

interface VesselsProps {
  vessels: EnrichedVesselPosition[];
}

function VesselInstances({ vessels }: VesselsProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const { nodes, materials } = useGLTF(
    `${basePath}/models/cargo-ship-transformed.glb`
  );

  const meshRefA = useRef<THREE.InstancedMesh>(null);
  const meshRefB = useRef<THREE.InstancedMesh>(null);

  // Extract geometry from GLTF nodes
  const geometryA = (nodes.node_id6 as THREE.Mesh)?.geometry;
  const geometryB = (nodes.node_id9 as THREE.Mesh)?.geometry;

  // Cap vessel count for performance
  const visibleVessels = useMemo(
    () =>
      vessels.length > MAX_VISIBLE_VESSELS
        ? vessels.slice(0, MAX_VISIBLE_VESSELS)
        : vessels,
    [vessels]
  );
  const count = visibleVessels.length;

  // Unlit material — at this scale, lighting washes out the colors
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ vertexColors: true }),
    []
  );

  const colorArray = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const color = getCommodityColor(visibleVessels[i].commodity);
      arr[i * 3] = color.r;
      arr[i * 3 + 1] = color.g;
      arr[i * 3 + 2] = color.b;
    }
    return arr;
  }, [visibleVessels, count]);

  useEffect(() => {
    if (!meshRefA.current) return;

    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const rotMatrix = new THREE.Matrix4();

    visibleVessels.forEach((vessel, i) => {
      const pos = latLonToVector3(vessel.lat, vessel.lon, 1.01);
      dummy.position.copy(pos);

      // Surface normal = radial outward
      up.copy(pos).normalize();

      // Compute heading tangent on the globe surface
      const headingDeg = !isNaN(vessel.heading)
        ? vessel.heading
        : !isNaN(vessel.cog)
          ? vessel.cog
          : 0;
      const headingRad = (headingDeg * Math.PI) / 180;

      // Start with an arbitrary tangent, then rotate by heading
      forward.set(0, 1, 0);
      if (Math.abs(up.dot(forward)) > 0.99) {
        forward.set(1, 0, 0);
      }
      // Project onto tangent plane and rotate by heading
      right.crossVectors(forward, up).normalize();
      forward.crossVectors(up, right).normalize();
      forward.applyAxisAngle(up, headingRad);
      right.crossVectors(forward, up).normalize();

      // Build orientation: X=right, Y=up (surface normal), Z=forward (bow)
      rotMatrix.makeBasis(right, up, forward);
      dummy.setRotationFromMatrix(rotMatrix);

      const base = 0.00012;
      dummy.scale.set(base, base, base);
      dummy.updateMatrix();

      meshRefA.current!.setMatrixAt(i, dummy.matrix);
      if (meshRefB.current) {
        meshRefB.current.setMatrixAt(i, dummy.matrix);
      }
    });

    meshRefA.current.instanceMatrix.needsUpdate = true;
    if (meshRefB.current) {
      meshRefB.current.instanceMatrix.needsUpdate = true;
    }
  }, [visibleVessels]);

  if (count === 0 || !geometryA) return null;

  return (
    <>
      <instancedMesh
        key={`a-${count}`}
        ref={meshRefA}
        args={[geometryA, material, count]}
        frustumCulled={false}
      >
        <instancedBufferAttribute
          attach="geometry-attributes-color"
          args={[colorArray, 3]}
        />
      </instancedMesh>
      {geometryB && (
        <instancedMesh
          key={`b-${count}`}
          ref={meshRefB}
          args={[geometryB, material, count]}
          frustumCulled={false}
        >
          <instancedBufferAttribute
            attach="geometry-attributes-color"
            args={[colorArray, 3]}
          />
        </instancedMesh>
      )}
    </>
  );
}

export default function Vessels({ vessels }: VesselsProps) {
  return (
    <Suspense fallback={null}>
      <VesselInstances vessels={vessels} />
    </Suspense>
  );
}
