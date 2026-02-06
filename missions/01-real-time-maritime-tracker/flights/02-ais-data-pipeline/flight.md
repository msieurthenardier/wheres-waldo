# Flight: AIS Data Pipeline

**Status**: in-flight
**Mission**: [Real-Time Maritime AI Supply Chain Tracker](../../mission.md)

## Contributing to Criteria

- [ ] Real-time vessel positions stream onto the globe from AIS data (AISStream.io WebSocket)
- [ ] All data sources are free-tier (no paid API subscriptions)
- [ ] The application is publicly deployable (Vercel/Cloudflare)

---

## Pre-Flight

### Objective

Build the real-time AIS data pipeline that connects AISStream.io's WebSocket API to the frontend globe. A Next.js custom server acts as a WebSocket relay: it maintains a persistent upstream connection to AISStream.io, parses and filters incoming AIS messages (PositionReport and ShipStaticData), maintains an in-memory vessel state store, and exposes a downstream WebSocket endpoint that the React frontend connects to. The frontend receives a live stream of vessel position updates and renders them on the globe using the existing Vessels component (replacing the hardcoded test data). A mock AIS server enables development and testing without requiring the live API key or network access.

### Open Questions

- [x] Backend architecture: WebSocket relay vs serverless? → see Design Decisions
- [x] How to handle AISStream.io connection drops and reconnection? → see Design Decisions
- [x] Should we filter AIS data server-side or send everything to the client? → see Design Decisions
- [x] How to integrate with Next.js (custom server vs separate process)? → see Design Decisions
- [x] How to expose the AIS API key safely? → see Design Decisions
- [x] What AIS message types do we need? → see Design Decisions

### Design Decisions

**Backend Architecture: Next.js Custom Server with WebSocket Relay (NOT serverless)**
- Rationale: AISStream.io requires a persistent WebSocket connection. Vercel serverless functions have a 10-second (free) / 60-second (pro) execution limit and do not support long-lived connections. The project already has a Docker-based deployment from Flight 01 using `output: 'standalone'`, which runs a persistent Node.js server. A custom server wrapping Next.js's HTTP server adds WebSocket upgrade handling with zero additional infrastructure.
- Trade-off: Cannot deploy the WebSocket relay to Vercel's serverless platform. The Docker deployment on Railway/Render/Fly.io becomes the primary deployment target. GitHub Pages static export continues to work for the demo (with test data fallback when no WebSocket server is available).

**Custom Server Approach: `server.ts` wrapping Next.js standalone output (NOT separate process)**
- Rationale: A single `server.ts` file creates an HTTP server, attaches Next.js request handling, and upgrades WebSocket connections on a specific path (e.g., `/ws/ais`). This keeps the deployment as a single Docker container with one process. The `ws` library (lightweight, mature, zero dependencies) handles WebSocket upgrades. No need for Socket.IO's overhead or abstraction.
- Trade-off: Requires a custom server entry point instead of `next start`. The Dockerfile already uses standalone output, so only the entrypoint command changes.

**AIS Data Filtering: Server-Side Geographic + Ship Type Filtering**
- Rationale: AISStream.io's global feed can produce thousands of messages per second. Sending all of them to every browser client would overwhelm both bandwidth and rendering. The server subscribes to AISStream.io with bounding boxes covering major AI supply chain shipping lanes (Pacific, Indian Ocean, Atlantic, key straits) and filters for ship types relevant to commodity transport (cargo: 70-79, tanker: 80-89). The in-memory vessel store deduplicates by MMSI and only pushes delta updates to clients.
- Trade-off: Clients only see vessels within the configured bounding boxes. This is acceptable because the mission specifically targets AI-critical commodity routes, not global coverage.

**AIS Message Types: PositionReport + ShipStaticData**
- Rationale: `PositionReport` (AIS types 1, 2, 3) provides lat, lon, COG, SOG, heading, navigational status, and MMSI — everything needed for real-time vessel positioning. `ShipStaticData` (AIS type 5) provides vessel name, call sign, IMO number, ship type code, dimensions, destination, and ETA — the static metadata needed for vessel identification and classification. Together they give us position + identity.
- Trade-off: Ignoring other message types (base station reports, safety messages, binary messages) means we miss some situational awareness data, but these are irrelevant to vessel tracking.

**Connection Resilience: Exponential Backoff Reconnection with Stale Vessel Eviction**
- Rationale: AISStream.io connections will drop (server maintenance, network issues, rate limiting). The relay server implements automatic reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s). Vessels that haven't sent a position update within a configurable TTL (default: 15 minutes) are evicted from the in-memory store. Clients receive a periodic heartbeat so they can detect server disconnection.
- Trade-off: During reconnection gaps, the globe shows stale positions that gradually age out. This is preferable to showing nothing or crashing.

