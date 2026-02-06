import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Duplex } from "stream";
import type { VesselPosition, VesselStatic, EnrichedVesselPosition } from "@/lib/ais";
import { VesselStore } from "@/lib/ais";

// ─── DownstreamManager ──────────────────────────────────────────────────────

export class DownstreamManager {
  private wss: WebSocketServer;
  private store: VesselStore;

  constructor(store: VesselStore) {
    this.wss = new WebSocketServer({ noServer: true });
    this.store = store;

    this.wss.on("connection", (ws: WebSocket) => {
      this.sendSnapshot(ws);
    });
  }

  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit("connection", ws, request);
    });
  }

  broadcastPosition(position: VesselPosition): void {
    const enriched = this.enrichPosition(position);
    const message = JSON.stringify({
      type: "position",
      data: enriched,
    });
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  broadcastStatic(staticData: VesselStatic): void {
    const message = JSON.stringify({
      type: "static",
      data: staticData,
    });
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  get clientCount(): number {
    return this.wss.clients.size;
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      for (const client of this.wss.clients) {
        client.terminate();
      }
      this.wss.close(() => resolve());
    });
  }

  private enrichPosition(position: VesselPosition): EnrichedVesselPosition {
    const record = this.store.get(position.mmsi);
    const enrichment = record?.enrichment;
    return {
      ...position,
      commodity: enrichment?.commodity ?? null,
      estimatedValueUsd: enrichment?.estimatedValueUsd ?? 0,
    };
  }

  private sendSnapshot(ws: WebSocket): void {
    const vessels = this.store.getAll();
    const positions: EnrichedVesselPosition[] = [];
    for (const [, record] of vessels) {
      if (record.position) {
        positions.push(this.enrichPosition(record.position));
      }
    }
    ws.send(
      JSON.stringify({
        type: "snapshot",
        data: positions,
      })
    );
  }
}
