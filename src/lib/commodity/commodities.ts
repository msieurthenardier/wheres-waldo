import type { CommodityInfo, CommodityId } from "./types";

/**
 * AI-critical commodity definitions with approximate value densities.
 *
 * Value densities are order-of-magnitude estimates used for relative weighting,
 * not precise market prices. Sources: USGS Mineral Commodity Summaries, UN
 * Comtrade annual trade statistics, industry reports.
 */
export const COMMODITIES: Record<CommodityId, CommodityInfo> = {
  semiconductors: {
    id: "semiconductors",
    label: "Semiconductors",
    color: "#f43f5e", // rose
    valueDensity: 50_000_000, // ~$50M/ton (high-end chips are extremely value-dense)
    hsCodes: ["8541", "8542"], // Semiconductor devices, integrated circuits
    description: "Integrated circuits, processors, memory chips, and semiconductor wafers",
  },
  lithium: {
    id: "lithium",
    label: "Lithium",
    color: "#22c55e", // green
    valueDensity: 25_000, // ~$25K/ton (lithium carbonate)
    hsCodes: ["2836", "2825"], // Lithium carbonates, lithium oxide
    description: "Lithium carbonate and hydroxide for battery production",
  },
  cobalt: {
    id: "cobalt",
    label: "Cobalt",
    color: "#a855f7", // purple
    valueDensity: 30_000, // ~$30K/ton
    hsCodes: ["2605", "8105"], // Cobalt ores, cobalt mattes
    description: "Cobalt ore, concentrates, and refined cobalt for batteries",
  },
  rare_earths: {
    id: "rare_earths",
    label: "Rare Earths",
    color: "#f59e0b", // amber
    valueDensity: 200_000, // ~$200K/ton (mixed basket, some elements much higher)
    hsCodes: ["2846", "2805"], // Rare-earth compounds
    description: "Rare earth elements for magnets, electronics, and defense applications",
  },
  nickel: {
    id: "nickel",
    label: "Nickel",
    color: "#06b6d4", // cyan
    valueDensity: 18_000, // ~$18K/ton
    hsCodes: ["2604", "7501", "7502"], // Nickel ores, mattes, unwrought nickel
    description: "Nickel ore, concentrates, and refined nickel for batteries and alloys",
  },
  copper: {
    id: "copper",
    label: "Copper",
    color: "#f97316", // orange
    valueDensity: 9_000, // ~$9K/ton
    hsCodes: ["2603", "7401", "7402", "7403"], // Copper ores, concentrates, refined
    description: "Copper ore, concentrates, and refined copper for electronics and wiring",
  },
};

export const COMMODITY_IDS = Object.keys(COMMODITIES) as CommodityId[];

/** Get commodity info by ID, or null if invalid */
export function getCommodity(id: string): CommodityInfo | null {
  return COMMODITIES[id as CommodityId] ?? null;
}
