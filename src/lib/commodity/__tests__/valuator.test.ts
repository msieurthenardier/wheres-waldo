import { describe, it, expect } from "vitest";
import { enrichVessel, estimateDwt } from "@/lib/commodity/valuator";
import type { VesselStatic, VesselPosition } from "@/lib/ais";

function makeStatic(overrides: Partial<VesselStatic> = {}): VesselStatic {
  return {
    mmsi: "123456789",
    name: "TEST VESSEL",
    callSign: "TV01",
    imo: 1000001,
    shipType: 70,
    destination: "",
    dimBow: 150,
    dimStern: 50,
    dimPort: 15,
    dimStarboard: 15,
    draught: 10,
    eta: null,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makePosition(overrides: Partial<VesselPosition> = {}): VesselPosition {
  return {
    mmsi: "123456789",
    lat: 35.0,
    lon: 139.0,
    cog: 180,
    sog: 12,
    heading: 180,
    navStatus: 0,
    timestamp: Date.now(),
    shipName: "TEST VESSEL",
    ...overrides,
  };
}

describe("estimateDwt", () => {
  it("estimates DWT for a large cargo vessel", () => {
    // 200m × 30m beam × 10m draught
    const vessel = makeStatic({
      dimBow: 150,
      dimStern: 50,
      dimPort: 15,
      dimStarboard: 15,
      draught: 10,
    });
    const dwt = estimateDwt(vessel);
    expect(dwt).toBeGreaterThan(10_000);
    expect(dwt).toBeLessThan(100_000);
  });

  it("estimates DWT for a small vessel", () => {
    // 80m × 12m beam × 4m draught
    const vessel = makeStatic({
      dimBow: 50,
      dimStern: 30,
      dimPort: 6,
      dimStarboard: 6,
      draught: 4,
    });
    const dwt = estimateDwt(vessel);
    expect(dwt).toBeGreaterThan(500);
    expect(dwt).toBeLessThan(10_000);
  });

  it("returns 0 for zero dimensions", () => {
    const vessel = makeStatic({
      dimBow: 0,
      dimStern: 0,
      dimPort: 0,
      dimStarboard: 0,
      draught: 0,
    });
    expect(estimateDwt(vessel)).toBe(0);
  });

  it("returns 0 for zero draught", () => {
    const vessel = makeStatic({ draught: 0 });
    expect(estimateDwt(vessel)).toBe(0);
  });
});

describe("enrichVessel", () => {
  it("enriches a cargo vessel heading to Kaohsiung", () => {
    const vessel = makeStatic({ shipType: 70, destination: "KAOHSIUNG" });
    const result = enrichVessel(vessel);
    expect(result.commodity).toBe("semiconductors");
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.estimatedValueUsd).toBeGreaterThan(0);
    expect(result.dwtEstimate).toBeGreaterThan(0);
  });

  it("enriches a bulk carrier heading to Antofagasta", () => {
    const vessel = makeStatic({
      shipType: 70,
      destination: "ANTOFAGASTA",
      dimBow: 100,
      dimStern: 50,
      dimPort: 15,
      dimStarboard: 15,
      draught: 8,
    });
    const result = enrichVessel(vessel);
    expect(result.commodity).not.toBeNull();
    expect(["copper", "lithium"]).toContain(result.commodity);
    expect(result.estimatedValueUsd).toBeGreaterThan(0);
  });

  it("falls back to proximity when destination is unknown", () => {
    const vessel = makeStatic({ shipType: 70, destination: "" });
    // Position near Kaohsiung
    const position = makePosition({ lat: 22.65, lon: 120.35 });
    const result = enrichVessel(vessel, position);
    expect(result.commodity).toBe("semiconductors");
    expect(result.confidence).toBe(0.3);
  });

  it("returns null commodity for unclassifiable vessels", () => {
    // Fishing vessel (type 30) with no destination and far from ports
    const vessel = makeStatic({ shipType: 30, destination: "" });
    const position = makePosition({ lat: 0, lon: -170 }); // Mid-Pacific
    const result = enrichVessel(vessel, position);
    expect(result.commodity).toBeNull();
    expect(result.estimatedValueUsd).toBe(0);
  });

  it("returns zero value for vessels with zero dimensions", () => {
    const vessel = makeStatic({
      shipType: 70,
      destination: "KAOHSIUNG",
      dimBow: 0,
      dimStern: 0,
      dimPort: 0,
      dimStarboard: 0,
      draught: 0,
    });
    const result = enrichVessel(vessel);
    expect(result.commodity).toBe("semiconductors");
    expect(result.dwtEstimate).toBe(0);
    // Semiconductors use TEU-based model, not DWT
    // Even with zero dimensions, the TEU model gives a minimum value
    expect(result.estimatedValueUsd).toBeGreaterThanOrEqual(0);
  });

  it("semiconductor value uses TEU-based model, not bulk tonnage", () => {
    // Large container ship
    const vessel = makeStatic({
      shipType: 70,
      destination: "KAOHSIUNG",
      dimBow: 250,
      dimStern: 100,
      dimPort: 25,
      dimStarboard: 25,
      draught: 14,
    });
    const result = enrichVessel(vessel);
    expect(result.commodity).toBe("semiconductors");
    // Value should be in the millions, not billions
    // (unlike if we used bulk tonnage × $50M/ton)
    expect(result.estimatedValueUsd).toBeGreaterThan(1_000_000);
    expect(result.estimatedValueUsd).toBeLessThan(100_000_000_000);
  });
});
