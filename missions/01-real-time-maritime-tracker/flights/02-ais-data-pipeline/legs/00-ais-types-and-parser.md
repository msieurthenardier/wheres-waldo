# Leg: 00-ais-types-and-parser

**Status**: completed
**Flight**: [AIS Data Pipeline](../flight.md)

## Objective

Define TypeScript types for AISStream.io WebSocket messages, implement a parser/normalizer that converts raw JSON to typed internal domain objects, and build an in-memory VesselStore with TTL-based eviction and delta detection.

## Context

- **Design decisions from flight**: AISStream.io sends messages with an envelope containing `MessageType`, `Message`, and `MetaData`. We need `PositionReport` (AIS types 1, 2, 3) for real-time positioning and `ShipStaticData` (AIS type 5) for vessel identity. The relay server will filter by bounding box and ship type server-side. The in-memory vessel store deduplicates by MMSI and only pushes delta updates to clients.
- **How this fits**: This is the foundational data layer for the entire AIS pipeline. Every subsequent leg (mock server, relay, frontend hook) depends on these types, the parser, and the store. Getting these right here means all downstream code operates on well-typed, validated domain objects rather than raw JSON.
- **No prior legs**: This is the first leg of Flight 02. Flight 01 established the globe UI with hardcoded test data in `src/data/test-markers.ts`. The existing `Vessel` interface (`id`, `lat`, `lon`, `heading`, `speed`, `type`) serves as a reference for what the frontend currently expects, though the new internal types will be richer.
- **Testing infrastructure**: No test runner is currently configured. This leg must add Vitest as a dev dependency and configure it. The `tsx` package should also be added as a dev dependency (used for running server-side TypeScript in later legs).

## Inputs

What exists before this leg runs:
- `package.json` — Current dependencies (no test runner, no `tsx`)
- `tsconfig.json` — Compiler config with `@/*` path alias mapping to `./src/*`
- `src/data/test-markers.ts` — Existing `Vessel` interface (reference for field naming conventions)
- `src/lib/geo.ts` — Existing library module (reference for code style and structure)

## Outputs

What exists after this leg completes:

- `vitest.config.ts` — Vitest configuration file with path alias support
- `src/lib/ais/types.ts` — AISStream.io raw message types and internal domain types
- `src/lib/ais/parser.ts` — Parser/normalizer functions
- `src/lib/ais/store.ts` — VesselStore class
- `src/lib/ais/index.ts` — Barrel export
- `src/lib/ais/__tests__/parser.test.ts` — Parser unit tests
- `src/lib/ais/__tests__/store.test.ts` — Store unit tests
- `package.json` — Updated with `vitest`, `tsx` dev dependencies and `test` script

## Acceptance Criteria

- [ ] `vitest` and `tsx` are listed in `devDependencies` in `package.json`
- [ ] A `"test"` script exists in `package.json` that runs `vitest run`
- [ ] `npx vitest run` executes successfully with all tests passing
- [ ] `src/lib/ais/types.ts` exports TypeScript interfaces for `AISStreamSubscription`, `AISStreamEnvelope`, `PositionReport`, `ShipStaticData`, `AISStreamMetaData`, `VesselPosition`, and `VesselStatic`
- [ ] `src/lib/ais/parser.ts` exports functions that convert raw AISStream.io JSON envelopes into typed `VesselPosition` and `VesselStatic` objects (or `null` for unparseable messages)
- [ ] `src/lib/ais/store.ts` exports a `VesselStore` class that stores vessels by MMSI, supports TTL-based eviction, and detects deltas (returns whether an update actually changed position data)
- [ ] Parser tests cover: valid PositionReport parsing, valid ShipStaticData parsing, malformed/missing field handling, out-of-range coordinate rejection
- [ ] Store tests cover: adding and retrieving vessels, updating existing vessels, TTL expiry/eviction, delta detection (changed vs unchanged positions)
- [ ] All types use the `@/lib/ais` import path (verified by the test files importing from there)

## Verification Steps

1. Run `npx vitest run` from project root -- all tests pass with zero failures
2. Inspect `package.json` -- `vitest` and `tsx` are in `devDependencies`, `"test": "vitest run"` is in scripts
3. Inspect `src/lib/ais/types.ts` -- all listed interfaces are exported
4. Inspect `src/lib/ais/parser.ts` -- `parsePositionReport` and `parseShipStaticData` are exported
5. Inspect `src/lib/ais/store.ts` -- `VesselStore` class is exported with `update`, `get`, `getAll`, `evictStale` methods
6. Run `npx tsc --noEmit` -- no TypeScript compilation errors

## Implementation Guidance

