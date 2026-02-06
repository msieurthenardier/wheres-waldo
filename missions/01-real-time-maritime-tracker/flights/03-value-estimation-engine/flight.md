# Flight: Value Estimation Engine

**Status**: landed
**Mission**: [Real-Time Maritime AI Supply Chain Tracker](../../mission.md)

## Contributing to Criteria

- [ ] Vessels render scaled by estimated cargo dollar value
- [ ] Ports render scaled by estimated throughput dollar value
- [ ] Users can filter vessels by commodity type (semiconductors, lithium, cobalt, nickel, rare earths, copper)

---

## Pre-Flight

### Objective

Build a commodity classification and dollar-value estimation system that enriches live AIS vessel data with likely commodity type and estimated cargo value. The system maps vessel type codes, destination ports, and vessel dimensions to one of six AI-critical commodities, then estimates per-vessel cargo value using bundled trade statistics. The enriched data flows through the existing WebSocket pipeline to the frontend.

### Design Decisions

**Bundled static reference data over external API calls**: All commodity prices, trade volumes, and port-commodity mappings are bundled as TypeScript modules rather than fetched from UN Comtrade or USGS at runtime.
- Rationale: Zero latency, no API key management, works offline, free-tier compliant
- Trade-off: Data becomes stale over time; manual updates needed for price changes

**Heuristic classification over ML**: Commodity classification uses rule-based heuristics (ship type code + destination port + origin proximity) rather than machine learning.
- Rationale: Deterministic, testable, no training data needed, transparent logic
- Trade-off: Lower accuracy; can't distinguish container cargo contents

**Server-side enrichment**: Classification and value estimation happen on the server (in the relay), not the browser.
- Rationale: Server has VesselStatic data (ship type, dimensions, destination); reduces client computation; enriched data broadcasts to all clients
- Trade-off: Slightly more server memory; enrichment happens even if no clients are connected

**DWT estimation from AIS dimensions**: Deadweight tonnage is estimated from vessel length, beam, and draught using a block coefficient formula.
- Rationale: AIS provides bow/stern/port/starboard dimensions and draught; DWT correlates with cargo capacity
- Trade-off: Rough approximation; actual DWT varies significantly by hull design

### Prerequisites

- [x] AIS data pipeline operational (Flight 02)
- [x] VesselStore with position + static data
- [x] Downstream WebSocket protocol with snapshot/position/static messages

### Pre-Flight Checklist

- [x] All open questions resolved
- [x] Design decisions documented
- [x] Prerequisites verified
- [x] Validation approach defined
- [x] Legs defined

---

## In-Flight

### Technical Approach

Four-layer enrichment pipeline:

1. **Reference Data Layer** (`src/lib/commodity/`) — Static commodity definitions, port database with commodity associations, trade route values
2. **Classification Layer** (`src/lib/commodity/classifier.ts`) — Maps (shipType, destination, dimensions) → commodity + confidence
3. **Valuation Layer** (`src/lib/commodity/valuator.ts`) — Estimates cargo $ value from DWT + commodity + route
4. **Pipeline Integration** — Server enriches VesselRecords on static data arrival; enriched data flows through downstream WebSocket to frontend hook

### Legs

- [x] `00-commodity-reference-data` — Commodity types, port database, trade route values
- [x] `01-classifier-and-valuator` — Vessel classification + value estimation with tests
- [x] `02-enriched-pipeline` — Server-side enrichment + downstream protocol extension + frontend hook update

---

## Post-Flight

### Completion Checklist

- [ ] All legs completed
- [ ] Code merged
- [ ] Tests passing
- [ ] Flight debrief completed

### Verification

- Vessels in the VesselStore have commodity and value enrichments
- The downstream WebSocket sends enriched vessel data to clients
- The frontend hook exposes commodity and value data
- Classification covers all six AI-critical commodities
- Unit tests verify classification and valuation logic
