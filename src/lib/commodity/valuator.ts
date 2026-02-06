import type { VesselStatic, VesselPosition } from "@/lib/ais";
import type { CommodityId, VesselEnrichment } from "./types";
import { COMMODITIES } from "./commodities";
import { classifyVessel, classifyByProximity } from "./classifier";

/**
 * Block coefficient for DWT estimation.
 * Typical values: container ships ~0.6-0.7, bulk carriers ~0.8-0.85, tankers ~0.8-0.85.
 * Using 0.7 as a general average.
 */
const BLOCK_COEFFICIENT = 0.7;

/**
 * Water density in tons per cubic meter (seawater ≈ 1.025 t/m³)
 */
const WATER_DENSITY = 1.025;

/**
 * Cargo utilization factor — average percentage of DWT used for cargo
 * (rest is fuel, stores, crew, ballast)
 */
const CARGO_UTILIZATION = 0.7;

/**
 * Estimate deadweight tonnage from AIS vessel dimensions.
 *
 * DWT ≈ L × B × T × Cb × ρ
 * Where:
 *   L = length (dimBow + dimStern)
 *   B = beam (dimPort + dimStarboard)
 *   T = draught
 *   Cb = block coefficient
 *   ρ = water density
 *
 * This is a rough engineering estimate. Actual DWT varies by hull design.
 */
export function estimateDwt(vesselStatic: VesselStatic): number {
  const length = vesselStatic.dimBow + vesselStatic.dimStern;
  const beam = vesselStatic.dimPort + vesselStatic.dimStarboard;
  const draught = vesselStatic.draught;

  // Reject invalid/missing dimensions
  if (length <= 0 || beam <= 0 || draught <= 0) {
    return 0;
  }

  // Displacement = L × B × T × Cb × ρ
  const displacement = length * beam * draught * BLOCK_COEFFICIENT * WATER_DENSITY;

  // DWT is roughly 65-85% of displacement for cargo vessels
  // Using 0.75 as typical ratio
  return Math.round(displacement * 0.75);
}

/**
 * Estimate cargo tonnage from DWT.
 */
function estimateCargoTonnage(dwtTons: number): number {
  return dwtTons * CARGO_UTILIZATION;
}

/**
 * Estimate dollar value of a vessel's cargo.
 *
 * Value = cargo_tonnage × commodity_value_density
 *
 * For semiconductors (containerized), we use a different model:
 * a 200m container ship carries ~5000 TEU, semiconductor cargo
 * is measured in containers not bulk tonnage.
 */
function estimateCargoValue(
  cargoTonnage: number,
  commodity: CommodityId,
  length: number
): number {
  const info = COMMODITIES[commodity];
  if (!info) return 0;

  // Semiconductors are value-dense but low-mass
  // A container ship doesn't carry 50,000 tons of chips
  // Estimate: ~20-50 containers of chips on a large vessel
  // Each 40ft container ≈ 20 tons, value ~$50-200M per container
  if (commodity === "semiconductors") {
    // Estimate TEU capacity from length (rough: length/20 * 3 rows * 4 high)
    const estimatedTeu = Math.max(1, Math.round((length / 20) * 3 * 4));
    // Only a fraction of TEU is semiconductors on a mixed container ship
    const chipContainers = Math.max(1, Math.round(estimatedTeu * 0.05));
    // Each container ~20 tons at ~$50M/ton
    return chipContainers * 20 * info.valueDensity;
  }

  // For bulk commodities, straightforward: tonnage × price/ton
  return Math.round(cargoTonnage * info.valueDensity);
}

/**
 * Enrich a vessel with commodity classification and value estimation.
 *
 * Requires VesselStatic data (ship type, dimensions, destination).
 * Optionally uses VesselPosition for proximity-based classification fallback.
 */
export function enrichVessel(
  vesselStatic: VesselStatic,
  vesselPosition?: VesselPosition | null
): VesselEnrichment {
  // Step 1: Classify commodity (destination-based)
  let classification = classifyVessel(vesselStatic);

  // Step 2: If low-confidence (ship-type fallback only), try proximity
  if (classification && classification.confidence < 0.3 && vesselPosition) {
    const proxClassification = classifyByProximity(
      vesselPosition.lat,
      vesselPosition.lon,
      vesselStatic.shipType
    );
    if (proxClassification && proxClassification.confidence > classification.confidence) {
      classification = proxClassification;
    }
  }

  // Step 3: If still null, try proximity
  if (!classification && vesselPosition) {
    classification = classifyByProximity(
      vesselPosition.lat,
      vesselPosition.lon,
      vesselStatic.shipType
    );
  }

  // Step 4: If still no classification, return unenriched
  if (!classification) {
    return {
      commodity: null,
      confidence: 0,
      estimatedValueUsd: 0,
      dwtEstimate: 0,
      reason: "Unclassifiable vessel type or route",
    };
  }

  // Step 5: Estimate DWT and cargo value
  const dwtEstimate = estimateDwt(vesselStatic);
  const cargoTonnage = estimateCargoTonnage(dwtEstimate);
  const length = vesselStatic.dimBow + vesselStatic.dimStern;
  const estimatedValueUsd = estimateCargoValue(
    cargoTonnage,
    classification.commodity,
    length
  );

  return {
    commodity: classification.commodity,
    confidence: classification.confidence,
    estimatedValueUsd,
    dwtEstimate,
    reason: classification.reason,
  };
}