**API Key Security: Server-Side Environment Variable (NOT exposed to client)**
- Rationale: The AISStream.io API key is used only in the server-side relay connection. It is read from `AISSTREAM_API_KEY` environment variable and never included in client bundles. The `.env.local` file stores it locally and is gitignored. Docker deployments pass it as a container environment variable.
- Trade-off: None. This is standard practice.

**Mock AIS Server: Local WebSocket Server Emitting Synthetic AIS Messages**
- Rationale: Flight 01 debrief recommends starting with mock data. A mock server generates synthetic AIS messages (ships moving along realistic routes between known ports) at configurable rates. This enables development without the real API key, deterministic testing, and demo scenarios. The mock server implements the same upstream WebSocket protocol as AISStream.io so the relay server can connect to either interchangeably via a URL environment variable.
- Trade-off: Mock data won't reveal real-world edge cases (malformed messages, extreme coordinates, AIS spoofing). These are handled by defensive parsing in the relay.

### Prerequisites

- [x] Node.js 20+ available (verified in Flight 01)
- [x] Docker available (verified in Flight 01)
- [ ] AISStream.io API key registered (free tier) — stored in `.env.local`
- [ ] `ws` npm package added to dependencies
- [ ] Next.js standalone output verified (already configured in Flight 01)

### Pre-Flight Checklist

- [x] All open questions resolved
- [x] Design decisions documented
- [ ] Prerequisites verified
- [x] Validation approach defined
- [x] Legs defined

---

## In-Flight

### Technical Approach

Build a layered real-time data pipeline with four distinct concerns:

1. **AIS Types & Parsing** (`src/lib/ais/`): TypeScript types for AIS messages (PositionReport, ShipStaticData), a parser that validates and normalizes raw AISStream.io JSON into typed objects, and a vessel state store that maintains the latest position and static data for each MMSI.

2. **Mock AIS Server** (`src/server/mock-ais.ts`): A standalone WebSocket server that emulates the AISStream.io protocol. Generates synthetic vessels moving along great-circle routes between known ports. Accepts the same subscription message format. Used for development and testing.

3. **WebSocket Relay Server** (`src/server/`): A custom Node.js HTTP server that wraps Next.js's request handler and adds WebSocket upgrade handling. On startup, it connects upstream to AISStream.io (or mock server via `AIS_UPSTREAM_URL` env var), subscribes with configured bounding boxes and message type filters, and maintains the in-memory vessel store. Downstream, it accepts browser WebSocket connections on `/ws/ais` and pushes vessel updates as JSON messages. Implements reconnection with exponential backoff, heartbeat pings, and stale vessel eviction.

4. **Frontend WebSocket Hook** (`src/hooks/useAISStream.ts`): A React hook that connects to the relay server's `/ws/ais` endpoint, receives vessel position updates, and maintains a reactive vessel state Map. Falls back to test data if the WebSocket connection fails (preserving the Flight 01 demo experience). The existing `Vessels` component is updated to consume live data from this hook instead of `TEST_VESSELS`.

**Key packages to add:**
- `ws` — WebSocket server and client for Node.js (relay server)
- `@types/ws` — TypeScript definitions (dev dependency)

**Bounding boxes for AI supply chain routes:**
- East Asia / Western Pacific: `[[0, 100], [45, 145]]` — Taiwan Strait, East China Sea, South Korea, Japan
- Southeast Asia / Malacca Strait: `[[-10, 95], [10, 120]]` — Singapore, Malacca Strait, Indonesia
- Indian Ocean: `[[-35, 40], [25, 100]]` — Indian Ocean, Cape of Good Hope route
- Suez / Mediterranean: `[[25, 30], [45, 45]]` — Suez Canal, Eastern Mediterranean
- Atlantic: `[[0, -80], [55, 0]]` — North and Central Atlantic shipping lanes
- US West Coast: `[[25, -130], [50, -115]]` — Los Angeles, Long Beach, Seattle

### Checkpoints

- [ ] AIS TypeScript types and message parser created with unit tests
- [ ] In-memory vessel state store implemented with TTL eviction
- [ ] Mock AIS server running and emitting synthetic vessel data
- [ ] Custom server boots Next.js + WebSocket relay on same port
- [ ] Relay connects to mock upstream, receives and stores vessel positions
- [ ] Frontend hook connects to relay, receives live vessel updates
- [ ] Globe renders live vessels from WebSocket (replacing test data)
- [ ] Relay connects to real AISStream.io with API key (manual verification)
- [ ] Docker container runs the custom server correctly

### Adaptation Criteria

**Divert if**:
- AISStream.io free tier has been discontinued or requires payment since last check
- The `ws` library has critical incompatibilities with Next.js standalone server
- AISStream.io rate-limits the free tier so aggressively that real-time streaming is impractical (< 1 message/second)

