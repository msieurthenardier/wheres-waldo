"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { greatCirclePoints } from "@/lib/geo";
import { TEST_LANES, TEST_PORTS } from "@/data/test-markers";

const LANE_COLORS: Record<string, string> = {
  semiconductors: "#00fff2",
  electronics: "#0ea5e9",
  mixed: "#a78bfa",
};

function LaneArc({
  fromLat,
  fromLon,
  toLat,
  toLon,
  color,
}: {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  color: string;
}) {
  const points = useMemo(
    () => greatCirclePoints(fromLat, fromLon, toLat, toLon, 64, 0.08),
    [fromLat, fromLon, toLat, toLon]
  );

  return (
    <Line
      points={points}
      color={color}
      lineWidth={1.5}
      opacity={0.6}
      transparent
    />
  );
}

export default function ShippingLanes() {
  const portMap = useMemo(() => {
    const map = new Map<string, (typeof TEST_PORTS)[0]>();
    for (const port of TEST_PORTS) {
      map.set(port.name, port);
    }
    return map;
  }, []);

  return (
    <group>
      {TEST_LANES.map((lane) => {
        const from = portMap.get(lane.from);
        const to = portMap.get(lane.to);
        if (!from || !to) return null;
        return (
          <LaneArc
            key={`${lane.from}-${lane.to}`}
            fromLat={from.lat}
            fromLon={from.lon}
            toLat={to.lat}
            toLon={to.lon}
            color={LANE_COLORS[lane.commodity] || "#00fff2"}
          />
        );
      })}
    </group>
  );
}
