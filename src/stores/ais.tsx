"use client";

import { createContext, useContext, useMemo } from "react";
import type { EnrichedVesselPosition } from "@/lib/ais";
import { useAISStream, type ConnectionStatus } from "@/hooks/useAISStream";

interface AISContextValue {
  vessels: EnrichedVesselPosition[];
  status: ConnectionStatus;
  stats: {
    totalVessels: number;
    totalValueInTransit: number;
    commodityBreakdown: Record<string, { count: number; value: number }>;
  };
}

const AISContext = createContext<AISContextValue | null>(null);

export function AISProvider({ children }: { children: React.ReactNode }) {
  const { vessels, status } = useAISStream();

  const stats = useMemo(() => {
    let totalValue = 0;
    const breakdown: Record<string, { count: number; value: number }> = {};

    for (const v of vessels) {
      totalValue += v.estimatedValueUsd;
      const key = v.commodity ?? "unknown";
      if (!breakdown[key]) breakdown[key] = { count: 0, value: 0 };
      breakdown[key].count++;
      breakdown[key].value += v.estimatedValueUsd;
    }

    return {
      totalVessels: vessels.length,
      totalValueInTransit: totalValue,
      commodityBreakdown: breakdown,
    };
  }, [vessels]);

  const value = useMemo(
    () => ({ vessels, status, stats }),
    [vessels, status, stats]
  );

  return <AISContext.Provider value={value}>{children}</AISContext.Provider>;
}

export function useAISData(): AISContextValue {
  const ctx = useContext(AISContext);
  if (!ctx) throw new Error("useAISData must be used within AISProvider");
  return ctx;
}
