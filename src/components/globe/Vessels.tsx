"use client";

import { useRef, useEffect, useMemo, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { latLonToVector3 } from "@/lib/geo";
import type { EnrichedVesselPosition } from "@/lib/ais";
import { COMMODITIES } from "@/lib/commodity";

const DEFAULT_COLOR = new THREE.Color("#00fff2");
const MAX_VISIBLE_VESSELS = 5000;

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

  // Create per-instance color material (override GLTF materials)
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        emissive: new THREE.Color("#ffffff"),
        emissiveIntensity: 0.3,
      }),
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

    visibleVessels.forEach((vessel, i) => {
      const pos = latLonToVector3(vessel.lat, vessel.lon, 1.01);
      dummy.position.copy(pos);

      up.copy(pos).normalize();

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

      const valueScale =
        vessel.estimatedValueUsd > 0
          ? Math.min(2.0, 0.8 + Math.log10(vessel.estimatedValueUsd) / 10)
          : 1.0;
      const base = 0.003 * valueScale;
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
