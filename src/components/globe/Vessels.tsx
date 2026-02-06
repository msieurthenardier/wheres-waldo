"use client";

import { useRef, useEffect, useMemo, useCallback, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import { latLonToVector3 } from "@/lib/geo";
import type { EnrichedVesselPosition } from "@/lib/ais";
import { COMMODITIES } from "@/lib/commodity";
import { useFilters } from "@/stores/filters";

const DEFAULT_COLOR = new THREE.Color("#00fff2");
const HIGHLIGHT_COLOR = new THREE.Color("#ffffff");
const MAX_VISIBLE_VESSELS = 12000;

/** Radius of invisible picking spheres (much larger than ship models) */
const PICK_RADIUS = 0.012;

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
  const { nodes } = useGLTF(
    `${basePath}/models/cargo-ship-transformed.glb`
  );
  const { selectItem, selectedId, selectedType } = useFilters();

  const meshRefA = useRef<THREE.InstancedMesh>(null);
  const meshRefB = useRef<THREE.InstancedMesh>(null);
  const pickRef = useRef<THREE.InstancedMesh>(null);

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

  // Invisible material for picking spheres
  const pickMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ visible: false }),
    []
  );

  // Build color array, highlighting selected vessel
  const colorArray = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const isSelected =
        selectedType === "vessel" && selectedId === visibleVessels[i].mmsi;
      const color = isSelected
        ? HIGHLIGHT_COLOR
        : getCommodityColor(visibleVessels[i].commodity);
      arr[i * 3] = color.r;
      arr[i * 3 + 1] = color.g;
      arr[i * 3 + 2] = color.b;
    }
    return arr;
  }, [visibleVessels, count, selectedId, selectedType]);

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

      // Picking sphere — same position, uniform scale
      if (pickRef.current) {
        dummy.scale.set(PICK_RADIUS, PICK_RADIUS, PICK_RADIUS);
        dummy.updateMatrix();
        pickRef.current.setMatrixAt(i, dummy.matrix);
      }
    });

    meshRefA.current.instanceMatrix.needsUpdate = true;
    if (meshRefB.current) {
      meshRefB.current.instanceMatrix.needsUpdate = true;
    }
    if (pickRef.current) {
      pickRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [visibleVessels]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (e.instanceId === undefined) return;
      e.stopPropagation();
      const vessel = visibleVessels[e.instanceId];
      if (vessel) {
        selectItem(vessel.mmsi, "vessel");
      }
    },
    [visibleVessels, selectItem]
  );

  const handlePointerOver = useCallback(() => {
    document.body.style.cursor = "pointer";
  }, []);

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = "auto";
  }, []);

  if (count === 0 || !geometryA) return null;

  return (
    <>
      {/* Visible ship models */}
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
      {/* Invisible picking spheres — larger hit area for clicking */}
      <instancedMesh
        key={`pick-${count}`}
        ref={pickRef}
        args={[undefined, pickMaterial, count]}
        frustumCulled={false}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[1, 8, 8]} />
      </instancedMesh>
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
