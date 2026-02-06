"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { greatCirclePoints } from "@/lib/geo";
import { getTradeRoutes } from "@/lib/commodity";

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
  const routes = useMemo(() => getTradeRoutes(), []);

  return (
    <group>
      {routes.map((route) => (
        <LaneArc
          key={`${route.fromName}-${route.toName}-${route.commodity}`}
          fromLat={route.fromLat}
          fromLon={route.fromLon}
          toLat={route.toLat}
          toLon={route.toLon}
          color={route.color}
        />
      ))}
    </group>
  );
}
