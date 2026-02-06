# Leg: 01-mock-ais-server

**Status**: completed
**Flight**: [AIS Data Pipeline](../flight.md)

## Objective

Create a standalone mock AIS WebSocket server that implements the AISStream.io protocol, generating synthetic vessels that move along great-circle paths between ports, enabling development and testing without a live API key.

## Context

- **Design decision from flight**: "A mock server generates synthetic AIS messages (ships moving along realistic routes between known ports) at configurable rates. This enables development without the real API key, deterministic testing, and demo scenarios. The mock server implements the same upstream WebSocket protocol as AISStream.io so the relay server can connect to either interchangeably via a URL environment variable."
- **How this fits**: The relay server (Leg 02) will connect to either this mock server or the real AISStream.io endpoint via `AIS_UPSTREAM_URL`. By building the mock first, we can develop and test the relay end-to-end without external dependencies. The mock also serves as a permanent development and demo tool.
- **Learnings from Leg 00**: The AIS type system, parser, and store are complete with 32 passing tests. Types `AISStreamSubscription`, `AISStreamEnvelope`, `PositionReport`, `ShipStaticData`, and `AISStreamMetaData` are defined in `src/lib/ais/types.ts`. The parser normalizes raw AIS sentinel values (Cog: 3600, Sog: 1023, TrueHeading: 511) and strips `@` padding from string fields. The mock server must produce messages that conform to these raw types so the parser can process them identically to real AISStream.io data.
- **The `ws` package**: Must be installed as a regular dependency (not devDependency) because the relay server (Leg 02) will use it in production. `@types/ws` goes in devDependencies.

## Inputs

What exists before this leg runs:
- `package.json` -- Current dependencies (no `ws` package yet)
- `src/lib/ais/types.ts` -- `AISStreamSubscription`, `AISStreamEnvelope`, `PositionReport`, `ShipStaticData`, `AISStreamMetaData`, `AISMessageType`
- `src/lib/ais/parser.ts` -- `parsePositionReport`, `parseShipStaticData` (used by smoke test to verify output)
- `src/lib/ais/store.ts` -- `VesselStore` class
- `src/lib/ais/index.ts` -- Barrel exports
- `src/data/test-markers.ts` -- `TEST_PORTS` (Shanghai, Rotterdam, Singapore, Los Angeles, Busan, Kaohsiung) with lat/lon coordinates
- `vitest.config.ts` -- Vitest configured with `@/*` path alias
- `tsconfig.json` -- TypeScript config with `@/*` path alias mapping to `./src/*`

## Outputs

What exists after this leg completes:
- `package.json` -- `ws` added to `dependencies`, `@types/ws` added to `devDependencies`, new `"dev:mock"` script
- `src/server/mock-ais.ts` -- Standalone mock AIS WebSocket server
- `src/server/__tests__/mock-ais.test.ts` -- Smoke test verifying protocol and message format

## Acceptance Criteria

- [ ] `ws` is listed in `dependencies` (not devDependencies) in `package.json`
- [ ] `@types/ws` is listed in `devDependencies` in `package.json`
- [ ] A `"dev:mock"` script exists in `package.json` that runs `tsx src/server/mock-ais.ts`
- [ ] `npx tsx src/server/mock-ais.ts` starts a WebSocket server on a configurable port (default 9090)
- [ ] The server accepts a JSON subscription message matching `AISStreamSubscription` format (with `APIKey` and `BoundingBoxes` fields)
- [ ] The server streams `AISStreamEnvelope` messages containing `PositionReport` and `ShipStaticData` payloads at a configurable rate
- [ ] Generated vessels move along great-circle paths between ports defined in `test-markers.ts`
- [ ] Message rate is configurable via `MOCK_MESSAGE_RATE` environment variable (default: 10 messages/second)
- [ ] Vessel count is configurable via `MOCK_VESSEL_COUNT` environment variable (default: 25)
- [ ] All generated messages pass through `parsePositionReport` / `parseShipStaticData` without returning `null` (well-formed)
- [ ] The smoke test connects via WebSocket, sends a subscription, receives messages, and validates they are parseable `AISStreamEnvelope` objects
- [ ] `npx vitest run` passes all tests (existing Leg 00 tests + new smoke test)
- [ ] `npx tsc --noEmit` reports zero errors

## Verification Steps