### 1. Add dev dependencies and configure Vitest

Install `vitest` and `tsx` as dev dependencies:
```
npm install -D vitest tsx
```

Create `vitest.config.ts` at project root:
```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Add a test script to `package.json`:
```json
"test": "vitest run"
```

### 2. Define AISStream.io raw message types (`src/lib/ais/types.ts`)

These types mirror the AISStream.io WebSocket API wire format exactly.

**Subscription message** (sent by client to AISStream.io on connect):
```typescript
export interface AISStreamSubscription {
  APIKey: string;
  BoundingBoxes: [number, number][][];  // Array of [[lat1,lon1],[lat2,lon2]] pairs
  FiltersShipMMSI?: string[];
  FilterMessageTypes?: AISMessageType[];
}

export type AISMessageType =
  | "PositionReport"
  | "ShipStaticData"
  | "StandardClassBCSPositionReport"
  | "StaticDataReport"
  | "UnknownMessage";
```

**Envelope** (every message from AISStream.io):
```typescript
export interface AISStreamEnvelope {
  MessageType: AISMessageType;
  Message: {
    PositionReport?: PositionReport;
    ShipStaticData?: ShipStaticData;
    [key: string]: unknown;
  };
  MetaData: AISStreamMetaData;
}
```

**MetaData** (present on every message):
```typescript
export interface AISStreamMetaData {
  MMSI: number;
  MMSI_String: string;
  ShipName: string;
  latitude: number;
  longitude: number;
  time_utc: string;  // ISO 8601 timestamp string
}
```

**PositionReport** (AIS message types 1, 2, 3):
```typescript
export interface PositionReport {
  Cog: number;           // Course over ground in 1/10 degree (0-3599, 3600 = unavailable)
  CommunicationState: number;
  Latitude: number;      // Degrees (-90 to 90, 91 = unavailable)
  Longitude: number;     // Degrees (-180 to 180, 181 = unavailable)
  MessageID: number;     // 1, 2, or 3
  NavigationalStatus: number; // 0-15 (0=under way using engine, 1=at anchor, etc.)
  PositionAccuracy: boolean;
  Raim: boolean;
  RateOfTurn: number;    // Degrees per minute (-127 to 127, -128 = unavailable)
  RepeatIndicator: number;
  Sog: number;           // Speed over ground in 1/10 knot (0-1022, 1023 = unavailable)
  Spare: number;
  SpecialManoeuvreIndicator: number;
  Timestamp: number;     // UTC second (0-59, 60 = unavailable)
  TrueHeading: number;   // Degrees (0-359, 511 = unavailable)
  UserID: number;        // MMSI
  Valid: boolean;
}
```

**ShipStaticData** (AIS message type 5):
```typescript
export interface ShipStaticDataDimension {
  A: number;  // Distance from GPS to bow (meters)
  B: number;  // Distance from GPS to stern (meters)
  C: number;  // Distance from GPS to port (meters)
  D: number;  // Distance from GPS to starboard (meters)
}

export interface ShipStaticDataEta {
  Month: number;   // 1-12 (0 = unavailable)
  Day: number;     // 1-31 (0 = unavailable)
  Hour: number;    // 0-23 (24 = unavailable)
  Minute: number;  // 0-59 (60 = unavailable)
}

export interface ShipStaticData {
  AisVersion: number;
  CallSign: string;
  Destination: string;
  Dimension: ShipStaticDataDimension;
  Dte: number;
  Eta: ShipStaticDataEta;
  FixType: number;
  ImoNumber: number;
  MaximumStaticDraught: number;  // In 1/10 meter
  MessageID: number;             // 5
  Name: string;
  RepeatIndicator: number;
  Spare: boolean;
  Type: number;                  // Ship type code (70-79 = cargo, 80-89 = tanker)
  UserID: number;                // MMSI
  Valid: boolean;
}
```

**Internal domain types** (normalized, what the rest of our app uses):
```typescript
export interface VesselPosition {
  mmsi: string;
  lat: number;
  lon: number;
  cog: number;          // Degrees (0-359.9), NaN if unavailable
  sog: number;          // Knots, NaN if unavailable
  heading: number;      // True heading degrees (0-359), NaN if unavailable
  navStatus: number;    // Navigational status code (0-15)
  timestamp: number;    // Unix epoch ms when this position was received
  shipName: string;     // From MetaData
}

export interface VesselStatic {
  mmsi: string;
  name: string;
  callSign: string;
  imo: number;
  shipType: number;       // AIS ship type code
  destination: string;
  dimBow: number;         // Meters
  dimStern: number;       // Meters
  dimPort: number;        // Meters
  dimStarboard: number;   // Meters
  draught: number;        // Meters
  eta: string | null;     // ISO date string or null if unavailable
  timestamp: number;      // Unix epoch ms when received
}

