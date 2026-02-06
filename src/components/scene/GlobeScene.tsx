"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useEffect } from "react";
import Globe from "@/components/globe/Globe";
import Atmosphere from "@/components/globe/Atmosphere";
import Vessels from "@/components/globe/Vessels";
import PortMarkers from "@/components/globe/PortMarkers";
import ShippingLanes from "@/components/globe/ShippingLanes";

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
  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ antialias: true }}
        style={{ background: "#000000" }}
      >
        <ambientLight intensity={0.15} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} />
        <Globe />
        <Atmosphere />
        <Vessels />
        <PortMarkers />
        <ShippingLanes />
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
    </div>
  );
}
