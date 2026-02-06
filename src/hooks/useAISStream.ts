"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  AISStreamEnvelope,
  AISStreamSubscription,
  EnrichedVesselPosition,
  VesselPosition,
  VesselStatic,
} from "@/lib/ais";
import { parsePositionReport, parseShipStaticData, VesselStore } from "@/lib/ais";
import { enrichVessel } from "@/lib/commodity";
import { TEST_VESSELS } from "@/data/test-markers";

// ─── Configuration ──────────────────────────────────────────────────────────

const AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream";
const AISSTREAM_API_KEY =
  process.env.NEXT_PUBLIC_AISSTREAM_API_KEY || "7f7b4857052f93ddaac1d413ae4b82b23ee0a3e8";

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;

/** How often to flush vessel state to React (ms) */
const FLUSH_INTERVAL_MS = 2_000;

// Global bounding boxes — full world coverage
const GLOBAL_BBOXES: [number, number][][] = [
  [[-90, -180], [90, 180]],
];

// ─── Fallback Data ──────────────────────────────────────────────────────────

const FALLBACK_VESSELS: EnrichedVesselPosition[] = TEST_VESSELS.map((v) => ({
  mmsi: v.id,
  lat: v.lat,
  lon: v.lon,
  cog: v.heading,
  sog: v.speed,
  heading: v.heading,
  navStatus: 0,
  timestamp: Date.now(),
  shipName: `Test ${v.id}`,
  commodity:
    v.type === "container"
      ? "semiconductors"
      : v.type === "bulk"
        ? "copper"
        : "lithium",
  estimatedValueUsd: 0,
}));

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

// ─── Pure Message Processor (exported for testing) ──────────────────────────

export function processAISEnvelope(
  store: VesselStore,
  envelope: AISStreamEnvelope
): boolean {
  if (
    envelope.MessageType === "PositionReport" ||
    envelope.MessageType === "StandardClassBCSPositionReport"
  ) {
    const pos = parsePositionReport(envelope);
    if (pos) {
      store.updatePosition(pos);

      // Enrich using position proximity if no static data yet
      const record = store.get(pos.mmsi);
      if (record && !record.enrichment) {
        const fakeStatic: VesselStatic = {
          mmsi: pos.mmsi,
          name: pos.shipName,
          callSign: "",
          imo: 0,
          shipType: 70, // default cargo
          destination: "",
          dimBow: 0,
          dimStern: 0,
          dimPort: 0,
          dimStarboard: 0,
          draught: 0,
          eta: null,
          timestamp: pos.timestamp,
        };
        const enrichment = enrichVessel(fakeStatic, pos);
        record.enrichment = {
          commodity: enrichment.commodity,
          confidence: enrichment.confidence,
          estimatedValueUsd: enrichment.estimatedValueUsd,
          dwtEstimate: enrichment.dwtEstimate,
        };
      }
      return true;
    }
  }

  if (envelope.MessageType === "ShipStaticData") {
    const staticData = parseShipStaticData(envelope);
    if (staticData) {
      store.updateStatic(staticData);

      // Re-enrich with actual static data
      const record = store.get(staticData.mmsi);
      if (record) {
        const enrichment = enrichVessel(staticData, record.position);
        record.enrichment = {
          commodity: enrichment.commodity,
          confidence: enrichment.confidence,
          estimatedValueUsd: enrichment.estimatedValueUsd,
          dwtEstimate: enrichment.dwtEstimate,
        };
      }
      return true;
    }
  }

  return false;
}

/** Convert VesselStore records to EnrichedVesselPosition array */
function storeToEnrichedPositions(
  store: VesselStore
): EnrichedVesselPosition[] {
  const result: EnrichedVesselPosition[] = [];
  for (const [, record] of store.getAll()) {
    if (!record.position) continue;
    result.push({
      ...record.position,
      commodity: record.enrichment?.commodity ?? null,
      estimatedValueUsd: record.enrichment?.estimatedValueUsd ?? 0,
    });
  }
  return result;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAISStream(): {
  vessels: EnrichedVesselPosition[];
  status: ConnectionStatus;
} {
  const [vessels, setVessels] =
    useState<EnrichedVesselPosition[]>(FALLBACK_VESSELS);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  const wsRef = useRef<WebSocket | null>(null);
  const storeRef = useRef(new VesselStore({ ttlMs: 900_000 }));
  const mountedRef = useRef(true);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dirtyRef = useRef(false);

  const flush = useCallback(() => {
    if (dirtyRef.current && mountedRef.current) {
      storeRef.current.evictStale();
      setVessels(storeToEnrichedPositions(storeRef.current));
      dirtyRef.current = false;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(
    (connectFn: () => void) => {
      if (!mountedRef.current) return;
      if (reconnectTimerRef.current) return;

      const delay = backoffRef.current;

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connectFn();
      }, delay);

      backoffRef.current = Math.min(
        backoffRef.current * BACKOFF_MULTIPLIER,
        MAX_BACKOFF_MS
      );
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    mountedRef.current = true;

    const connect = () => {
      if (!mountedRef.current) return;

      cleanup();
      setStatus("connecting");

      const ws = new WebSocket(AISSTREAM_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;

        console.log("[AIS] WebSocket connected, sending subscription...");

        // Send subscription
        const subscription: AISStreamSubscription = {
          APIKey: AISSTREAM_API_KEY,
          BoundingBoxes: GLOBAL_BBOXES,
          FilterMessageTypes: [
            "PositionReport",
            "StandardClassBCSPositionReport",
            "ShipStaticData",
          ],
        };
        ws.send(JSON.stringify(subscription));

        setStatus("connected");
        backoffRef.current = INITIAL_BACKOFF_MS;

        // Start periodic flush
        flushTimerRef.current = setInterval(flush, FLUSH_INTERVAL_MS);
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;

        let envelope: AISStreamEnvelope;
        try {
          envelope = JSON.parse(event.data as string) as AISStreamEnvelope;
        } catch {
          console.warn("[AIS] Failed to parse message:", (event.data as string).slice(0, 200));
          return;
        }

        const changed = processAISEnvelope(storeRef.current, envelope);
        if (changed) {
          dirtyRef.current = true;
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        console.log(`[AIS] WebSocket closed: code=${event.code} reason="${event.reason}"`);
        setStatus("disconnected");

        // Keep whatever data we have — don't reset to fallback
        // if we already received real data
        if (storeRef.current.size === 0) {
          setVessels(FALLBACK_VESSELS);
        }

        scheduleReconnect(connect);
      };

      ws.onerror = (event) => {
        console.error("[AIS] WebSocket error:", event);
        // close event fires after error — reconnection handled there
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup, flush, scheduleReconnect]);

  return { vessels, status };
}
