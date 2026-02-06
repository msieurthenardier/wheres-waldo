import { describe, it, expect } from "vitest";
import { processDownstreamMessage } from "../useAISStream";
import type { EnrichedVesselPosition } from "@/lib/ais";

function makePosition(overrides: Partial<EnrichedVesselPosition> = {}): EnrichedVesselPosition {
  return {
    mmsi: "200000001",
    lat: 35.0,
    lon: -160.0,
    cog: 270,
    sog: 14,
    heading: 268,
    navStatus: 0,
    timestamp: Date.now(),
    shipName: "TEST VESSEL",
    commodity: null,
    estimatedValueUsd: 0,
    ...overrides,
  };
}

describe("processDownstreamMessage", () => {
  it("replaces vessel map on snapshot", () => {
    const existing = new Map<string, EnrichedVesselPosition>();
    existing.set("old", makePosition({ mmsi: "old" }));

    const v1 = makePosition({ mmsi: "111" });
    const v2 = makePosition({ mmsi: "222" });

    const result = processDownstreamMessage(existing, {
      type: "snapshot",
      data: [v1, v2],
    });

    expect(result).not.toBeNull();
    expect(result!.size).toBe(2);
    expect(result!.has("111")).toBe(true);
    expect(result!.has("222")).toBe(true);
    expect(result!.has("old")).toBe(false);
  });

  it("handles empty snapshot", () => {
    const existing = new Map<string, EnrichedVesselPosition>();
    existing.set("old", makePosition({ mmsi: "old" }));

    const result = processDownstreamMessage(existing, {
      type: "snapshot",
      data: [],
    });

    expect(result).not.toBeNull();
    expect(result!.size).toBe(0);
  });

  it("upserts vessel on position update", () => {
    const existing = new Map<string, EnrichedVesselPosition>();
    existing.set("111", makePosition({ mmsi: "111", lat: 30 }));

    const updated = makePosition({ mmsi: "111", lat: 31 });
    const result = processDownstreamMessage(existing, {
      type: "position",
      data: updated,
    });

    expect(result).not.toBeNull();
    expect(result!.get("111")!.lat).toBe(31);
  });

  it("adds new vessel on position update", () => {
    const existing = new Map<string, EnrichedVesselPosition>();
    existing.set("111", makePosition({ mmsi: "111" }));

    const newVessel = makePosition({ mmsi: "222", lat: 40 });
    const result = processDownstreamMessage(existing, {
      type: "position",
      data: newVessel,
    });

    expect(result).not.toBeNull();
    expect(result!.size).toBe(2);
    expect(result!.has("222")).toBe(true);
  });

  it("does not modify original map on position update", () => {
    const existing = new Map<string, EnrichedVesselPosition>();
    existing.set("111", makePosition({ mmsi: "111" }));

    processDownstreamMessage(existing, {
      type: "position",
      data: makePosition({ mmsi: "222" }),
    });

    expect(existing.size).toBe(1);
    expect(existing.has("222")).toBe(false);
  });

  it("returns null for static messages", () => {
    const existing = new Map<string, EnrichedVesselPosition>();
    const result = processDownstreamMessage(existing, {
      type: "static",
      data: { mmsi: "111", name: "TEST" },
    });

    expect(result).toBeNull();
  });

  it("returns null for unknown message types", () => {
    const existing = new Map<string, EnrichedVesselPosition>();
    const result = processDownstreamMessage(existing, {
      type: "unknown" as "snapshot",
      data: {},
    });

    expect(result).toBeNull();
  });
});
