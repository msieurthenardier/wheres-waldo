import { describe, it, expect, beforeAll, afterAll } from "vitest";
import WebSocket from "ws";
import { startMockServer, type MockServerHandle } from "../mock-ais";
import { parsePositionReport, parseShipStaticData } from "@/lib/ais";
import type { AISStreamEnvelope } from "@/lib/ais";

describe("Mock AIS Server", () => {
  let server: MockServerHandle;
  const TEST_PORT = 19090;

  beforeAll(() => {
    server = startMockServer({
      port: TEST_PORT,
      messageRate: 50,
      vesselCount: 5,
      timeScale: 100,
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it("accepts subscription and streams valid AIS messages", async () => {
    const messages: AISStreamEnvelope[] = [];

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Timed out waiting for messages"));
      }, 5000);

      ws.on("open", () => {
        ws.send(
          JSON.stringify({
            APIKey: "test-key",
            BoundingBoxes: [[[-90, -180], [90, 180]]],
            FilterMessageTypes: ["PositionReport", "ShipStaticData"],
          })
        );
      });

      ws.on("message", (data: Buffer) => {
        const envelope = JSON.parse(data.toString()) as AISStreamEnvelope;
        messages.push(envelope);

        if (messages.length >= 10) {
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

    expect(messages.length).toBeGreaterThanOrEqual(10);

    for (const msg of messages) {
      expect(msg).toHaveProperty("MessageType");
      expect(msg).toHaveProperty("Message");
      expect(msg).toHaveProperty("MetaData");
      expect(msg.MetaData).toHaveProperty("MMSI");
      expect(msg.MetaData).toHaveProperty("MMSI_String");
      expect(typeof msg.MetaData.MMSI_String).toBe("string");
    }

    const positionMessages = messages.filter(
      (m) => m.MessageType === "PositionReport"
    );
    expect(positionMessages.length).toBeGreaterThan(0);
    for (const msg of positionMessages) {
      const parsed = parsePositionReport(msg);
      expect(parsed).not.toBeNull();
      expect(parsed!.lat).toBeGreaterThanOrEqual(-90);
      expect(parsed!.lat).toBeLessThanOrEqual(90);
      expect(parsed!.lon).toBeGreaterThanOrEqual(-180);
      expect(parsed!.lon).toBeLessThanOrEqual(180);
    }

    const staticMessages = messages.filter(
      (m) => m.MessageType === "ShipStaticData"
    );
    for (const msg of staticMessages) {
      const parsed = parseShipStaticData(msg);
      expect(parsed).not.toBeNull();
    }
  });

  it("handles multiple concurrent clients", async () => {
    const connectAndReceive = (): Promise<number> => {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
        let count = 0;
        const timeout = setTimeout(() => {
          ws.close();
          resolve(count);
        }, 2000);

        ws.on("open", () => {
          ws.send(
            JSON.stringify({
              APIKey: "test-key",
              BoundingBoxes: [[[-90, -180], [90, 180]]],
            })
          );
        });

        ws.on("message", () => {
          count++;
          if (count >= 5) {
            clearTimeout(timeout);
            ws.close();
            resolve(count);
          }
        });

        ws.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    };

    const [count1, count2] = await Promise.all([
      connectAndReceive(),
      connectAndReceive(),
    ]);

    expect(count1).toBeGreaterThanOrEqual(5);
    expect(count2).toBeGreaterThanOrEqual(5);
  });

  it("streams messages with valid coordinate ranges", async () => {
    const positions: Array<{ lat: number; lon: number }> = [];

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
      const timeout = setTimeout(() => {
        ws.close();
        resolve();
      }, 3000);

      ws.on("open", () => {
        ws.send(
          JSON.stringify({
            APIKey: "test-key",
            BoundingBoxes: [[[-90, -180], [90, 180]]],
          })
        );
      });

      ws.on("message", (data: Buffer) => {
        const envelope = JSON.parse(data.toString()) as AISStreamEnvelope;
        if (envelope.MessageType === "PositionReport") {
          const parsed = parsePositionReport(envelope);
          if (parsed) {
            positions.push({ lat: parsed.lat, lon: parsed.lon });
          }
        }

        if (positions.length >= 20) {
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

    expect(positions.length).toBeGreaterThan(0);
    for (const pos of positions) {
      expect(pos.lat).toBeGreaterThanOrEqual(-90);
      expect(pos.lat).toBeLessThanOrEqual(90);
      expect(pos.lon).toBeGreaterThanOrEqual(-180);
      expect(pos.lon).toBeLessThanOrEqual(180);
    }
  });
});
