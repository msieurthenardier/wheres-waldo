"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { VesselPosition } from "@/lib/ais";
import { TEST_VESSELS } from "@/data/test-markers";

// ─── Configuration ──────────────────────────────────────────────────────────

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 10_000;
const BACKOFF_MULTIPLIER = 2;

// ─── Fallback Data ──────────────────────────────────────────────────────────

const FALLBACK_VESSELS: VesselPosition[] = TEST_VESSELS.map((v) => ({
  mmsi: v.id,
  lat: v.lat,
  lon: v.lon,
  cog: v.heading,
  sog: v.speed,
  heading: v.heading,
  navStatus: 0,
  timestamp: Date.now(),
  shipName: `Test ${v.id}`,
}));

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface DownstreamMessage {
  type: "snapshot" | "position" | "static";
  data: unknown;
}

// ─── Pure Message Processor (exported for testing) ──────────────────────────

export function processDownstreamMessage(
  vesselMap: Map<string, VesselPosition>,
  msg: DownstreamMessage
): Map<string, VesselPosition> | null {
  switch (msg.type) {
    case "snapshot": {
      const positions = msg.data as VesselPosition[];
      const map = new Map<string, VesselPosition>();
      for (const pos of positions) {
        map.set(pos.mmsi, pos);
      }
      return map;
    }
    case "position": {
      const pos = msg.data as VesselPosition;
      const newMap = new Map(vesselMap);
      newMap.set(pos.mmsi, pos);
      return newMap;
    }
    case "static":
      return null;
    default:
      return null;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAISStream(): {
  vessels: VesselPosition[];
  status: ConnectionStatus;
} {
  const [vessels, setVessels] = useState<VesselPosition[]>(FALLBACK_VESSELS);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  const wsRef = useRef<WebSocket | null>(null);
  const vesselMapRef = useRef<Map<string, VesselPosition>>(
    new Map(FALLBACK_VESSELS.map((v) => [v.mmsi, v]))
  );
  const mountedRef = useRef(true);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);

  const flushVessels = useCallback(() => {
    if (dirtyRef.current && mountedRef.current) {
      setVessels(Array.from(vesselMapRef.current.values()));
      dirtyRef.current = false;
    }
    rafIdRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
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

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/ais`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setStatus("connected");
        backoffRef.current = INITIAL_BACKOFF_MS;
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;

        let msg: DownstreamMessage;
        try {
          msg = JSON.parse(event.data as string) as DownstreamMessage;
        } catch {
          return;
        }

        const result = processDownstreamMessage(vesselMapRef.current, msg);
        if (result) {
          vesselMapRef.current = result;
          dirtyRef.current = true;
          if (!rafIdRef.current) {
            rafIdRef.current = requestAnimationFrame(flushVessels);
          }
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setStatus("disconnected");
        // Fall back to test data
        vesselMapRef.current = new Map(
          FALLBACK_VESSELS.map((v) => [v.mmsi, v])
        );
        setVessels(FALLBACK_VESSELS);
        scheduleReconnect(connect);
      };

      ws.onerror = () => {
        // The 'close' event fires after 'error', so reconnection is handled there
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup, flushVessels, scheduleReconnect]);

  return { vessels, status };
}
