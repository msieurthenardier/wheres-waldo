"use client";

import { useState, useEffect } from "react";
import type { EnrichedVesselPosition } from "@/lib/ais";
import type { CommodityId } from "@/lib/commodity";

// ─── Configuration ──────────────────────────────────────────────────────────

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const SNAPSHOT_URL = `${basePath}/data/ais-snapshot.json`;

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface SnapshotVessel {
  mmsi: number;
  lat: number;
  lon: number;
  cog: number;
  sog: number;
  heading: number;
  navStatus: number;
  timestamp: number;
  shipName: string;
  shipType: number;
  destination: string;
  length: number;
}

// ─── Commodity Assignment ───────────────────────────────────────────────────

const CARGO_COMMODITIES: CommodityId[] = [
  "semiconductors",
  "copper",
  "rare_earths",
  "nickel",
  "cobalt",
];
const TANKER_COMMODITIES: CommodityId[] = ["lithium", "cobalt"];

/** Assign a commodity based on ship type for visual variety */
export function assignCommodity(v: SnapshotVessel): CommodityId | null {
  if (v.shipType >= 70 && v.shipType <= 79) {
    return CARGO_COMMODITIES[v.mmsi % CARGO_COMMODITIES.length];
  }
  if (v.shipType >= 80 && v.shipType <= 89) {
    return TANKER_COMMODITIES[v.mmsi % TANKER_COMMODITIES.length];
  }
  return null;
}

/** Rough cargo value estimate based on commodity and ship length */
export function estimateValue(commodity: CommodityId | null, length: number): number {
  if (!commodity || length === 0) return 0;
  // Larger ships carry more — use length as a rough proxy for DWT
  const dwtEstimate = length > 200 ? 80_000 : length > 100 ? 30_000 : 5_000;
  const densities: Record<string, number> = {
    semiconductors: 50_000_000,
    lithium: 25_000,
    cobalt: 30_000,
    rare_earths: 200_000,
    nickel: 18_000,
    copper: 9_000,
  };
  const density = densities[commodity] ?? 0;
  return dwtEstimate * density * 0.001; // rough scale factor
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAISStream(): {
  vessels: EnrichedVesselPosition[];
  status: ConnectionStatus;
} {
  const [vessels, setVessels] = useState<EnrichedVesselPosition[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      try {
        const res = await fetch(SNAPSHOT_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: SnapshotVessel[] = await res.json();

        if (cancelled) return;

        const enriched: EnrichedVesselPosition[] = data.map((v) => {
          const commodity = assignCommodity(v);
          return {
            mmsi: String(v.mmsi),
            lat: v.lat,
            lon: v.lon,
            cog: v.cog,
            sog: v.sog,
            heading: v.heading,
            navStatus: v.navStatus,
            timestamp: v.timestamp,
            shipName: v.shipName,
            commodity,
            estimatedValueUsd: estimateValue(commodity, v.length),
          };
        });

        setVessels(enriched);
        setStatus("connected");
      } catch (err) {
        console.error("[AIS] Failed to load snapshot:", err);
        if (!cancelled) setStatus("disconnected");
      }
    }

    loadSnapshot();
    return () => { cancelled = true; };
  }, []);

  return { vessels, status };
}
