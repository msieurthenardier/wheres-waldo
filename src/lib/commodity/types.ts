// ─── Commodity Types ─────────────────────────────────────────────────────────

/** The six AI-critical commodity categories tracked by this application */
export type CommodityId =
  | "semiconductors"
  | "lithium"
  | "cobalt"
  | "rare_earths"
  | "nickel"
  | "copper";

export interface CommodityInfo {
  id: CommodityId;
  label: string;
  color: string; // Hex color for visualization
  /** Approximate $/metric-ton value (order of magnitude for weighting) */
  valueDensity: number;
  /** HS commodity code prefixes for reference */
  hsCodes: string[];
  description: string;
}

// ─── Port Types ──────────────────────────────────────────────────────────────

export interface CommodityPort {
  name: string;
  lat: number;
  lon: number;
  /** Which commodities this port is known for exporting */
  exports: CommodityId[];
  /** Which commodities this port is known for importing */
  imports: CommodityId[];
  /** Relative throughput value 0-1 for sizing */
  throughput: number;
  /** Country code (ISO 3166-1 alpha-2) */
  country: string;
  /** Region for grouping */
  region: string;
}

// ─── Classification Types ────────────────────────────────────────────────────

export interface CommodityClassification {
  commodity: CommodityId;
  confidence: number; // 0-1
  reason: string;
}

// ─── Enriched Vessel Types ───────────────────────────────────────────────────

export interface VesselEnrichment {
  commodity: CommodityId | null;
  confidence: number;
  estimatedValueUsd: number;
  dwtEstimate: number;
  reason: string;
}