/** Combined vessel record stored in VesselStore */
export interface VesselRecord {
  position: VesselPosition | null;
  static: VesselStatic | null;
  lastUpdate: number;     // Unix epoch ms of most recent update (position or static)
}
```

### 3. Implement parser/normalizer (`src/lib/ais/parser.ts`)

Export two functions:

**`parsePositionReport(envelope: AISStreamEnvelope): VesselPosition | null`**
- Validate `envelope.MessageType === "PositionReport"`
- Extract `PositionReport` from `envelope.Message.PositionReport`
- Return `null` if the report is missing or `Valid` is `false`
- Reject out-of-range coordinates: latitude must be in `[-90, 90]`, longitude in `[-180, 180]`. AIS uses 91/181 for "unavailable" -- reject these.
- Normalize `Cog` from 1/10 degree integer to degrees (divide by 10). If `Cog === 3600`, set to `NaN`.
- Normalize `Sog` from 1/10 knot integer to knots (divide by 10). If `Sog === 1023`, set to `NaN`.
- If `TrueHeading === 511`, set heading to `NaN`.
- Set `timestamp` to `Date.now()` (reception time).
- Set `shipName` from `envelope.MetaData.ShipName`, trimmed. Replace empty string with `"Unknown"`.
- Set `mmsi` from `envelope.MetaData.MMSI_String`.

**`parseShipStaticData(envelope: AISStreamEnvelope): VesselStatic | null`**
- Validate `envelope.MessageType === "ShipStaticData"`
- Extract from `envelope.Message.ShipStaticData`
- Return `null` if missing or `Valid` is `false`
- Normalize `MaximumStaticDraught` from 1/10 meter to meters (divide by 10)
- Convert `Eta` fields to an ISO date string (use current year, return `null` if Month or Day is 0)
- Trim `Name`, `CallSign`, `Destination` (AIS pads with `@` characters -- strip trailing `@` and whitespace)
- Set `mmsi` from `envelope.MetaData.MMSI_String`
- Set `timestamp` to `Date.now()`

### 4. Implement VesselStore (`src/lib/ais/store.ts`)

A class with these behaviors:

```typescript
export class VesselStore {
  constructor(options?: { ttlMs?: number })  // Default TTL: 15 minutes (900_000 ms)

  /** Update store with a position report. Returns true if position actually changed. */
  updatePosition(position: VesselPosition): boolean

  /** Update store with static data. Returns true if this is new static info. */
  updateStatic(staticData: VesselStatic): boolean

  /** Get a single vessel record by MMSI */
  get(mmsi: string): VesselRecord | undefined

  /** Get all vessel records */
  getAll(): Map<string, VesselRecord>

  /** Get count of stored vessels */
  get size(): number

