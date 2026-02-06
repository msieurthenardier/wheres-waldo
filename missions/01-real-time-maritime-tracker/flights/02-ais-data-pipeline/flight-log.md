# Flight Log: AIS Data Pipeline

**Flight**: [AIS Data Pipeline](flight.md)

## Summary

Flight 02 establishes the real-time AIS data pipeline connecting AISStream.io's WebSocket API to the frontend globe via a custom Next.js server relay. This log will be updated as legs are executed.

---

## Leg Progress

### Leg 00: AIS Types and Parser
- **Status**: completed
- **Started**: 2026-02-06
- **Completed**: 2026-02-06
- **Summary**: Implemented AIS type definitions (AISStream.io raw types + internal domain types), parser/normalizer functions (parsePositionReport, parseShipStaticData) with AIS sentinel value handling and @ padding stripping, and VesselStore class with TTL-based eviction and NaN-safe delta detection. Added vitest and tsx dev dependencies, configured vitest with path aliases. All 32 unit tests passing, zero TypeScript errors.

### Leg 01: Mock AIS Server
- **Status**: completed
- **Started**: 2026-02-06
- **Completed**: 2026-02-06
- **Summary**: Created standalone mock AIS WebSocket server implementing AISStream.io protocol. Generates synthetic vessels moving along great-circle paths between TEST_PORTS with configurable message rate, vessel count, and time scale. Exports startMockServer() for programmatic control. Added ws to dependencies, @types/ws to devDependencies, dev:mock script. 3 smoke tests verifying subscription handling, concurrent clients, and valid coordinate ranges. All 35 tests passing.

### Leg 02: WebSocket Relay Server
- **Status**: completed
- **Started**: 2026-02-06
- **Completed**: 2026-02-06
- **Summary**: Created custom Next.js server entry point (src/server/index.ts) with WebSocket upgrade handling on /ws/ais. UpstreamManager (src/server/upstream.ts) connects to AIS_UPSTREAM_URL with exponential backoff reconnection (1s-30s), sends AISStreamSubscription with bounding boxes, parses messages into shared VesselStore, and runs periodic stale vessel eviction. DownstreamManager (src/server/downstream.ts) manages browser WebSocket connections using noServer mode, sends full VesselPosition snapshot on connect, broadcasts delta position/static updates. Added dev:server script with tsx --watch. 3 integration tests verifying full pipeline (mock→relay→client), snapshot delivery, and path rejection. All 38 tests passing, zero TypeScript errors.

### Leg 03: Frontend AIS Hook
- **Status**: completed
- **Started**: 2026-02-06
- **Completed**: 2026-02-06
- **Summary**: Created useAISStream React hook (src/hooks/useAISStream.ts) that connects to /ws/ais via browser WebSocket, handles snapshot/position/static messages with requestAnimationFrame-based batching, reconnects with exponential backoff, and falls back to TEST_VESSELS on disconnect. Updated Vessels component to accept VesselPosition[] props with NaN heading fallback chain and dynamic InstancedMesh resizing via key={count}. Wired hook into GlobeScene outside Canvas (R3F context boundary). Exported processDownstreamMessage for pure-function testing. 7 unit tests for message processing. All 45 tests passing, zero TypeScript errors.

### Leg 04: Live AIS Integration
- **Status**: completed
- **Started**: 2026-02-06
- **Completed**: 2026-02-06
- **Summary**: Created .env.local.example template with AISSTREAM_API_KEY and AIS_UPSTREAM_URL placeholders. Fixed .gitignore to not ignore the example file (added !.env.local.example negation after .env* glob). Documented AISStream.io registration at https://aisstream.io/. Manual verification requires user to register for free API key and set env vars before running dev:server. The pipeline is ready for live data: set AISSTREAM_API_KEY and AIS_UPSTREAM_URL=wss://stream.aisstream.io/v0/stream in shell, run dev:server.

---

## Decisions

*(No runtime decisions yet)*

---

## Deviations

*(No deviations yet)*

---

## Anomalies

*(No anomalies yet)*

---

## Session Notes

*(No session notes yet)*
