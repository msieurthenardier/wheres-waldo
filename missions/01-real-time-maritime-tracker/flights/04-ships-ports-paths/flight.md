# Flight 04: Ships, Ports & Paths

**Status**: landed
**Branch**: `flight/04-ships-ports-paths`

## Objective

Replace hardcoded test data in all three visualization layers (vessels, ports, shipping lanes) with the real commodity-driven data from Flight 03's value estimation engine. Ships color-coded by commodity, ports scaled by throughput, and shipping lanes drawn between real export/import pairs.

## Pre-Flight Checklist

- [x] Flight 03 merged — commodity classification, valuation, and enrichment pipeline operational
- [x] 31-port commodity database available via `COMMODITY_PORTS`
- [x] `EnrichedVesselPosition` flowing through downstream WebSocket
- [x] Existing rendering components (Vessels, PortMarkers, ShippingLanes) functional with test data

## Legs

### Leg 01: Trade Route Generation

- [x] Create `src/lib/commodity/routes.ts` with `generateTradeRoutes()` and cached `getTradeRoutes()`
- [x] Connect each commodity's export ports to top-5 import ports by throughput
- [x] Deduplicate bidirectional routes, skip same-region pairs
- [x] Export `TradeRoute` interface with from/to coordinates, commodity, and color

### Leg 02: Shipping Lanes — Commodity Routes

- [x] Replace `TEST_LANES`/`TEST_PORTS` lookup in `ShippingLanes.tsx` with `getTradeRoutes()`
- [x] Each lane arc colored by its commodity's designated color
- [x] Remove dependency on `@/data/test-markers` from ShippingLanes

### Leg 03: Vessels — Commodity Coloring & Value Scaling (Flight 03)

- [x] Already completed in Flight 03 Leg 02 — vessels color-coded by commodity, scaled by estimated value

### Leg 04: Ports — Commodity Coloring & Throughput Scaling (Flight 03)

- [x] Already completed in Flight 03 Leg 02 — ports use commodity colors and throughput-based scaling

## Post-Flight Checklist

- [x] All 82 tests pass
- [x] TypeScript compiles without errors
- [x] ShippingLanes renders commodity-colored great-circle arcs between real port pairs
- [x] No remaining references to TEST_LANES or TEST_PORTS in globe components
