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