1. Run `npm install` and verify `ws` appears in `dependencies` and `@types/ws` in `devDependencies` in `package.json`
2. Run `npx tsx src/server/mock-ais.ts` -- server starts and logs its listening port (default 9090)
3. Send a WebSocket connection and subscription message -- server begins streaming JSON messages
4. Inspect message payloads -- each is a valid `AISStreamEnvelope` with `MessageType`, `Message`, and `MetaData` fields
5. Feed messages through `parsePositionReport` / `parseShipStaticData` -- all return non-null results
6. Run `npx vitest run` -- all tests pass (Leg 00 tests + mock server smoke test)
7. Run `npx tsc --noEmit` -- no TypeScript errors
8. Set `MOCK_VESSEL_COUNT=5 MOCK_MESSAGE_RATE=2 npx tsx src/server/mock-ais.ts` -- server runs with 5 vessels at 2 messages/second

## Implementation Guidance

### 1. Install the `ws` package

```
npm install ws
npm install -D @types/ws
```

Add to `package.json` scripts:
```json
"dev:mock": "tsx src/server/mock-ais.ts"
```

### 2. Create the mock server (`src/server/mock-ais.ts`)

Create the `src/server/` directory. The mock server is a single standalone file.

**Configuration (from environment variables with defaults):**
```typescript
const PORT = parseInt(process.env.MOCK_AIS_PORT ?? "9090", 10);
const MESSAGE_RATE = parseInt(process.env.MOCK_MESSAGE_RATE ?? "10", 10); // messages per second
const VESSEL_COUNT = parseInt(process.env.MOCK_VESSEL_COUNT ?? "25", 10);
```

**Vessel route generation:**

Import `TEST_PORTS` from `@/data/test-markers` (the path alias works with `tsx`). Generate `VESSEL_COUNT` synthetic vessels, each assigned a route between two random ports from `TEST_PORTS`:

```typescript
interface MockVessel {
  mmsi: string;           // 9-digit string, e.g., "200000001"
  name: string;           // Generated name, e.g., "MOCK VESSEL 01"
  shipType: number;       // Random: 70-79 (cargo) or 80-89 (tanker)
  callSign: string;       // e.g., "MV01"
  imo: number;            // e.g., 1000001
  originIndex: number;    // Index into TEST_PORTS for origin
  destIndex: number;      // Index into TEST_PORTS for destination
  progress: number;       // 0.0 to 1.0 along route
  speed: number;          // Knots (8-20 range)
}
```

For each vessel:
- Generate an MMSI in the range `200000001` to `200000000 + VESSEL_COUNT`
- Pick a random origin and destination port (must be different)
- Set initial progress to a random value between 0 and 1 (so vessels start spread along routes)
- Set speed to a random value between 8 and 20 knots

**Great-circle interpolation (server-side, no Three.js dependency):**

Implement a lightweight spherical interpolation function that does NOT depend on Three.js (which is a browser/rendering library). Use pure math:

```typescript
/**
 * Interpolate a point along the great circle between two lat/lon positions.
 * @param lat1, lon1 - Origin in degrees
 * @param lat2, lon2 - Destination in degrees
 * @param t - Progress from 0.0 (origin) to 1.0 (destination)
 * @returns [lat, lon] in degrees
 */
function greatCircleInterpolate(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  t: number
): [number, number] {
  // Convert to radians
  const phi1 = lat1 * Math.PI / 180;
  const lam1 = lon1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const lam2 = lon2 * Math.PI / 180;

  // Central angle via Haversine
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((phi2 - phi1) / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin((lam2 - lam1) / 2) ** 2
  ));

  if (d < 1e-10) return [lat1, lon1]; // Same point

  const a = Math.sin((1 - t) * d) / Math.sin(d);
  const b = Math.sin(t * d) / Math.sin(d);

  const x = a * Math.cos(phi1) * Math.cos(lam1) + b * Math.cos(phi2) * Math.cos(lam2);
  const y = a * Math.cos(phi1) * Math.sin(lam1) + b * Math.cos(phi2) * Math.sin(lam2);
  const z = a * Math.sin(phi1) + b * Math.sin(phi2);

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
  const lon = Math.atan2(y, x) * 180 / Math.PI;

  return [lat, lon];
}
```

**Bearing calculation (for COG/heading):**

```typescript
/**
 * Calculate initial bearing from point 1 to point 2 in degrees (0-359).
 */
function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const dLam = (lon2 - lon1) * Math.PI / 180;

  const y = Math.sin(dLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) -
            Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);

  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}
```

**Vessel position update tick:**

Create an update function that advances each vessel's `progress` by a small increment each tick. When `progress >= 1.0`, assign a new random destination (different from current destination, using current destination as new origin) and reset progress to 0. This creates continuous voyages.

The increment per tick should be based on the vessel's speed and the great-circle distance between origin and destination:

