import type { CommodityId } from "./types";
import { COMMODITY_PORTS } from "./ports";
import { COMMODITIES } from "./commodities";

export interface TradeRoute {
  fromName: string;
  fromLat: number;
  fromLon: number;
  toName: string;
  toLat: number;
  toLon: number;
  commodity: CommodityId;
  color: string;
}

/**
 * Generate trade routes by connecting export ports to import ports
 * for each commodity. Creates the key shipping lanes visible on the globe.
 *
 * To keep the visualization clean, we limit routes to major connections
 * (not every permutation of export-import pairs).
 */
export function generateTradeRoutes(): TradeRoute[] {
  const routes: TradeRoute[] = [];
  const seen = new Set<string>();

  for (const commodity of Object.keys(COMMODITIES) as CommodityId[]) {
    const exportPorts = COMMODITY_PORTS.filter((p) =>
      p.exports.includes(commodity)
    );
    const importPorts = COMMODITY_PORTS.filter((p) =>
      p.imports.includes(commodity)
    );

    // Connect each export port to the top import ports (by throughput)
    // Limit to 3 import destinations per export to avoid visual clutter
    const topImports = [...importPorts]
      .sort((a, b) => b.throughput - a.throughput)
      .slice(0, 5);

    for (const exp of exportPorts) {
      for (const imp of topImports) {
        // Skip same-region routes (not meaningful ocean shipping)
        if (exp.region === imp.region) continue;

        // Deduplicate bidirectional routes
        const key = [exp.name, imp.name].sort().join("-") + "-" + commodity;
        if (seen.has(key)) continue;
        seen.add(key);

        routes.push({
          fromName: exp.name,
          fromLat: exp.lat,
          fromLon: exp.lon,
          toName: imp.name,
          toLat: imp.lat,
          toLon: imp.lon,
          commodity,
          color: COMMODITIES[commodity].color,
        });
      }
    }
  }

  return routes;
}

/** Cached trade routes — computed once */
let _cachedRoutes: TradeRoute[] | null = null;

export function getTradeRoutes(): TradeRoute[] {
  if (!_cachedRoutes) {
    _cachedRoutes = generateTradeRoutes();
  }
  return _cachedRoutes;
}
