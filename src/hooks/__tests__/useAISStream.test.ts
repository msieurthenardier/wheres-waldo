import { describe, it, expect } from "vitest";
import { assignCommodity, estimateValue } from "../useAISStream";
import type { SnapshotVessel } from "../useAISStream";

function makeVessel(overrides: Partial<SnapshotVessel> = {}): SnapshotVessel {
  return {
    mmsi: 200000001,
    lat: 35.0,
    lon: -160.0,
    cog: 270,
    sog: 14.0,
    heading: 268,
    navStatus: 0,
    timestamp: Date.now(),
    shipName: "TEST VESSEL",
    shipType: 0,
    destination: "",
    length: 0,
    ...overrides,
  };
}

describe("assignCommodity", () => {
  it("assigns a cargo commodity for ship types 70-79", () => {
    const v = makeVessel({ shipType: 70, mmsi: 100 });
    const commodity = assignCommodity(v);
    expect(commodity).not.toBeNull();
    expect(["semiconductors", "copper", "rare_earths", "nickel", "cobalt"]).toContain(commodity);
  });

  it("assigns a tanker commodity for ship types 80-89", () => {
    const v = makeVessel({ shipType: 80, mmsi: 100 });
    const commodity = assignCommodity(v);
    expect(commodity).not.toBeNull();
    expect(["lithium", "cobalt"]).toContain(commodity);
  });

  it("returns null for non-cargo, non-tanker ship types", () => {
    expect(assignCommodity(makeVessel({ shipType: 30 }))).toBeNull();
    expect(assignCommodity(makeVessel({ shipType: 60 }))).toBeNull();
    expect(assignCommodity(makeVessel({ shipType: 0 }))).toBeNull();
  });

  it("distributes commodities based on mmsi for variety", () => {
    const commodities = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const c = assignCommodity(makeVessel({ shipType: 70, mmsi: 200000000 + i }));
      if (c) commodities.add(c);
    }
    expect(commodities.size).toBeGreaterThan(1);
  });
});

describe("estimateValue", () => {
  it("returns 0 for null commodity", () => {
    expect(estimateValue(null, 200)).toBe(0);
  });

  it("returns 0 for zero-length vessel", () => {
    expect(estimateValue("copper", 0)).toBe(0);
  });

  it("returns higher value for larger vessels", () => {
    const small = estimateValue("copper", 50);
    const large = estimateValue("copper", 250);
    expect(large).toBeGreaterThan(small);
  });

  it("returns higher value for more valuable commodities", () => {
    const copper = estimateValue("copper", 200);
    const semiconductors = estimateValue("semiconductors", 200);
    expect(semiconductors).toBeGreaterThan(copper);
  });
});
