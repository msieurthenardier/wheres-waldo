# Flight 05: Search, Filter & Detail Panels

**Status**: landed
**Branch**: `flight/05-search-filter-panels`

## Objective

Build the interactive UI layer: commodity filter toggles in the top bar, vessel/port search, a detail sidebar with vessel and port information, and global statistics overlay. All filters propagate to the 3D globe in real time.

## Pre-Flight Checklist

- [x] Flight 04 merged — all visualization layers driven by commodity data
- [x] `EnrichedVesselPosition` with commodity and value data flowing to frontend
- [x] 6 commodity definitions with colors available via `COMMODITIES`
- [x] 31-port database available via `COMMODITY_PORTS`

## Legs

### Leg 01: Shared State Architecture

- [x] Create `src/stores/filters.tsx` — React context for commodity filters, search query, and selection state
- [x] Create `src/stores/ais.tsx` — Lift AIS data hook to context, provide vessels + computed stats to all UI
- [x] Wrap app in `FilterProvider` and `AISProvider` at page level

### Leg 02: TopBar — Functional Filters & Search

- [x] Commodity filter chips toggle on/off with commodity-colored active states
- [x] Search input filters vessels by name, MMSI, or commodity
- [x] Filters propagate to GlobeScene — vessels and shipping lanes respond

### Leg 03: Sidebar — Details & Stats

- [x] Global stats section: vessels tracked, ports active, estimated value in transit
- [x] Commodity breakdown: per-commodity vessel count and value
- [x] Port list with clickable items opening port detail view
- [x] Vessel detail view: name, MMSI, position, speed, heading, commodity, estimated value
- [x] Port detail view: name, country, region, position, exports, imports

### Leg 04: Globe Filtering

- [x] Vessels filtered by active commodities and search query
- [x] Shipping lanes filtered by active commodities
- [x] Connection status indicator shown when not connected to AIS stream

## Post-Flight Checklist

- [x] All 82 tests pass
- [x] TypeScript compiles without errors
- [x] Filter chips toggle and visually update (colored when active, dim when inactive)
- [x] Search filters vessels in real time on the globe
- [x] Sidebar shows live stats and commodity breakdown
- [x] Port and vessel detail views display relevant information
