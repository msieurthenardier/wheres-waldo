import WebSocket from "ws";
import {
  VesselStore,
  parsePositionReport,
  parseShipStaticData,
  type AISStreamSubscription,
  type AISStreamEnvelope,
  type VesselPosition,
  type VesselStatic,
} from "@/lib/ais";

// ─── Configuration ──────────────────────────────────────────────────────────

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;
const EVICTION_INTERVAL_MS = 60_000;

const AIS_BOUNDING_BOXES: [number, number][][] = [
  [[0, 100], [45, 145]],      // East Asia / Western Pacific
  [[-10, 95], [10, 120]],     // Southeast Asia / Malacca Strait
  [[-35, 40], [25, 100]],     // Indian Ocean
  [[25, 30], [45, 45]],       // Suez / Mediterranean
  [[0, -80], [55, 0]],        // Atlantic
  [[25, -130], [50, -115]],   // US West Coast
];

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UpstreamEvents {
  onPositionUpdate?: (position: VesselPosition) => void;
  onStaticUpdate?: (staticData: VesselStatic) => void;
}

// ─── UpstreamManager ────────────────────────────────────────────────────────

export class UpstreamManager {
  private ws: WebSocket | null = null;
  private store: VesselStore;
  private url: string;
  private apiKey: string;
  private backoffMs: number = INITIAL_BACKOFF_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private evictionTimer: ReturnType<typeof setInterval> | null = null;
  private closed: boolean = false;
  private events: UpstreamEvents;

  constructor(options: {
    store: VesselStore;
    url: string;
    apiKey: string;
    events?: UpstreamEvents;
  }) {
    this.store = options.store;
    this.url = options.url;
    this.apiKey = options.apiKey;
    this.events = options.events ?? {};
  }

  connect(): void {
    if (this.closed) return;

    // Start eviction timer (once)
    if (!this.evictionTimer) {
      this.evictionTimer = setInterval(() => {
        const evicted = this.store.evictStale();
        if (evicted > 0) {
          console.log(`Evicted ${evicted} stale vessel(s)`);
        }
      }, EVICTION_INTERVAL_MS);
    }

    this.ws = new WebSocket(this.url);

    this.ws.on("open", () => {
      console.log(`Upstream connected to ${this.url}`);
      this.backoffMs = INITIAL_BACKOFF_MS;

      const subscription: AISStreamSubscription = {
        APIKey: this.apiKey,
        BoundingBoxes: AIS_BOUNDING_BOXES,
        FilterMessageTypes: ["PositionReport", "ShipStaticData"],
      };
      this.ws!.send(JSON.stringify(subscription));
    });

    this.ws.on("message", (data: WebSocket.RawData) => {
      this.handleMessage(data);
    });

    this.ws.on("close", () => {
      this.scheduleReconnect();
    });

    this.ws.on("error", (err) => {
      console.error("Upstream WebSocket error:", err.message);
      // The 'close' event fires after 'error', so reconnect is handled there.
      // But if the connection never opened, we need to schedule reconnect here.
      if (this.ws?.readyState === WebSocket.CLOSED) {
        this.scheduleReconnect();
      }
    });
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.evictionTimer) {
      clearInterval(this.evictionTimer);
      this.evictionTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  private handleMessage(data: WebSocket.RawData): void {
    let envelope: AISStreamEnvelope;
    try {
      envelope = JSON.parse(data.toString()) as AISStreamEnvelope;
    } catch {
      console.warn("Upstream sent non-JSON message, skipping");
      return;
    }

    const position = parsePositionReport(envelope);
    if (position) {
      const changed = this.store.updatePosition(position);
      if (changed) {
        this.events.onPositionUpdate?.(position);
      }
      return;
    }

    const staticData = parseShipStaticData(envelope);
    if (staticData) {
      const isNew = this.store.updateStatic(staticData);
      if (isNew) {
        this.events.onStaticUpdate?.(staticData);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    if (this.reconnectTimer) return;

    console.log(`Upstream disconnected. Reconnecting in ${this.backoffMs}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.backoffMs);

    this.backoffMs = Math.min(this.backoffMs * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS);
  }
}