**Acceptable variations**:
- Adjust bounding box regions if initial coverage is too broad or too narrow
- Reduce downstream push frequency (batch updates every 500ms instead of per-message) if client performance suffers
- Use `setTimeout`-based reconnection instead of a full backoff library if the implementation is simpler
- Skip heartbeat pings initially if the basic connection is stable enough
- Defer stale vessel eviction to a later flight if the TTL logic adds too much complexity to the initial pipeline

### Legs

> **Note:** These are tentative suggestions, not commitments. Legs are planned and created one at a time as the flight progresses. This list will evolve based on discoveries during implementation.

- [x] `00-ais-types-and-parser` — Define TypeScript types for AISStream.io messages (PositionReport, ShipStaticData, subscription message, envelope). Implement a parser/normalizer that converts raw AISStream.io JSON to typed internal `VesselPosition` and `VesselStatic` objects. Implement the in-memory `VesselStore` class (Map keyed by MMSI, TTL-based eviction, delta detection). Write unit tests for parsing, normalization, and store operations. **No server code yet — pure library.** ⏱️ ~1.5 hours

- [x] `01-mock-ais-server` — Create a standalone mock AIS WebSocket server that implements the AISStream.io protocol (accepts subscription message, streams PositionReport and ShipStaticData messages). Generate synthetic vessels with realistic MMSI numbers moving along great-circle paths between ports from `test-markers.ts`. Configurable message rate (default: 10/second) and vessel count (default: 25). Runnable via `npx tsx src/server/mock-ais.ts`. Write a smoke test that connects and verifies message format. ⏱️ ~1.5 hours

- [x] `02-websocket-relay-server` — Create the custom Next.js server (`src/server/index.ts`) that wraps the standalone Next.js HTTP server with WebSocket upgrade handling. Implement the upstream AIS connection (connects to `AIS_UPSTREAM_URL`, sends subscription, receives messages, feeds into `VesselStore`). Implement the downstream `/ws/ais` endpoint (accepts browser connections, pushes vessel updates as JSON). Add exponential backoff reconnection for the upstream connection. Add `npm run dev:server` script using `tsx --watch`. Verify end-to-end: mock server → relay → browser client (using browser console or simple test page). ⏱️ ~2 hours

- [x] `03-frontend-ais-hook` — Create `useAISStream` React hook that connects to the relay's `/ws/ais` endpoint, maintains a `Map<string, VesselPosition>` of live vessel state, handles connection/disconnection/reconnection, and falls back to `TEST_VESSELS` data when WebSocket is unavailable. Export a `VesselDataProvider` context so multiple components can consume vessel data. Wire the existing `Vessels` component to read from the hook instead of the hardcoded import. Globe now renders live vessels when the relay is running, test vessels when it's not. ⏱️ ~1.5 hours

- [x] `04-live-ais-integration` — Configure the relay server with real AISStream.io bounding boxes covering AI supply chain routes. Add `AISSTREAM_API_KEY` to `.env.local` (gitignored). Connect to the real AISStream.io endpoint and verify live vessel data flows through to the globe. Tune bounding boxes and ship type filters based on observed data volume. Document the connection flow and any observed rate limits or data characteristics. Manual verification with screenshots. ⏱️ ~1 hour

- [ ] `05-docker-and-scripts` — Update the Dockerfile to use the custom server entrypoint instead of `next start`. Add/update npm scripts: `dev:server` (custom server with hot reload), `dev:mock` (mock AIS server), `start` (production custom server). Update `docker-compose.yml` to pass `AISSTREAM_API_KEY` and `AIS_UPSTREAM_URL` as environment variables. Verify `docker compose up` runs the full pipeline. Update any configuration documentation. ⏱️ ~1 hour

---

## Post-Flight

### Completion Checklist

- [ ] All legs completed
- [ ] Code merged
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Flight debrief completed

### Verification

1. `npm run dev:mock` starts the mock AIS server on a configurable port
2. `npm run dev:server` starts the custom Next.js server with WebSocket relay, connecting to the mock upstream
3. Opening the browser shows the globe with vessels that update positions in real time (not static test data)
4. Stopping the mock server causes the frontend to fall back to test data gracefully (no crash, no blank screen)
5. Setting `AISSTREAM_API_KEY` in `.env.local` and `AIS_UPSTREAM_URL=wss://stream.aisstream.io/v0/stream` connects to real AIS data (manual verification)
6. `docker compose up` builds and runs the full pipeline with environment variables passed through
7. The relay server reconnects automatically after simulated upstream disconnection
8. Unit tests pass for AIS message parsing, vessel store, and mock server protocol
