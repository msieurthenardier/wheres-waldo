# Leg: 02-websocket-relay-server

**Status**: completed
**Flight**: [AIS Data Pipeline](../flight.md)

## Objective

Create the custom Next.js server entry point that wraps the standalone HTTP server with WebSocket upgrade handling, implements an upstream AIS connection manager with exponential backoff reconnection, and exposes a downstream `/ws/ais` endpoint that pushes vessel updates to connected browser clients.

## Context

- **Design decisions from flight**: "A single `server.ts` file creates an HTTP server, attaches Next.js request handling, and upgrades WebSocket connections on a specific path (e.g., `/ws/ais`). This keeps the deployment as a single Docker container with one process. The `ws` library (lightweight, mature, zero dependencies) handles WebSocket upgrades." The relay connects to either the mock server or AISStream.io via the `AIS_UPSTREAM_URL` environment variable, making the upstream source configurable.
- **How this fits**: This is the central piece of the real-time pipeline. Leg 00 built the data layer (types, parser, store). Leg 01 built the mock upstream. This leg connects them: the relay server consumes upstream AIS data, maintains the in-memory VesselStore, and fans out updates to downstream browser clients. Leg 03 (frontend hook) will connect to the `/ws/ais` endpoint exposed here.
- **Learnings from Leg 00**: The `VesselStore` class handles TTL-based eviction and NaN-safe delta detection. The `updatePosition()` method returns `true` only when position data actually changed, enabling the relay to avoid pushing redundant updates downstream. The parser functions (`parsePositionReport`, `parseShipStaticData`) return `null` for malformed messages, so the relay must handle nulls gracefully.
- **Learnings from Leg 01**: The mock server exports `startMockServer()` for programmatic control, which the integration test will use. The mock implements the AISStream.io subscription protocol: the client connects, sends a JSON `AISStreamSubscription` message, and the server begins streaming `AISStreamEnvelope` messages. The relay must implement the client side of this protocol for its upstream connection.
- **Next.js standalone output**: `next.config.ts` conditionally produces `standalone` output (when not building for GitHub Pages). The standalone output creates a `server.js` at `.next/standalone/server.js` that can be wrapped by a custom server. In development, the relay uses `next()` from the `next` package directly.
- **Existing dependencies**: `ws` is already in `dependencies`, `@types/ws` in `devDependencies`, `tsx` in `devDependencies`. No new packages are needed.

## Inputs

What exists before this leg runs:
- `package.json` -- `ws` in dependencies, `tsx` in devDependencies, `dev:mock` script
- `src/lib/ais/types.ts` -- `AISStreamSubscription`, `AISStreamEnvelope`, `VesselPosition`, `VesselStatic`, `VesselRecord`
- `src/lib/ais/parser.ts` -- `parsePositionReport`, `parseShipStaticData`
- `src/lib/ais/store.ts` -- `VesselStore` class with `updatePosition`, `updateStatic`, `getAll`, `evictStale`
- `src/lib/ais/index.ts` -- Barrel exports
- `src/server/mock-ais.ts` -- `startMockServer()` function for programmatic control
- `vitest.config.ts` -- Vitest configured with `@/*` path alias
- `next.config.ts` -- `output: "standalone"` when not GitHub Pages

## Outputs

What exists after this leg completes:
- `src/server/index.ts` -- Custom server entry point (HTTP server + Next.js handler + WebSocket upgrade)
- `src/server/upstream.ts` -- Upstream AIS connection manager with exponential backoff
- `src/server/downstream.ts` -- Downstream `/ws/ais` WebSocket endpoint manager
- `src/server/__tests__/relay.test.ts` -- Integration test: mock server -> relay -> test client
- `package.json` -- New `"dev:server"` script added

## Acceptance Criteria

