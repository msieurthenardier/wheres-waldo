import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Duplex } from "stream";
import type { VesselPosition, VesselStatic } from "@/lib/ais";
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
    const message = JSON.stringify({
      type: "position",
      data: position,
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

  private sendSnapshot(ws: WebSocket): void {
    const vessels = this.store.getAll();
    const positions: VesselPosition[] = [];
    for (const [, record] of vessels) {
      if (record.position) {
        positions.push(record.position);
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