```typescript
// Approximate: 1 knot = 1 nautical mile/hour = 1.852 km/hour
// Earth radius ~ 6371 km
// For a tick every (1000 / MESSAGE_RATE) ms:
const tickIntervalMs = 1000 / MESSAGE_RATE;
// Distance in radians for the route:
const routeDistanceRad = centralAngle(origin, dest);
const routeDistanceNm = routeDistanceRad * (180 / Math.PI) * 60; // nautical miles
const hoursPerTick = tickIntervalMs / 3_600_000;
const progressPerTick = (vessel.speed * hoursPerTick) / routeDistanceNm;
```

To make movement visually perceptible in development, scale the speed up by a time-acceleration factor (e.g., 100x). Expose this as `MOCK_TIME_SCALE` environment variable (default: 100). This means a vessel moving at 15 knots effectively moves at 1500 knots in simulation time, covering a transpacific route in minutes rather than days.

**Message generation:**

On each tick, pick one vessel (round-robin or random) and generate either a `PositionReport` or `ShipStaticData` message for it. The ratio should be approximately 80% position reports to 20% static data reports, mimicking real AIS traffic patterns.

**Building a `PositionReport` envelope:**

```typescript
function buildPositionEnvelope(vessel: MockVessel, lat: number, lon: number, bearingDeg: number): AISStreamEnvelope {
  const mmsiNum = parseInt(vessel.mmsi, 10);
  return {
    MessageType: "PositionReport",
    Message: {
      PositionReport: {
        Cog: Math.round(bearingDeg * 10),       // 1/10 degree integer
        CommunicationState: 0,
        Latitude: lat,
        Longitude: lon,
        MessageID: 1,
        NavigationalStatus: 0,                   // Under way using engine
        PositionAccuracy: true,
        Raim: false,
        RateOfTurn: 0,
        RepeatIndicator: 0,
        Sog: Math.round(vessel.speed * 10),      // 1/10 knot integer
        Spare: 0,
        SpecialManoeuvreIndicator: 0,
        Timestamp: new Date().getUTCSeconds(),
        TrueHeading: Math.round(bearingDeg),
        UserID: mmsiNum,
        Valid: true,
      },
    },
    MetaData: {
      MMSI: mmsiNum,
      MMSI_String: vessel.mmsi,
      ShipName: vessel.name,
      latitude: lat,
      longitude: lon,
      time_utc: new Date().toISOString(),
    },
  };
}
```

**Building a `ShipStaticData` envelope:**

```typescript
function buildStaticEnvelope(vessel: MockVessel): AISStreamEnvelope {
  const mmsiNum = parseInt(vessel.mmsi, 10);
  const destPort = TEST_PORTS[vessel.destIndex];
  return {
    MessageType: "ShipStaticData",
    Message: {
      ShipStaticData: {
        AisVersion: 2,
        CallSign: vessel.callSign,
        Destination: destPort.name.toUpperCase(),
        Dimension: { A: 200, B: 50, C: 20, D: 20 },
        Dte: 0,
        Eta: { Month: 3, Day: 15, Hour: 14, Minute: 0 },
        FixType: 1,
        ImoNumber: vessel.imo,
        MaximumStaticDraught: 120,                // 12.0 meters in 1/10 meter
        MessageID: 5,
        Name: vessel.name,
        RepeatIndicator: 0,
        Spare: false,
        Type: vessel.shipType,
        UserID: mmsiNum,
        Valid: true,
      },
    },
    MetaData: {
      MMSI: mmsiNum,
      MMSI_String: vessel.mmsi,
      ShipName: vessel.name,
      latitude: 0,      // Static data doesn't carry position in MetaData reliably
      longitude: 0,
      time_utc: new Date().toISOString(),
    },
  };
}
```

### 3. WebSocket server protocol

**Server setup:**