- [ ] `src/server/index.ts` exists and creates an HTTP server that delegates to Next.js for normal HTTP requests
- [ ] The HTTP server upgrades WebSocket connections on the `/ws/ais` path and rejects upgrades on other paths
- [ ] `src/server/upstream.ts` exports an `UpstreamManager` class that connects to the URL specified by `AIS_UPSTREAM_URL` environment variable
- [ ] The upstream connection sends a valid `AISStreamSubscription` message on connect (with `AISSTREAM_API_KEY` and configured bounding boxes)
- [ ] Incoming upstream messages are parsed via `parsePositionReport`/`parseShipStaticData` and fed into a shared `VesselStore`
- [ ] The upstream connection implements exponential backoff reconnection (1s, 2s, 4s, 8s, max 30s) on disconnect or error, resetting on successful connection
- [ ] `src/server/downstream.ts` exports a `DownstreamManager` class that manages browser WebSocket connections on `/ws/ais`
- [ ] When the VesselStore receives a delta update (position changed), the downstream manager broadcasts the updated `VesselPosition` as JSON to all connected clients
- [ ] New downstream clients receive a full snapshot of all current vessel positions on connect (initial sync)
- [ ] A `"dev:server"` script exists in `package.json` that runs `tsx --watch src/server/index.ts`
- [ ] `AIS_UPSTREAM_URL` defaults to `ws://localhost:9090` when not set (pointing at the mock server)
- [ ] The stale vessel eviction timer runs periodically (every 60 seconds) and removes vessels exceeding the TTL
- [ ] The integration test starts the mock server, starts the relay, connects a test WebSocket client to `/ws/ais`, and verifies it receives valid `VesselPosition` JSON messages
- [ ] `npx vitest run` passes all tests (existing Leg 00/01 tests + new relay integration test)
- [ ] `npx tsc --noEmit` reports zero TypeScript errors

## Verification Steps

1. Run `npm run dev:mock` in one terminal -- mock AIS server starts on port 9090
2. Run `npm run dev:server` in another terminal -- custom server starts, logs upstream connection to mock server, Next.js app available on port 3000
3. Open `ws://localhost:3000/ws/ais` in a WebSocket client (e.g., `wscat`) -- receive JSON vessel position messages
4. Kill the mock server -- relay logs reconnection attempts with increasing delays
5. Restart the mock server -- relay reconnects automatically and resumes pushing updates
6. Run `npx vitest run` -- all tests pass (Leg 00 + Leg 01 + relay integration test)
7. Run `npx tsc --noEmit` -- no TypeScript errors

## Implementation Guidance

### 1. Create the upstream connection manager (`src/server/upstream.ts`)

This module manages the persistent WebSocket connection to the AIS data source (mock server or AISStream.io).

**Configuration constants:**

```typescript
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;
const EVICTION_INTERVAL_MS = 60_000;
```

**Bounding boxes for AIS subscription** (from flight spec):

```typescript
const AIS_BOUNDING_BOXES: [number, number][][] = [
  [[ 0, 100], [45, 145]],    // East Asia / Western Pacific
  [[-10,  95], [10, 120]],   // Southeast Asia / Malacca Strait
  [[-35,  40], [25, 100]],   // Indian Ocean
  [[ 25,  30], [45,  45]],   // Suez / Mediterranean
  [[  0, -80], [55,   0]],   // Atlantic
  [[ 25,-130], [50,-115]],   // US West Coast
];
```

**UpstreamManager class:**

```typescript
import WebSocket from "ws";
import {
  VesselStore,
  parsePositionReport,
  parseShipStaticData,
  type AISStreamSubscription,
  type AISStreamEnvelope,
} from "@/lib/ais";

export interface UpstreamEvents {
  onPositionUpdate?: (position: VesselPosition) => void;
  onStaticUpdate?: (staticData: VesselStatic) => void;
}

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
  }) { ... }

  /** Start the upstream connection and eviction timer */
  connect(): void { ... }

  /** Cleanly shut down the upstream connection */
  close(): void { ... }

  private handleMessage(data: Buffer): void { ... }
  private scheduleReconnect(): void { ... }
}
```

**Connection lifecycle:**

1. `connect()` creates a new `WebSocket(this.url)`.
2. On `open`: send the `AISStreamSubscription` JSON (with `this.apiKey`, `AIS_BOUNDING_BOXES`, and `FilterMessageTypes: ["PositionReport", "ShipStaticData"]`). Reset `this.backoffMs` to `INITIAL_BACKOFF_MS`. Log the connection.
3. On `message`: parse the raw data as JSON into an `AISStreamEnvelope`. Attempt `parsePositionReport` -- if non-null, call `store.updatePosition()`. If the update returns `true` (delta detected), invoke `events.onPositionUpdate?.(position)`. Otherwise attempt `parseShipStaticData` -- if non-null, call `store.updateStatic()`. If the update returns `true`, invoke `events.onStaticUpdate?.(staticData)`.
4. On `close` or `error`: if not `this.closed`, call `scheduleReconnect()`.
5. `scheduleReconnect()`: log the backoff delay, set a timer for `this.backoffMs`, then call `connect()`. Multiply `this.backoffMs` by `BACKOFF_MULTIPLIER`, capping at `MAX_BACKOFF_MS`.
6. `close()`: set `this.closed = true`, clear the reconnect timer, clear the eviction timer, close the WebSocket if open.

