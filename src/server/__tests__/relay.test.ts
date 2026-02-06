import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "http";
import WebSocket from "ws";
import { startMockServer, type MockServerHandle } from "../mock-ais";
import { VesselStore } from "@/lib/ais";
import { UpstreamManager } from "../upstream";
import { DownstreamManager } from "../downstream";
import type { VesselPosition } from "@/lib/ais";

describe("WebSocket Relay Server", () => {
  let mockServer: MockServerHandle;
  let relayHttpServer: Server;
  let upstream: UpstreamManager;
  let downstream: DownstreamManager;
  const MOCK_PORT = 19091;
  const RELAY_PORT = 19092;

  beforeAll(async () => {
    mockServer = startMockServer({
      port: MOCK_PORT,
      messageRate: 50,
      vesselCount: 5,
      timeScale: 100,
    });

    const store = new VesselStore();
    downstream = new DownstreamManager(store);

    relayHttpServer = createServer();
    relayHttpServer.on("upgrade", (request, socket, head) => {
      const url = new URL(
        request.url ?? "/",
        `http://localhost:${RELAY_PORT}`
      );
      if (url.pathname === "/ws/ais") {
        downstream.handleUpgrade(request, socket, head);
      } else {
        socket.destroy();
      }
    });

    await new Promise<void>((resolve) => {
      relayHttpServer.listen(RELAY_PORT, resolve);
    });

    upstream = new UpstreamManager({
      store,
      url: `ws://localhost:${MOCK_PORT}`,
      apiKey: "test-key",
      events: {
        onPositionUpdate: (pos) => downstream.broadcastPosition(pos),
        onStaticUpdate: (sd) => downstream.broadcastStatic(sd),
      },
    });
    upstream.connect();

    // Wait for upstream to connect and start receiving data
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    upstream.close();
    await downstream.close();
    await new Promise<void>((resolve) =>
      relayHttpServer.close(() => resolve())
    );
    await mockServer.close();
  });

  it("relays vessel position updates from upstream to downstream client", async () => {
    const messages: Array<{ type: string; data: unknown }> = [];

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${RELAY_PORT}/ws/ais`);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Timed out waiting for relay messages"));
      }, 10_000);

      ws.on("message", (data: Buffer) => {
        const msg = JSON.parse(data.toString());
        messages.push(msg);

        const positionUpdates = messages.filter((m) => m.type === "position");
        if (positionUpdates.length >= 3) {
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      });

      ws.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // First message should be a snapshot
    expect(messages[0].type).toBe("snapshot");
    expect(Array.isArray(messages[0].data)).toBe(true);

    // Subsequent messages should be position or static updates
    const positionMsgs = messages.filter((m) => m.type === "position");
    expect(positionMsgs.length).toBeGreaterThanOrEqual(3);

    for (const msg of positionMsgs) {
      const pos = msg.data as VesselPosition;
      expect(pos).toHaveProperty("mmsi");
      expect(pos).toHaveProperty("lat");
      expect(pos).toHaveProperty("lon");
      expect(pos).toHaveProperty("sog");
      expect(pos).toHaveProperty("cog");
      expect(pos).toHaveProperty("heading");
      expect(pos.lat).toBeGreaterThanOrEqual(-90);
      expect(pos.lat).toBeLessThanOrEqual(90);
      expect(pos.lon).toBeGreaterThanOrEqual(-180);
      expect(pos.lon).toBeLessThanOrEqual(180);
    }
  });

  it("sends a snapshot to newly connected clients", async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const snapshot = await new Promise<{
      type: string;
      data: VesselPosition[];
    }>((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${RELAY_PORT}/ws/ais`);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Timed out waiting for snapshot"));
      }, 5000);

      ws.on("message", (data: Buffer) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "snapshot") {
          clearTimeout(timeout);
          ws.close();
          resolve(msg);
        }
      });

      ws.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    expect(snapshot.type).toBe("snapshot");
    expect(Array.isArray(snapshot.data)).toBe(true);
    expect(snapshot.data.length).toBeGreaterThan(0);
  });

  it("rejects WebSocket upgrades on non /ws/ais paths", async () => {
    await expect(
      new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`ws://localhost:${RELAY_PORT}/ws/other`);
        const timeout = setTimeout(() => {
          ws.close();
          resolve();
        }, 2000);

        ws.on("open", () => {
          clearTimeout(timeout);
          ws.close();
          reject(new Error("Should not have connected on /ws/other"));
        });

        ws.on("error", () => {
          clearTimeout(timeout);
          resolve();
        });
      })
    ).resolves.toBeUndefined();
  });
});