```typescript
import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: PORT });
console.log(`Mock AIS server listening on ws://localhost:${PORT}`);
```

**Connection handling:**

When a client connects:
1. Wait for the first message (should be an `AISStreamSubscription` JSON).
2. Parse it and log the subscription details (bounding boxes, message types). The mock server does NOT enforce bounding box filtering -- it sends all generated vessels regardless. This simplifies the mock while still exercising the subscription protocol.
3. Start a per-client interval that sends messages at the configured rate.
4. On client disconnect, clear the interval.

```typescript
wss.on("connection", (ws: WebSocket) => {
  console.log("Client connected");
  let subscribed = false;
  let messageInterval: ReturnType<typeof setInterval> | null = null;

  ws.on("message", (data: Buffer) => {
    if (!subscribed) {
      try {
        const sub = JSON.parse(data.toString());
        console.log(`Subscription received: ${sub.BoundingBoxes?.length ?? 0} bounding boxes`);
        subscribed = true;

        // Start streaming messages
        let vesselIndex = 0;
        messageInterval = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) return;

          // Advance the current vessel
          updateVessel(vessels[vesselIndex]);

          // Generate message (80% position, 20% static)
          const envelope = Math.random() < 0.8
            ? buildPositionEnvelope(vessels[vesselIndex], ...)
            : buildStaticEnvelope(vessels[vesselIndex]);

          ws.send(JSON.stringify(envelope));

          vesselIndex = (vesselIndex + 1) % vessels.length;
        }, 1000 / MESSAGE_RATE);
      } catch {
        console.error("Invalid subscription message");
      }
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    if (messageInterval) clearInterval(messageInterval);
  });
});
```

**Graceful shutdown:**

Handle `SIGINT` and `SIGTERM` to close the WebSocket server cleanly. This is important for the smoke test which starts and stops the server programmatically.

```typescript
function shutdown() {
  console.log("Shutting down mock AIS server...");
  wss.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
```

### 4. Export a `startMockServer` function for testing

In addition to the top-level code that runs when the file is executed directly, export a function that starts the server and returns a handle for programmatic control:

```typescript
export interface MockServerHandle {
  port: number;
  close: () => Promise<void>;
}

export function startMockServer(options?: {
  port?: number;
  messageRate?: number;
  vesselCount?: number;
  timeScale?: number;
}): MockServerHandle {
  // ... create WebSocketServer and return handle
}
```

Use a conditional at the bottom of the file to auto-start only when run directly:

```typescript
// Auto-start when run as a script (not imported as a module)
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isMainModule) {
  startMockServer({ port: PORT, messageRate: MESSAGE_RATE, vesselCount: VESSEL_COUNT, timeScale: TIME_SCALE });
}
```

Alternatively, use a simpler detection pattern. The key requirement is that `import { startMockServer } from "./mock-ais"` does NOT auto-start the server.

### 5. Write the smoke test (`src/server/__tests__/mock-ais.test.ts`)

This test starts the mock server programmatically, connects a WebSocket client, sends a subscription, collects a few messages, validates them, then shuts down.

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import WebSocket from "ws";
import { startMockServer, type MockServerHandle } from "../mock-ais";
import { parsePositionReport, parseShipStaticData } from "@/lib/ais";
import type { AISStreamEnvelope, AISStreamSubscription } from "@/lib/ais";

describe("Mock AIS Server", () => {
  let server: MockServerHandle;
  const TEST_PORT = 19090; // Use non-standard port to avoid conflicts

  beforeAll(() => {
    server = startMockServer({
      port: TEST_PORT,
      messageRate: 50,    // Fast for testing
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
        const sub: AISStreamSubscription = {
          APIKey: "test-key",
          BoundingBoxes: [[[-90, -180], [90, 180]]],
          FilterMessageTypes: ["PositionReport", "ShipStaticData"],
        };
        ws.send(JSON.stringify(sub));
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

    // Verify we got messages
    expect(messages.length).toBeGreaterThanOrEqual(10);

    // Verify every message has the required envelope structure
    for (const msg of messages) {
      expect(msg).toHaveProperty("MessageType");
      expect(msg).toHaveProperty("Message");
      expect(msg).toHaveProperty("MetaData");
      expect(msg.MetaData).toHaveProperty("MMSI");
      expect(msg.MetaData).toHaveProperty("MMSI_String");
      expect(typeof msg.MetaData.MMSI_String).toBe("string");
    }

    // Verify position reports parse correctly
    const positionMessages = messages.filter(m => m.MessageType === "PositionReport");
    expect(positionMessages.length).toBeGreaterThan(0);
    for (const msg of positionMessages) {
      const parsed = parsePositionReport(msg);
      expect(parsed).not.toBeNull();
      expect(parsed!.lat).toBeGreaterThanOrEqual(-90);
      expect(parsed!.lat).toBeLessThanOrEqual(90);
      expect(parsed!.lon).toBeGreaterThanOrEqual(-180);
      expect(parsed!.lon).toBeLessThanOrEqual(180);
    }

    // Verify static data messages parse correctly (may not appear in 10 messages with 80/20 ratio)
    const staticMessages = messages.filter(m => m.MessageType === "ShipStaticData");
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
          ws.send(JSON.stringify({
            APIKey: "test-key",
            BoundingBoxes: [[[-90, -180], [90, 180]]],
          }));
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

  it("streams messages with valid coordinate progression", async () => {
    // Collect multiple messages for the same MMSI and verify position changes
    const positionsByMmsi = new Map<string, Array<{ lat: number; lon: number }>>();

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
      const timeout = setTimeout(() => {
        ws.close();
        resolve(); // Resolve even on timeout -- we may have enough data
      }, 3000);

      ws.on("open", () => {
        ws.send(JSON.stringify({
          APIKey: "test-key",
          BoundingBoxes: [[[-90, -180], [90, 180]]],
        }));
      });

      ws.on("message", (data: Buffer) => {
        const envelope = JSON.parse(data.toString()) as AISStreamEnvelope;
        if (envelope.MessageType === "PositionReport") {
          const parsed = parsePositionReport(envelope);
          if (parsed) {
            const positions = positionsByMmsi.get(parsed.mmsi) ?? [];
            positions.push({ lat: parsed.lat, lon: parsed.lon });
            positionsByMmsi.set(parsed.mmsi, positions);
          }
        }

        // Collect enough for each vessel to appear multiple times
        let totalPositions = 0;
        for (const positions of positionsByMmsi.values()) {
          totalPositions += positions.length;
        }
        if (totalPositions >= 30) {
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

    // Verify coordinates are within valid ranges
    for (const [, positions] of positionsByMmsi) {
      for (const pos of positions) {
        expect(pos.lat).toBeGreaterThanOrEqual(-90);
        expect(pos.lat).toBeLessThanOrEqual(90);
        expect(pos.lon).toBeGreaterThanOrEqual(-180);
        expect(pos.lon).toBeLessThanOrEqual(180);
      }
    }
  });
});
```

