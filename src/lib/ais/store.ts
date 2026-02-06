import type { VesselPosition, VesselRecord, VesselStatic } from "./types";

const DEFAULT_TTL_MS = 900_000; // 15 minutes

export class VesselStore {
  private vessels: Map<string, VesselRecord> = new Map();
  private ttlMs: number;

  constructor(options?: { ttlMs?: number }) {
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  }

  /**
   * Update store with a position report.
   * Returns true if position actually changed (or is new).
   */
  updatePosition(position: VesselPosition): boolean {
    const existing = this.vessels.get(position.mmsi);

    if (!existing) {
      // New vessel — always a delta
      this.vessels.set(position.mmsi, {
        position,
        static: null,
        enrichment: null,
        lastUpdate: position.timestamp,
      });
      return true;
    }

    const changed = this.hasPositionChanged(existing.position, position);

    existing.position = position;
    existing.lastUpdate = position.timestamp;

    return changed;
  }

  /**
   * Update store with static data.
   * Returns true if this is new static info (new MMSI or first static data for existing vessel).
   */
  updateStatic(staticData: VesselStatic): boolean {
    const existing = this.vessels.get(staticData.mmsi);

    if (!existing) {
      this.vessels.set(staticData.mmsi, {
        position: null,
        static: staticData,
        enrichment: null,
        lastUpdate: staticData.timestamp,
      });
      return true;
    }

    const isNew = existing.static === null;
    existing.static = staticData;
    existing.lastUpdate = staticData.timestamp;

    return isNew;
  }

  /** Get a single vessel record by MMSI */
  get(mmsi: string): VesselRecord | undefined {
    return this.vessels.get(mmsi);
  }

  /** Get all vessel records */
  getAll(): Map<string, VesselRecord> {
    return this.vessels;
  }

  /** Get count of stored vessels */
  get size(): number {
    return this.vessels.size;
  }

  /**
   * Remove vessels that haven't been updated within TTL.
   * Returns number of vessels evicted.
   */
  evictStale(now?: number): number {
    const currentTime = now ?? Date.now();
    let evicted = 0;

    for (const [mmsi, record] of this.vessels) {
      if (currentTime - record.lastUpdate > this.ttlMs) {
        this.vessels.delete(mmsi);
        evicted++;
      }
    }

    return evicted;
  }

  /**
   * Compare two positions for delta detection.
   * Uses Object.is() for NaN-safe comparison.
   */
  private hasPositionChanged(
    oldPos: VesselPosition | null,
    newPos: VesselPosition
  ): boolean {
    if (!oldPos) return true;

    return (
      !Object.is(oldPos.lat, newPos.lat) ||
      !Object.is(oldPos.lon, newPos.lon) ||
      !Object.is(oldPos.cog, newPos.cog) ||
      !Object.is(oldPos.sog, newPos.sog) ||
      !Object.is(oldPos.heading, newPos.heading)
    );
  }
}