**Stale eviction timer:**

Start a `setInterval` in `connect()` (only once, guard with a flag or check) that calls `this.store.evictStale()` every `EVICTION_INTERVAL_MS`. Log the count of evicted vessels if > 0.

**API key handling:**

The `apiKey` is read from environment variable `AISSTREAM_API_KEY`. When connecting to the mock server, the API key value does not matter (mock accepts anything), but the field must be present in the subscription message. Default to `"mock"` if the environment variable is not set, and log a warning that no real API key is configured.

### 2. Create the downstream WebSocket manager (`src/server/downstream.ts`)

This module manages browser WebSocket connections on the `/ws/ais` path.

```typescript
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Duplex } from "stream";
import type { VesselPosition, VesselStatic, VesselStore } from "@/lib/ais";

export class DownstreamManager {
  private wss: WebSocketServer;
  private store: VesselStore;

  constructor(store: VesselStore) {
    // Create WebSocketServer in "noServer" mode — upgrades are handled externally
    this.wss = new WebSocketServer({ noServer: true });
    this.store = store;

    this.wss.on("connection", (ws: WebSocket) => {
      // Send initial snapshot of all vessel positions
      this.sendSnapshot(ws);
    });
  }

  /** Handle HTTP upgrade requests for /ws/ais */
  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit("connection", ws, request);
    });
  }

  /** Broadcast a vessel position update to all connected clients */
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

  /** Broadcast vessel static data to all connected clients */
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

  /** Send a full snapshot of all current vessel positions to a single client */
  private sendSnapshot(ws: WebSocket): void {
    const vessels = this.store.getAll();
    const positions: VesselPosition[] = [];
    for (const [, record] of vessels) {
      if (record.position) {
        positions.push(record.position);
      }
    }
    ws.send(JSON.stringify({
      type: "snapshot",
      data: positions,
    }));
  }

  /** Get count of connected clients */
  get clientCount(): number {
    return this.wss.clients.size;
  }

  /** Shut down the downstream WebSocket server */
  close(): Promise<void> {
    return new Promise((resolve) => {
      for (const client of this.wss.clients) {
        client.terminate();
      }
      this.wss.close(() => resolve());
    });
  }
}
```

**Message protocol to browser clients:**

The downstream sends JSON messages with a `type` discriminator:

- `{ type: "snapshot", data: VesselPosition[] }` -- Sent once on client connect with all current vessel positions.
- `{ type: "position", data: VesselPosition }` -- Sent per vessel when its position changes (delta update).
- `{ type: "static", data: VesselStatic }` -- Sent when new static data arrives for a vessel.

This protocol gives the frontend hook (Leg 03) a clean contract to code against.

### 3. Create the custom server entry point (`src/server/index.ts`)

This is the main entry point that ties everything together.