### 6. Ensure main-module detection works correctly

The `tsx` runtime supports ESM. A reliable way to detect whether the file is the entry point:

```typescript
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMain) {
  const handle = startMockServer({ port: PORT, messageRate: MESSAGE_RATE, vesselCount: VESSEL_COUNT, timeScale: TIME_SCALE });
  console.log(`Mock AIS server listening on ws://localhost:${handle.port}`);
  console.log(`  Vessels: ${VESSEL_COUNT}, Rate: ${MESSAGE_RATE} msg/s, Time scale: ${TIME_SCALE}x`);
}
```

## Edge Cases

- **Two ports picked as same origin/destination**: When randomly assigning routes, ensure origin and destination are different indices in `TEST_PORTS`. If `TEST_PORTS` has only 1 entry (unlikely but defensive), log a warning and use a straight-line route.
- **Route completion and reassignment**: When `progress >= 1.0`, the vessel's current destination becomes its new origin, and a new random destination is selected. This creates continuous multi-leg voyages that keep vessels moving indefinitely.
- **Client disconnects mid-stream**: The `setInterval` callback must check `ws.readyState === WebSocket.OPEN` before sending. The `close` handler must clear the interval. No error should be thrown.
- **No subscription message sent**: If a client connects but never sends a subscription, the server should not stream messages. It waits indefinitely for the first message.
- **Invalid subscription JSON**: If the first message is not valid JSON, log the error and do not start streaming. Do not crash the server.
- **Port already in use**: If the configured port is already bound, `WebSocketServer` will emit an error. Let it propagate naturally (crash with error message). The smoke test uses a non-standard port (19090) to avoid conflicts with any concurrent mock server instance.
- **Vessel count larger than port pair combinations**: With 6 ports, there are 30 unique directed routes. If `VESSEL_COUNT > 30`, multiple vessels will share routes. This is acceptable and realistic.
- **Longitude wrapping**: The great-circle interpolation math handles longitude correctly via the Haversine formula. No special wrapping logic is needed.
- **MetaData latitude/longitude for ShipStaticData**: Real AISStream.io sometimes sends 0/0 for position in static data MetaData. The mock should use the vessel's current position for PositionReport MetaData but can use 0/0 for ShipStaticData MetaData, matching real-world behavior.

## Files Affected

- `package.json` -- Add `ws` to `dependencies`, `@types/ws` to `devDependencies`, add `"dev:mock"` script
- `src/server/mock-ais.ts` -- New file: standalone mock AIS WebSocket server
- `src/server/__tests__/mock-ais.test.ts` -- New file: smoke test for mock server protocol

---

## Post-Completion Checklist

**Complete ALL steps before signaling `[COMPLETE:leg]`:**

- [ ] All acceptance criteria verified
- [ ] Tests passing
- [ ] Update flight-log.md with leg progress entry
- [ ] Set this leg's status to `completed` (in this file's header)
- [ ] Check off this leg in flight.md
- [ ] If final leg of flight:
  - [ ] Update flight.md status to `landed`
  - [ ] Check off flight in mission.md
- [ ] Commit all changes together (code + artifacts)
