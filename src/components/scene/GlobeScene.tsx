"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo } from "react";
import Globe from "@/components/globe/Globe";
import Atmosphere from "@/components/globe/Atmosphere";
import Vessels from "@/components/globe/Vessels";
import PortMarkers from "@/components/globe/PortMarkers";
import ShippingLanes from "@/components/globe/ShippingLanes";
import { useAISData } from "@/stores/ais";
import { useFilters } from "@/stores/filters";
import type { CommodityId } from "@/lib/commodity";

function ReadySignal() {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const parent = gl.domElement.parentElement;
    if (parent) {
      parent.setAttribute("data-globe-ready", "true");
    }
  }, [gl]);
  return null;
}

export default function GlobeScene() {
  const { vessels, status } = useAISData();
  const { activeCommodities, searchQuery } = useFilters();

  const filteredVessels = useMemo(() => {
    let filtered = vessels;

    // Filter by active commodities
    if (activeCommodities.size < 6) {
      filtered = filtered.filter(
        (v) =>
          !v.commodity ||
          activeCommodities.has(v.commodity as CommodityId)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.shipName.toLowerCase().includes(q) ||
          v.mmsi.includes(q) ||
          (v.commodity && v.commodity.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [vessels, activeCommodities, searchQuery]);

  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ antialias: true }}
        style={{ background: "#000000" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 3, 5]} intensity={1.8} />
        <Globe />
        <Atmosphere />
        <Vessels vessels={filteredVessels} />
        <PortMarkers />
        <ShippingLanes activeCommodities={activeCommodities} />
        <OrbitControls
          enablePan={false}
          minDistance={1.2}
          maxDistance={4.0}
          enableDamping
          dampingFactor={0.05}
          autoRotate
          autoRotateSpeed={0.003}
        />
        <EffectComposer multisampling={0}>
          <Bloom
            luminanceThreshold={0.9}
            luminanceSmoothing={0.2}
            intensity={0.3}
          />
          <Vignette offset={0.1} darkness={0.8} />
        </EffectComposer>
        <ReadySignal />
      </Canvas>
      <div className="absolute bottom-4 left-4 z-10 font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-secondary)]">
        {status === "connected"
          ? `LIVE — ${filteredVessels.length} vessels`
          : status === "connecting"
            ? "Connecting to AIS stream..."
            : "Using demo data"}
      </div>
    </div>
  );
}
