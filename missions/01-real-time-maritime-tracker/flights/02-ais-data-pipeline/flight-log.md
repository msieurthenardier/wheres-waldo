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