```typescript
import { createServer } from "http";
import next from "next";
import { parse } from "url";
import { VesselStore } from "@/lib/ais";
import { UpstreamManager } from "./upstream";
import { DownstreamManager } from "./downstream";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);
const upstreamUrl = process.env.AIS_UPSTREAM_URL ?? "ws://localhost:9090";
const apiKey = process.env.AISSTREAM_API_KEY ?? "mock";

async function main() {
  // Initialize Next.js
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  // Shared vessel store
  const store = new VesselStore();

  // Downstream WebSocket manager (noServer mode)
  const downstream = new DownstreamManager(store);

  // Create HTTP server
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  // Handle WebSocket upgrades
  server.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url ?? "/", true);

    if (pathname === "/ws/ais") {
      downstream.handleUpgrade(request, socket, head);
    } else {
      // Reject WebSocket upgrades on other paths
      socket.destroy();
    }
  });

  // Start upstream AIS connection
  const upstream = new UpstreamManager({
    store,
    url: upstreamUrl,
    apiKey,
    events: {
      onPositionUpdate: (position) => downstream.broadcastPosition(position),
      onStaticUpdate: (staticData) => downstream.broadcastStatic(staticData),
    },
  });

  // Start listening
  server.listen(port, () => {
    console.log(`> Server listening on http://${hostname}:${port}`);
    console.log(`> WebSocket endpoint: ws://${hostname}:${port}/ws/ais`);
    console.log(`> Upstream AIS: ${upstreamUrl}`);
    if (apiKey === "mock") {
      console.log(`> WARNING: No AISSTREAM_API_KEY set — using mock key`);
    }
  });

  // Connect upstream after server is listening
  upstream.connect();

  // Graceful shutdown
  const shutdown = () => {
    console.log("Shutting down...");
    upstream.close();
    downstream.close().then(() => {
      server.close(() => process.exit(0));
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
```

**Key design points:**

- `next({ dev })` creates the Next.js app. In development (`dev: true`), it enables hot module reload. In production, it serves the built application.
- The HTTP server delegates all normal requests to Next.js via `handle(req, res, parsedUrl)`.
- The `upgrade` event fires for all WebSocket upgrade requests. Only `/ws/ais` is accepted; all others are destroyed.
- The `UpstreamManager` and `DownstreamManager` share the same `VesselStore` instance.
- The upstream events callback bridges the two managers: when the upstream receives a delta, it triggers a downstream broadcast.

### 4. Add the `dev:server` npm script

Add to `package.json` scripts:

```json
"dev:server": "tsx --watch src/server/index.ts"
```

The `--watch` flag makes `tsx` restart the server when source files change, providing a development experience similar to `next dev`.

### 5. Write the integration test (`src/server/__tests__/relay.test.ts`)

This test verifies the full pipeline: mock server -> relay -> browser client.

```typescript
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
  const MOCK_PORT = 19091;    // Different from mock-ais.test.ts to avoid conflicts
  const RELAY_PORT = 19092;

  beforeAll(async () => {
    // Start mock AIS server
    mockServer = startMockServer({
      port: MOCK_PORT,
      messageRate: 50,
      vesselCount: 5,
      timeScale: 100,
    });

    // Set up relay components
    const store = new VesselStore();
    downstream = new DownstreamManager(store);

    // Create a minimal HTTP server (no Next.js needed for testing)
    relayHttpServer = createServer();
    relayHttpServer.on("upgrade", (request, socket, head) => {
      const url = new URL(request.url ?? "/", `http://localhost:${RELAY_PORT}`);
      if (url.pathname === "/ws/ais") {
        downstream.handleUpgrade(request, socket, head);
      } else {
        socket.destroy();
      }
    });

    await new Promise<void>((resolve) => {
      relayHttpServer.listen(RELAY_PORT, resolve);
    });

    // Start upstream connection to mock server
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
    await new Promise<void>((resolve) => relayHttpServer.close(() => resolve()));
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

        // Wait for snapshot + at least a few position updates
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
    // Wait a moment to accumulate some vessels in the store
    await new Promise((resolve) => setTimeout(resolve, 300));

    const snapshot = await new Promise<{ type: string; data: VesselPosition[] }>((resolve, reject) => {
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
    // After 500ms+ of 50 msg/s from 5 vessels, store should have some vessels
    expect(snapshot.data.length).toBeGreaterThan(0);
  });

  it("rejects WebSocket upgrades on non /ws/ais paths", async () => {
    await expect(
      new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`ws://localhost:${RELAY_PORT}/ws/other`);
        const timeout = setTimeout(() => {
          ws.close();
          resolve(); // If nothing happens, that's also acceptable
        }, 2000);

        ws.on("open", () => {
          clearTimeout(timeout);
          ws.close();
          reject(new Error("Should not have connected on /ws/other"));
        });

        ws.on("error", () => {
          clearTimeout(timeout);
          resolve(); // Expected: connection refused/destroyed
        });
      })
    ).resolves.toBeUndefined();
  });
});
```

**Test design notes:**

- The integration test does NOT boot Next.js -- it creates a bare `http.createServer()` to keep the test fast and avoid pulling in the entire Next.js stack. The relay components (`UpstreamManager`, `DownstreamManager`, `VesselStore`) are the system under test.
- Port numbers (19091, 19092) are chosen to avoid conflicts with both the default mock server port (9090) and the mock-ais.test.ts test port (19090).
- The test verifies the full data flow: mock server generates AIS envelopes -> upstream manager parses them into the VesselStore -> downstream manager broadcasts position updates -> test client receives them.
- The snapshot test verifies that a newly connected client gets the current state immediately.
- The path rejection test verifies that only `/ws/ais` is accepted.

### 6. Upstream reconnection backoff

The exponential backoff implementation in `UpstreamManager.scheduleReconnect()`:

```typescript
private scheduleReconnect(): void {
  if (this.closed) return;
  if (this.reconnectTimer) return; // Already scheduled

  console.log(`Upstream disconnected. Reconnecting in ${this.backoffMs}ms...`);

  this.reconnectTimer = setTimeout(() => {
    this.reconnectTimer = null;
    this.connect();
  }, this.backoffMs);

  // Increase backoff for next attempt
  this.backoffMs = Math.min(this.backoffMs * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS);
}
```

On successful connection (`open` event), reset the backoff:

```typescript
this.backoffMs = INITIAL_BACKOFF_MS;
```

This ensures:
- First reconnect is after 1 second
- Subsequent reconnects double: 2s, 4s, 8s, 16s, 30s, 30s, ...
- A successful connection resets the backoff to 1 second for future disconnections

### 7. TypeScript module resolution considerations

The custom server runs under `tsx`, which supports TypeScript with path aliases from `tsconfig.json`. The `@/*` alias maps to `./src/*`, so imports like `@/lib/ais` work in server code.

Ensure that `upstream.ts` and `downstream.ts` use the same import style as existing server code (see `mock-ais.ts` which uses `@/data/test-markers` and `@/lib/ais/types`).

## Edge Cases

- **Upstream URL not reachable on startup**: The relay should not crash. The first `connect()` call will fail, triggering `scheduleReconnect()` with backoff. The server continues serving HTTP requests and accepts downstream WebSocket connections (which will receive empty snapshots until upstream data arrives).
- **Upstream sends non-JSON or malformed messages**: Wrap the `JSON.parse` call in a try/catch. Log the error and skip the message. Do not disconnect or crash.
- **Upstream sends message types other than PositionReport/ShipStaticData**: The parser functions return `null` for unrecognized message types. The relay should silently skip these.
- **No downstream clients connected**: The upstream connection should continue running and updating the VesselStore regardless. When a client eventually connects, it receives the current snapshot. Broadcasting to zero clients is a no-op (the `for` loop over `wss.clients` simply doesn't execute).
- **Downstream client disconnects during broadcast**: Check `client.readyState === WebSocket.OPEN` before sending. The `ws` library handles cleanup automatically. Do not let a single client error affect other clients.
- **Multiple downstream clients connecting simultaneously**: Each receives its own independent snapshot. Broadcasts go to all connected clients. The `WebSocketServer` handles concurrency.
- **AIS_UPSTREAM_URL points to real AISStream.io**: The subscription message uses `AISSTREAM_API_KEY` from the environment. If this key is `"mock"`, a warning is logged but the connection proceeds (the real AISStream.io will likely reject it, causing a reconnect loop -- this is expected behavior for development without a real key).
- **VesselStore grows unbounded**: The eviction timer (every 60s) removes vessels that haven't been updated within 15 minutes. This prevents memory growth in long-running sessions. The default TTL of 15 minutes is appropriate for AIS traffic where vessels report every few seconds.
- **Race condition: upstream message arrives before downstream is ready**: Not possible in this design because both are initialized before `upstream.connect()` is called. The `events.onPositionUpdate` callback is set at construction time.
- **Port 3000 already in use**: The server emits a standard `EADDRINUSE` error and crashes. This is expected behavior -- the developer should stop the conflicting process or use a different `PORT` environment variable.
- **Graceful shutdown ordering**: The shutdown handler closes upstream first (stops receiving new data), then downstream (terminates client connections), then the HTTP server. This prevents new connections during teardown.

## Files Affected

- `src/server/index.ts` -- New file: custom server entry point (HTTP + Next.js + WebSocket upgrade)
- `src/server/upstream.ts` -- New file: upstream AIS connection manager with exponential backoff
- `src/server/downstream.ts` -- New file: downstream `/ws/ais` WebSocket endpoint manager
- `src/server/__tests__/relay.test.ts` -- New file: integration test for the full relay pipeline
- `package.json` -- Add `"dev:server"` script

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
