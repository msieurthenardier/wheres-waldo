import { describe, it, expect } from "vitest";
import { VesselStore } from "@/lib/ais/store";
import type { VesselPosition, VesselStatic } from "@/lib/ais/types";

// ─── Test Fixture Factories ──────────────────────────────────────────────────

function makePosition(overrides?: Partial<VesselPosition>): VesselPosition {
  return {
    mmsi: "123456789",
    lat: 35.6895,
    lon: 139.6917,
    cog: 215.0,
    sog: 14.5,
    heading: 215,
    navStatus: 0,
    timestamp: 1000000,
    shipName: "EVER GIVEN",
    ...overrides,
  };
}

function makeStatic(overrides?: Partial<VesselStatic>): VesselStatic {
  return {
    mmsi: "123456789",
    name: "EVER GIVEN",
    callSign: "H3RC",
    imo: 9811000,
    shipType: 70,
    destination: "ROTTERDAM",
    dimBow: 200,
    dimStern: 100,
    dimPort: 30,
    dimStarboard: 30,
    draught: 14.5,
    eta: "2026-03-15T14:30:00Z",
    timestamp: 1000000,
    ...overrides,
  };
}

// ─── VesselStore Tests ───────────────────────────────────────────────────────

describe("VesselStore", () => {
  describe("updatePosition", () => {
    it("adds a new vessel and returns true", () => {
      const store = new VesselStore();
      const pos = makePosition();

      const result = store.updatePosition(pos);

      expect(result).toBe(true);
      expect(store.size).toBe(1);
      const record = store.get("123456789");
      expect(record).toBeDefined();
      expect(record!.position).toEqual(pos);
      expect(record!.static).toBeNull();
    });

    it("returns false when updating with same position data (no delta)", () => {
      const store = new VesselStore();
      const pos = makePosition();

      store.updatePosition(pos);
      const result = store.updatePosition(pos);

      expect(result).toBe(false);
    });

    it("returns true when latitude changes", () => {
      const store = new VesselStore();
      store.updatePosition(makePosition());

      const result = store.updatePosition(makePosition({ lat: 36.0 }));
      expect(result).toBe(true);
    });

    it("returns false when NaN heading stays NaN (NaN-safe comparison)", () => {
      const store = new VesselStore();
      const pos = makePosition({ heading: NaN, cog: NaN, sog: NaN });

      store.updatePosition(pos);
      const result = store.updatePosition(
        makePosition({ heading: NaN, cog: NaN, sog: NaN })
      );

      expect(result).toBe(false);
    });

    it("returns true when heading changes from NaN to a value", () => {
      const store = new VesselStore();
      store.updatePosition(makePosition({ heading: NaN }));

      const result = store.updatePosition(makePosition({ heading: 180 }));
      expect(result).toBe(true);
    });
  });

  describe("updateStatic", () => {
    it("adds static data for an existing vessel and returns true", () => {
      const store = new VesselStore();
      store.updatePosition(makePosition());

      const result = store.updateStatic(makeStatic());

      expect(result).toBe(true);
      const record = store.get("123456789");
      expect(record!.position).not.toBeNull();
      expect(record!.static).not.toBeNull();
      expect(record!.static!.name).toBe("EVER GIVEN");
    });

    it("adds static data for a new MMSI and returns true", () => {
      const store = new VesselStore();
      const result = store.updateStatic(makeStatic({ mmsi: "999999999" }));

      expect(result).toBe(true);
      expect(store.size).toBe(1);
      const record = store.get("999999999");
      expect(record!.position).toBeNull();
      expect(record!.static).not.toBeNull();
    });

    it("returns false when updating static data that already exists", () => {
      const store = new VesselStore();
      store.updateStatic(makeStatic());

      const result = store.updateStatic(makeStatic({ timestamp: 2000000 }));
      expect(result).toBe(false);
    });
  });

  describe("getAll", () => {
    it("returns all vessel records", () => {
      const store = new VesselStore();
      store.updatePosition(makePosition({ mmsi: "111111111" }));
      store.updatePosition(makePosition({ mmsi: "222222222" }));
      store.updatePosition(makePosition({ mmsi: "333333333" }));

      const all = store.getAll();
      expect(all.size).toBe(3);
      expect(all.has("111111111")).toBe(true);
      expect(all.has("222222222")).toBe(true);
      expect(all.has("333333333")).toBe(true);
    });
  });

  describe("evictStale", () => {
    it("evicts vessels past TTL and returns count", () => {
      const store = new VesselStore({ ttlMs: 60_000 }); // 1 minute TTL
      store.updatePosition(makePosition({ timestamp: 1000 }));

      const evicted = store.evictStale(1000 + 60_001);

      expect(evicted).toBe(1);
      expect(store.size).toBe(0);
    });

    it("does not evict vessels within TTL", () => {
      const store = new VesselStore({ ttlMs: 60_000 });
      store.updatePosition(makePosition({ timestamp: 1000 }));

      const evicted = store.evictStale(1000 + 30_000);

      expect(evicted).toBe(0);
      expect(store.size).toBe(1);
    });

    it("only evicts stale vessels, keeps fresh ones", () => {
      const store = new VesselStore({ ttlMs: 60_000 });
      store.updatePosition(makePosition({ mmsi: "111111111", timestamp: 1000 }));
      store.updatePosition(makePosition({ mmsi: "222222222", timestamp: 50_000 }));
      store.updatePosition(makePosition({ mmsi: "333333333", timestamp: 100_000 }));

      const evicted = store.evictStale(62_000);

      expect(evicted).toBe(1); // Only "111111111" is stale
      expect(store.size).toBe(2);
      expect(store.get("111111111")).toBeUndefined();
      expect(store.get("222222222")).toBeDefined();
      expect(store.get("333333333")).toBeDefined();
    });

    it("respects custom TTL via constructor option", () => {
      const store = new VesselStore({ ttlMs: 5_000 }); // 5 second TTL
      store.updatePosition(makePosition({ timestamp: 1000 }));

      // Not stale yet at 5 seconds
      expect(store.evictStale(6_000)).toBe(0);
      // Stale at 5.001 seconds past lastUpdate
      expect(store.evictStale(6_001)).toBe(1);
    });
  });
});
