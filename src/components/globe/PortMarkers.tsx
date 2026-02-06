"use client";

import { useRef, useEffect, useMemo, useCallback } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVector3 } from "@/lib/geo";
import { COMMODITY_PORTS, COMMODITIES } from "@/lib/commodity";
import type { CommodityPort } from "@/lib/commodity";
import { useFilters } from "@/stores/filters";

const HIGHLIGHT_COLOR = new THREE.Color("#ffffff");

function getPortColor(port: CommodityPort): THREE.Color {
  // Use the color of the port's primary commodity (first export, or first import)
  const primaryCommodity = port.exports[0] ?? port.imports[0];
  if (primaryCommodity) {
    const info = COMMODITIES[primaryCommodity as keyof typeof COMMODITIES];
    if (info) return new THREE.Color(info.color);
  }
  return new THREE.Color("#00fff2");
}

export default function PortMarkers() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const { selectItem, selectedId, selectedType } = useFilters();
  const count = COMMODITY_PORTS.length;

  // Pulse animation
  useFrame(({ clock }) => {
    if (materialRef.current) {
      const pulse = 1.0 + 0.3 * Math.sin(clock.elapsedTime * 2);
      materialRef.current.emissiveIntensity = pulse;
    }
  });

  // Build color array, highlighting selected port
  const colorArray = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const isSelected =
        selectedType === "port" && selectedId === COMMODITY_PORTS[i].name;
      const color = isSelected
        ? HIGHLIGHT_COLOR
        : getPortColor(COMMODITY_PORTS[i]);
      arr[i * 3] = color.r;
      arr[i * 3 + 1] = color.g;
      arr[i * 3 + 2] = color.b;
    }
    return arr;
  }, [count, selectedId, selectedType]);

  useEffect(() => {
    if (!meshRef.current) return;

    const dummy = new THREE.Object3D();

    COMMODITY_PORTS.forEach((port, i) => {
      const pos = latLonToVector3(port.lat, port.lon, 1.005);
      dummy.position.copy(pos);
      // Scale based on port throughput
      const scale = 0.008 + port.throughput * 0.012;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (e.instanceId === undefined) return;
      e.stopPropagation();
      const port = COMMODITY_PORTS[e.instanceId];
      if (port) {
        selectItem(port.name, "port");
      }
    },
    [selectItem]
  );

  const handlePointerOver = useCallback(() => {
    document.body.style.cursor = "pointer";
  }, []);

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = "auto";
  }, []);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        ref={materialRef}
        vertexColors
        emissive="#ffffff"
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
