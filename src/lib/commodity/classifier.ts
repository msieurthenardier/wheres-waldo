import type { VesselStatic } from "@/lib/ais";
import type { CommodityClassification, CommodityId, CommodityPort } from "./types";
import { COMMODITY_PORTS, findNearestPort } from "./ports";

/**
 * AIS ship type code ranges relevant to commodity transport:
 *   70-79: Cargo (general, container, bulk)
 *   80-89: Tanker (oil, chemical, LNG)
 *
 * Sub-ranges:
 *   70: Cargo, all types default
 *   71: Cargo, Hazardous category A
 *   72: Cargo, Hazardous category B
 *   73: Cargo, Hazardous category C
 *   74: Cargo, Hazardous category D
 *   75-78: Cargo, reserved
 *   79: Cargo, no additional info
 *   80: Tanker, all types default
 *   81-84: Tanker, Hazardous categories A-D
 *   85-88: Tanker, reserved
 *   89: Tanker, no additional info
 */
function isCargo(shipType: number): boolean {
  return shipType >= 70 && shipType <= 79;
}

function isTanker(shipType: number): boolean {
  return shipType >= 80 && shipType <= 89;
}

function isBulkOrGeneral(shipType: number): boolean {
  // Bulk carriers often report as general cargo (70) or specific cargo types
  return shipType === 70 || shipType === 79;
}

/**
 * Classify a vessel's likely commodity based on ship type, destination,
 * and available vessel information.
 *
 * Classification strategy (in priority order):
 * 1. Match destination to a known commodity port → commodity from port's exports/imports
 * 2. If multiple commodities match, prefer based on ship type (tanker vs cargo)
 * 3. Fall back to commodity based on ship type alone
 *
 * Returns null if the vessel is not classifiable (unknown type, no destination match).
 */
export function classifyVessel(
  vesselStatic: VesselStatic
): CommodityClassification | null {
  const { shipType, destination } = vesselStatic;

  // Only classify cargo ships and tankers
  if (!isCargo(shipType) && !isTanker(shipType)) {
    return null;
  }

  // Try destination-based classification first
  const destMatch = matchDestination(destination);
  if (destMatch) {
    const commodity = pickBestCommodity(destMatch, shipType);
    if (commodity) {
      return {
        commodity,
        confidence: 0.7,
        reason: `Destination "${destination}" matches port ${destMatch.name} (${destMatch.country})`,
      };
    }
  }

  // Fall back to general ship-type classification
  return classifyByShipType(shipType);
}

/**
 * Match a destination string to a known commodity port.
 * AIS destination fields are free-text, often abbreviated or misspelled.
 * We use fuzzy matching against port names.
 */
function matchDestination(destination: string): CommodityPort | null {
  if (!destination || destination === "Unknown") return null;

  const dest = destination.toUpperCase().trim();
  if (!dest || dest.length < 2) return null;

  // Exact or substring match against port names
  for (const port of COMMODITY_PORTS) {
    const portName = port.name.toUpperCase();
    if (dest.includes(portName) || portName.includes(dest)) {
      return port;
    }
  }

  // Common AIS abbreviations and alternate names
  const aliases: Record<string, string> = {
    "LA": "Los Angeles",
    "LOS ANG": "Los Angeles",
    "L BEACH": "Long Beach",
    "LONG BCH": "Long Beach",
    "RTM": "Rotterdam",
    "RTTRDM": "Rotterdam",
    "ROTTERDA": "Rotterdam",
    "SGSIN": "Singapore",
    "SGP": "Singapore",
    "SINGAPO": "Singapore",
    "SHA": "Shanghai",
    "SHANGHA": "Shanghai",
    "SHENZHE": "Shenzhen",
    "BUSAN": "Busan",
    "PUSAN": "Busan",
    "KAOHSIU": "Kaohsiung",
    "HAMBUR": "Hamburg",
    "HBG": "Hamburg",
    "ANT": "Antwerp",
    "ANTWER": "Antwerp",
    "HOUSTON": "Houston",
    "SAVANNA": "Savannah",
    "DURBAN": "Durban",
    "JEBEL": "Jebel Ali",
    "JEA": "Jebel Ali",
    "MUNDRA": "Mundra",
    "MANILA": "Manila",
    "TOKYO": "Tokyo",
    "INCHEON": "Incheon",
    "KEELUNG": "Keelung",
    "SANTOS": "Santos",
    "CALLAO": "Callao",
    "MOMBASA": "Mombasa",
    "DAR ES": "Dar es Salaam",
    "TIANJIN": "Tianjin",
    "ANTOFAG": "Antofagasta",
    "IQUIQUE": "Iquique",
    "HEDLAND": "Port Hedland",
    "PT HEDL": "Port Hedland",
    "FREMANT": "Fremantle",
    "LIANYUN": "Lianyungang",
    "MOROWA": "Sulawesi (Morowali)",
    "SURIGA": "Surigao",
  };

  for (const [abbr, fullName] of Object.entries(aliases)) {
    if (dest.includes(abbr)) {
      const port = COMMODITY_PORTS.find(
        (p) => p.name.toUpperCase() === fullName.toUpperCase()
      );
      if (port) return port;
    }
  }

  return null;
}

/**
 * Given a matched port and ship type, pick the most likely commodity.
 * Uses all commodity associations (both exports and imports) since a vessel
 * heading to a port could be loading exports or delivering imports.
 */
function pickBestCommodity(
  port: CommodityPort,
  shipType: number
): CommodityId | null {
  // Use all commodity associations — deduplicated
  const seen = new Set<CommodityId>();
  const commodities: CommodityId[] = [];
  for (const c of [...port.exports, ...port.imports]) {
    if (!seen.has(c)) {
      seen.add(c);
      commodities.push(c);
    }
  }
  if (commodities.length === 0) return null;
  if (commodities.length === 1) return commodities[0];

  // If tanker, prefer liquid/chemical commodities
  if (isTanker(shipType)) {
    const liquid: CommodityId[] = ["lithium", "cobalt", "nickel", "copper"];
    const match = commodities.find((c) => liquid.includes(c));
    if (match) return match;
  }

  // If container/cargo, prefer semiconductors and rare earths
  if (isCargo(shipType)) {
    const highValue: CommodityId[] = ["semiconductors", "rare_earths"];
    const match = commodities.find((c) => highValue.includes(c));
    if (match) return match;
  }

  // Default to first commodity
  return commodities[0];
}

/**
 * Fall-back classification when no destination match.
 * Very low confidence — just based on ship type.
 */
function classifyByShipType(shipType: number): CommodityClassification | null {
  if (isBulkOrGeneral(shipType)) {
    return {
      commodity: "copper",
      confidence: 0.15,
      reason: "General/bulk cargo vessel (no destination match)",
    };
  }
  if (isCargo(shipType)) {
    return {
      commodity: "semiconductors",
      confidence: 0.1,
      reason: "Cargo vessel (no destination match)",
    };
  }
  if (isTanker(shipType)) {
    return {
      commodity: "lithium",
      confidence: 0.1,
      reason: "Tanker vessel (no destination match)",
    };
  }
  return null;
}

/**
 * Classify a vessel by its current position proximity to known ports.
 * Used as a supplementary signal when destination is unknown.
 */
export function classifyByProximity(
  lat: number,
  lon: number,
  shipType: number
): CommodityClassification | null {
  const port = findNearestPort(lat, lon, 100);
  if (!port) return null;

  const commodity = pickBestCommodity(port, shipType);
  if (!commodity) return null;

  return {
    commodity,
    confidence: 0.3,
    reason: `Near port ${port.name} (${port.country})`,
  };
}
