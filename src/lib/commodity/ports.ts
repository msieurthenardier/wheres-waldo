import type { CommodityPort } from "./types";

/**
 * Key ports for AI-critical commodity trade routes.
 *
 * This database covers major export and import ports for semiconductors,
 * lithium, cobalt, rare earths, nickel, and copper. Ports are classified
 * by their known commodity associations based on public trade data.
 *
 * Sources: UN Comtrade, port authority reports, USGS, industry publications.
 */
export const COMMODITY_PORTS: CommodityPort[] = [
  // ─── East Asia (Semiconductors, Rare Earths) ────────────────────────────
  {
    name: "Kaohsiung",
    lat: 22.6,
    lon: 120.3,
    exports: ["semiconductors"],
    imports: [],
    throughput: 0.95,
    country: "TW",
    region: "East Asia",
  },
  {
    name: "Keelung",
    lat: 25.13,
    lon: 121.74,
    exports: ["semiconductors"],
    imports: ["rare_earths"],
    throughput: 0.5,
    country: "TW",
    region: "East Asia",
  },
  {
    name: "Busan",
    lat: 35.1,
    lon: 129.1,
    exports: ["semiconductors"],
    imports: ["rare_earths", "copper"],
    throughput: 0.85,
    country: "KR",
    region: "East Asia",
  },
  {
    name: "Incheon",
    lat: 37.45,
    lon: 126.7,
    exports: ["semiconductors"],
    imports: ["lithium", "cobalt", "nickel"],
    throughput: 0.6,
    country: "KR",
    region: "East Asia",
  },
  {
    name: "Shanghai",
    lat: 31.2,
    lon: 121.5,
    exports: ["rare_earths", "semiconductors"],
    imports: ["copper", "nickel", "cobalt"],
    throughput: 1.0,
    country: "CN",
    region: "East Asia",
  },
  {
    name: "Shenzhen",
    lat: 22.5,
    lon: 114.05,
    exports: ["semiconductors", "rare_earths"],
    imports: ["copper", "lithium"],
    throughput: 0.8,
    country: "CN",
    region: "East Asia",
  },
  {
    name: "Lianyungang",
    lat: 34.75,
    lon: 119.45,
    exports: ["rare_earths"],
    imports: [],
    throughput: 0.45,
    country: "CN",
    region: "East Asia",
  },
  {
    name: "Tianjin",
    lat: 38.98,
    lon: 117.73,
    exports: ["rare_earths"],
    imports: ["copper", "nickel"],
    throughput: 0.65,
    country: "CN",
    region: "East Asia",
  },
  {
    name: "Tokyo",
    lat: 35.65,
    lon: 139.77,
    exports: ["semiconductors"],
    imports: ["rare_earths", "lithium", "cobalt", "nickel", "copper"],
    throughput: 0.7,
    country: "JP",
    region: "East Asia",
  },

  // ─── Southeast Asia (Nickel, Copper) ─────────────────────────────────────
  {
    name: "Singapore",
    lat: 1.3,
    lon: 103.8,
    exports: [],
    imports: ["semiconductors", "copper", "nickel"],
    throughput: 0.9,
    country: "SG",
    region: "Southeast Asia",
  },
  {
    name: "Sulawesi (Morowali)",
    lat: -2.6,
    lon: 121.7,
    exports: ["nickel"],
    imports: [],
    throughput: 0.55,
    country: "ID",
    region: "Southeast Asia",
  },
  {
    name: "Manila",
    lat: 14.58,
    lon: 120.97,
    exports: ["nickel", "copper"],
    imports: ["semiconductors"],
    throughput: 0.45,
    country: "PH",
    region: "Southeast Asia",
  },
  {
    name: "Surigao",
    lat: 9.78,
    lon: 125.5,
    exports: ["nickel"],
    imports: [],
    throughput: 0.35,
    country: "PH",
    region: "Southeast Asia",
  },

  // ─── South America (Lithium, Copper) ─────────────────────────────────────
  {
    name: "Antofagasta",
    lat: -23.65,
    lon: -70.4,
    exports: ["copper", "lithium"],
    imports: [],
    throughput: 0.7,
    country: "CL",
    region: "South America",
  },
  {
    name: "Iquique",
    lat: -20.2,
    lon: -70.15,
    exports: ["lithium", "copper"],
    imports: [],
    throughput: 0.4,
    country: "CL",
    region: "South America",
  },
  {
    name: "Callao",
    lat: -12.05,
    lon: -77.15,
    exports: ["copper"],
    imports: [],
    throughput: 0.5,
    country: "PE",
    region: "South America",
  },
  {
    name: "Santos",
    lat: -23.95,
    lon: -46.3,
    exports: ["lithium"],
    imports: ["semiconductors"],
    throughput: 0.45,
    country: "BR",
    region: "South America",
  },

  // ─── Australia (Lithium, Rare Earths, Nickel) ────────────────────────────
  {
    name: "Port Hedland",
    lat: -20.3,
    lon: 118.6,
    exports: ["lithium"],
    imports: [],
    throughput: 0.6,
    country: "AU",
    region: "Australia",
  },
  {
    name: "Fremantle",
    lat: -32.05,
    lon: 115.75,
    exports: ["lithium", "nickel", "rare_earths"],
    imports: [],
    throughput: 0.55,
    country: "AU",
    region: "Australia",
  },

  // ─── Africa (Cobalt, Copper) ─────────────────────────────────────────────
  {
    name: "Durban",
    lat: -29.87,
    lon: 31.05,
    exports: ["cobalt", "copper"],
    imports: [],
    throughput: 0.55,
    country: "ZA",
    region: "Africa",
  },
  {
    name: "Dar es Salaam",
    lat: -6.82,
    lon: 39.28,
    exports: ["cobalt"],
    imports: [],
    throughput: 0.4,
    country: "TZ",
    region: "Africa",
  },
  {
    name: "Mombasa",
    lat: -4.04,
    lon: 39.67,
    exports: ["cobalt"],
    imports: [],
    throughput: 0.3,
    country: "KE",
    region: "Africa",
  },

  // ─── Europe (Import Hub) ─────────────────────────────────────────────────
  {
    name: "Rotterdam",
    lat: 51.9,
    lon: 4.5,
    exports: [],
    imports: ["semiconductors", "lithium", "cobalt", "rare_earths", "nickel", "copper"],
    throughput: 0.85,
    country: "NL",
    region: "Europe",
  },
  {
    name: "Hamburg",
    lat: 53.55,
    lon: 9.97,
    exports: [],
    imports: ["semiconductors", "lithium", "rare_earths", "copper"],
    throughput: 0.6,
    country: "DE",
    region: "Europe",
  },
  {
    name: "Antwerp",
    lat: 51.23,
    lon: 4.4,
    exports: [],
    imports: ["cobalt", "copper", "rare_earths"],
    throughput: 0.55,
    country: "BE",
    region: "Europe",
  },

  // ─── North America (Import Hub) ──────────────────────────────────────────
  {
    name: "Los Angeles",
    lat: 33.73,
    lon: -118.26,
    exports: [],
    imports: ["semiconductors", "lithium", "rare_earths", "nickel", "copper"],
    throughput: 0.75,
    country: "US",
    region: "North America",
  },
  {
    name: "Long Beach",
    lat: 33.77,
    lon: -118.19,
    exports: [],
    imports: ["semiconductors", "rare_earths", "copper"],
    throughput: 0.7,
    country: "US",
    region: "North America",
  },
  {
    name: "Houston",
    lat: 29.75,
    lon: -95.27,
    exports: [],
    imports: ["lithium", "cobalt", "copper"],
    throughput: 0.5,
    country: "US",
    region: "North America",
  },
  {
    name: "Savannah",
    lat: 32.08,
    lon: -81.09,
    exports: [],
    imports: ["semiconductors", "copper"],
    throughput: 0.45,
    country: "US",
    region: "North America",
  },

  // ─── Middle East / Indian Subcontinent ───────────────────────────────────
  {
    name: "Jebel Ali",
    lat: 25.0,
    lon: 55.06,
    exports: [],
    imports: ["semiconductors", "copper"],
    throughput: 0.6,
    country: "AE",
    region: "Middle East",
  },
  {
    name: "Mundra",
    lat: 22.73,
    lon: 69.72,
    exports: [],
    imports: ["lithium", "cobalt", "copper"],
    throughput: 0.45,
    country: "IN",
    region: "South Asia",
  },
];

/**
 * Find the nearest port within maxDistanceKm of a lat/lon position.
 * Returns null if no port is within range.
 */
export function findNearestPort(
  lat: number,
  lon: number,
  maxDistanceKm: number = 200
): CommodityPort | null {
  let nearest: CommodityPort | null = null;
  let nearestDist = Infinity;

  for (const port of COMMODITY_PORTS) {
    const dist = haversineKm(lat, lon, port.lat, port.lon);
    if (dist < nearestDist && dist <= maxDistanceKm) {
      nearestDist = dist;
      nearest = port;
    }
  }

  return nearest;
}

/**
 * Find ports that export a specific commodity.
 */
export function getExportPorts(commodityId: string): CommodityPort[] {
  return COMMODITY_PORTS.filter((p) => p.exports.includes(commodityId as never));
}

/**
 * Find ports that import a specific commodity.
 */
export function getImportPorts(commodityId: string): CommodityPort[] {
  return COMMODITY_PORTS.filter((p) => p.imports.includes(commodityId as never));
}

/** Haversine distance in kilometers */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