  /** Remove vessels that haven't been updated within TTL. Returns number evicted. */
  evictStale(now?: number): number
}
```

Implementation details:
- Internal storage: `Map<string, VesselRecord>`
- **Delta detection** in `updatePosition`: Compare new `lat`/`lon`/`cog`/`sog`/`heading` against existing. Return `true` if any field changed or if this is a new MMSI. This allows the relay to avoid pushing unchanged positions downstream.
- **TTL eviction** in `evictStale`: Iterate the map, delete entries where `now - record.lastUpdate > ttlMs`. Accept optional `now` parameter for deterministic testing.
- **Constructor** accepts optional `ttlMs` override (default 15 minutes = 900,000 ms).

### 5. Create barrel export (`src/lib/ais/index.ts`)

```typescript
export * from "./types";
export * from "./parser";
export { VesselStore } from "./store";
```

### 6. Write unit tests

**`src/lib/ais/__tests__/parser.test.ts`:**
- Test `parsePositionReport` with a valid envelope (all fields present, valid coordinates) -- returns correct `VesselPosition`
- Test `parsePositionReport` with `Cog: 3600`, `Sog: 1023`, `TrueHeading: 511` -- those fields are `NaN` in output
- Test `parsePositionReport` with out-of-range latitude (91) -- returns `null`
- Test `parsePositionReport` with out-of-range longitude (181) -- returns `null`
- Test `parsePositionReport` with `Valid: false` -- returns `null`
- Test `parsePositionReport` with missing `PositionReport` key in Message -- returns `null`
- Test `parsePositionReport` with wrong `MessageType` -- returns `null`
- Test `parseShipStaticData` with a valid envelope -- returns correct `VesselStatic`
- Test `parseShipStaticData` with name containing `@` padding -- trailing `@` stripped
- Test `parseShipStaticData` with `Eta.Month === 0` -- `eta` field is `null`
- Test `parseShipStaticData` with `Valid: false` -- returns `null`
- Test `parseShipStaticData` with missing `ShipStaticData` key -- returns `null`

Use test fixture factory functions to create valid envelopes and override specific fields per test. Example:

```typescript
function makePositionEnvelope(overrides?: {
  report?: Partial<PositionReport>;
  meta?: Partial<AISStreamMetaData>;
}): AISStreamEnvelope {
  return {
    MessageType: "PositionReport",
    Message: {
      PositionReport: {
        Cog: 2150,         // 215.0 degrees
        CommunicationState: 0,
        Latitude: 35.6895,
        Longitude: 139.6917,
        MessageID: 1,
        NavigationalStatus: 0,
        PositionAccuracy: true,
        Raim: false,
        RateOfTurn: 0,
        RepeatIndicator: 0,
        Sog: 145,          // 14.5 knots
        Spare: 0,
        SpecialManoeuvreIndicator: 0,
        Timestamp: 30,
        TrueHeading: 215,
        UserID: 123456789,
        Valid: true,
        ...overrides?.report,
      },
    },
    MetaData: {
      MMSI: 123456789,
      MMSI_String: "123456789",
      ShipName: "EVER GIVEN",
      latitude: 35.6895,
      longitude: 139.6917,
      time_utc: "2025-01-15T12:30:00Z",
      ...overrides?.meta,
    },
  };
}
```

**`src/lib/ais/__tests__/store.test.ts`:**
- Test adding a new vessel position -- `updatePosition` returns `true`, `size` is 1, `get(mmsi)` returns the record
- Test updating with same position data -- `updatePosition` returns `false` (no delta)
- Test updating with changed latitude -- `updatePosition` returns `true`
- Test adding static data for existing vessel -- `updateStatic` returns `true`, record has both `position` and `static`
- Test adding static data for new MMSI -- creates new record with `position: null`
- Test `getAll` returns all vessels
- Test TTL eviction: add vessel, advance time past TTL, call `evictStale(futureTime)` -- vessel is removed, returns 1
- Test TTL eviction: add vessel, call `evictStale` before TTL expires -- vessel remains, returns 0
- Test TTL eviction with multiple vessels -- only stale ones removed
- Test custom TTL via constructor option

## Edge Cases

- **Missing or extra fields in raw JSON**: The parser should access fields defensively. If `envelope.Message.PositionReport` is `undefined`, return `null`. Do not throw.
- **AIS "unavailable" sentinel values**: `Latitude: 91`, `Longitude: 181`, `Cog: 3600`, `Sog: 1023`, `TrueHeading: 511` are all AIS sentinel values meaning "not available". The parser must handle each: reject the position entirely for invalid lat/lon, use `NaN` for unavailable COG/SOG/heading.
- **AIS name padding**: AIS pads `Name`, `CallSign`, and `Destination` fields with `@` characters to fill the fixed-width field. Strip trailing `@` characters and whitespace. An empty result after stripping should become `"Unknown"` for name or `""` for others.
- **Duplicate MMSI updates with identical data**: The store's delta detection must return `false` when position fields have not changed, so the relay knows not to push unnecessary updates downstream.
- **NaN comparison in delta detection**: `NaN !== NaN` in JavaScript. Use `Object.is()` or explicit `isNaN` checks when comparing heading/COG/SOG for delta detection. Two `NaN` values should be considered equal (no delta).
- **Negative RateOfTurn**: Valid range is -127 to 127. Do not reject negative values.
- **MMSI as string vs number**: AISStream.io provides both `MMSI` (number) and `MMSI_String` (string). Always use `MMSI_String` as the key to avoid numeric precision issues with 9-digit numbers (though they fit in JS numbers, string keys are more robust for Map operations).

## Files Affected

- `package.json` — Add `vitest` and `tsx` to `devDependencies`, add `"test"` script
- `vitest.config.ts` — New file: Vitest configuration with `@/*` path alias
- `src/lib/ais/types.ts` — New file: AISStream.io raw types + internal domain types
- `src/lib/ais/parser.ts` — New file: `parsePositionReport`, `parseShipStaticData`
- `src/lib/ais/store.ts` — New file: `VesselStore` class
- `src/lib/ais/index.ts` — New file: barrel exports
- `src/lib/ais/__tests__/parser.test.ts` — New file: parser unit tests
- `src/lib/ais/__tests__/store.test.ts` — New file: store unit tests

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
