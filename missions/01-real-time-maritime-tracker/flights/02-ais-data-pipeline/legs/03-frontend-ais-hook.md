# Leg: 03-frontend-ais-hook

**Status**: completed
**Flight**: [AIS Data Pipeline](../flight.md)

## Objective

Create a `useAISStream` React hook that connects to the relay server's `/ws/ais` WebSocket endpoint, maintains a reactive `Map<string, VesselPosition>` of live vessel state, handles connection lifecycle with automatic reconnection and exponential backoff, and falls back to `TEST_VESSELS` data when the WebSocket is unavailable. Update the `Vessels` component to accept vessel data as props instead of importing `TEST_VESSELS` directly, and wire the hook into the component tree outside the React Three Fiber `<Canvas>` context boundary.

## Context

- **Design decision from flight**: "A React hook that connects to the relay server's `/ws/ais` endpoint, receives vessel position updates, and maintains a reactive vessel state Map. Falls back to test data if the WebSocket connection fails (preserving the Flight 01 demo experience). The existing `Vessels` component is updated to consume live data from this hook instead of `TEST_VESSELS`."
- **How this fits**: This is the final connection between the backend pipeline (Legs 00-02) and the frontend globe. Legs 00-02 built the full server-side pipeline: types/parser/store, mock AIS server, and WebSocket relay. This leg closes the loop by having the browser connect to `/ws/ais`, receive the `snapshot` + `position` + `static` messages defined in the downstream protocol (see `downstream.ts`), and render live vessel positions on the globe.
- **Learnings from Leg 02**: The downstream protocol sends three message types: `{ type: "snapshot", data: VesselPosition[] }` on initial connect (full state), `{ type: "position", data: VesselPosition }` for position deltas, and `{ type: "static", data: VesselStatic }` for static vessel metadata. The hook must handle all three. The relay is available at `ws://{host}:{port}/ws/ais` -- the same host and port as the Next.js HTTP server when using `dev:server`.
- **React Three Fiber context boundary**: The `<Canvas>` component from `@react-three/fiber` creates its own React reconciler and context tree. Hooks like `useState` and `useEffect` inside `<Canvas>` children operate in the R3F reconciler, not the regular React DOM reconciler. This means a WebSocket hook cannot be used inside `<Canvas>` children directly (like `Vessels`). The hook must be called OUTSIDE the `<Canvas>` and data passed in via props or a bridging mechanism. The `GlobeScene` component renders `<Canvas>`, and `page.tsx` renders `GlobeScene` via dynamic import -- so the hook should be called in the component that renders `GlobeScene`, or in `GlobeScene` itself above the `<Canvas>`.
- **Existing `Vessel` type vs `VesselPosition` type**: The current `Vessels` component uses the `Vessel` interface from `test-markers.ts` (`id`, `lat`, `lon`, `heading`, `speed`, `type`). The AIS pipeline produces `VesselPosition` objects (`mmsi`, `lat`, `lon`, `cog`, `sog`, `heading`, `navStatus`, `timestamp`, `shipName`). The hook should expose `VesselPosition[]` and the `Vessels` component should be updated to consume `VesselPosition` data. The `type` field (used for color-coding) can be derived from the future `VesselStatic.shipType` field, but for now a default color is acceptable since static data integration is not the focus of this leg.
- **No new dependencies**: The browser's native `WebSocket` API is used (not `ws`, which is Node.js-only). No new packages are needed.

## Inputs

What exists before this leg runs:
- `src/lib/ais/types.ts` -- `VesselPosition`, `VesselStatic` types
- `src/lib/ais/index.ts` -- Barrel exports
- `src/server/downstream.ts` -- Downstream protocol reference (`snapshot`, `position`, `static` message types)
- `src/components/globe/Vessels.tsx` -- Current component importing `TEST_VESSELS` directly
- `src/components/scene/GlobeScene.tsx` -- Scene component rendering `<Canvas>` with `<Vessels />`
- `src/app/page.tsx` -- Page component with dynamic import of `GlobeScene`
- `src/data/test-markers.ts` -- `TEST_VESSELS` array and `Vessel` interface (fallback data)
- `src/lib/geo.ts` -- `latLonToVector3` utility used by `Vessels`
- `package.json` -- Current dependencies (React 19, R3F, Three.js, etc.)
- `vitest.config.ts` -- Vitest configured with `@/*` path alias

## Outputs

What exists after this leg completes:
- `src/hooks/useAISStream.ts` -- New file: React hook for WebSocket vessel data with fallback
- `src/components/globe/Vessels.tsx` -- Updated: accepts `vessels` prop (array of `VesselPosition`) instead of importing `TEST_VESSELS`
- `src/components/scene/GlobeScene.tsx` -- Updated: calls `useAISStream` above `<Canvas>`, passes vessel data to `<Vessels>`
- `src/hooks/__tests__/useAISStream.test.ts` -- New file: unit tests for the hook

## Acceptance Criteria

- [ ] `src/hooks/useAISStream.ts` exports a `useAISStream` hook that returns `{ vessels: VesselPosition[]; status: "connecting" | "connected" | "disconnected" }`
- [ ] The hook connects to `ws://${window.location.host}/ws/ais` using the browser's native `WebSocket` API
- [ ] The hook processes `snapshot` messages by replacing the entire vessel map with the received positions
- [ ] The hook processes `position` messages by upserting individual vessels in the map (keyed by `mmsi`)
- [ ] The hook processes `static` messages without error (logged or stored for future use, does not break the hook)
- [ ] When the WebSocket is unavailable or disconnects, the hook falls back to `TEST_VESSELS` data converted to `VesselPosition` format
- [ ] The hook implements automatic reconnection with exponential backoff (1s, 2s, 4s, max 10s) on disconnect
- [ ] The hook cleans up the WebSocket connection on component unmount (no leaked connections)
- [ ] `Vessels` component accepts a `vessels: VesselPosition[]` prop and no longer imports `TEST_VESSELS` directly
- [ ] `GlobeScene` calls `useAISStream()` outside the `<Canvas>` and passes vessel data to `<Vessels>` as a prop
- [ ] The globe renders vessels from the hook data (live when relay is running, test data when it's not)
- [ ] `npx vitest run` passes all tests (existing Leg 00/01/02 tests + new hook tests)
- [ ] `npx tsc --noEmit` reports zero TypeScript errors

## Verification Steps

1. Run `npm run dev:mock` and `npm run dev:server` -- full pipeline running
2. Open browser to `http://localhost:3000` -- globe shows vessels that update in real time (positions change)
3. Stop the mock server and relay -- refresh browser -- globe shows static test vessel markers (fallback)
4. Restart mock server and relay with browser open -- vessels transition from test data to live data automatically
5. Open browser console -- no WebSocket errors logged when relay is running; graceful reconnection messages when relay is not running
6. Run `npx vitest run` -- all tests pass
7. Run `npx tsc --noEmit` -- no TypeScript errors

## Implementation Guidance

### 1. Create the `useAISStream` hook (`src/hooks/useAISStream.ts`)

Create the `src/hooks/` directory. This is the first hook in the project.

**Downstream message type definitions (local to the hook):**

Define discriminated union types for the messages the hook expects from the relay server. These mirror the protocol from `downstream.ts`:

```typescript
import { useState, useEffect, useRef, useCallback } from "react";
import type { VesselPosition, VesselStatic } from "@/lib/ais";
import { TEST_VESSELS } from "@/data/test-markers";

type SnapshotMessage = { type: "snapshot"; data: VesselPosition[] };
type PositionMessage = { type: "position"; data: VesselPosition };
type StaticMessage = { type: "static"; data: VesselStatic };
type DownstreamMessage = SnapshotMessage | PositionMessage | StaticMessage;

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface UseAISStreamResult {
  vessels: VesselPosition[];
  status: ConnectionStatus;
}
```

**Converting `TEST_VESSELS` to `VesselPosition[]` for fallback:**

The existing `Vessel` type from `test-markers.ts` has `{ id, lat, lon, heading, speed, type }`. Convert these to `VesselPosition` objects:

```typescript
const FALLBACK_VESSELS: VesselPosition[] = TEST_VESSELS.map((v) => ({
  mmsi: v.id,
  lat: v.lat,
  lon: v.lon,
  cog: v.heading,      // Use heading as course-over-ground for test data
  sog: v.speed,
  heading: v.heading,
  navStatus: 0,         // 0 = under way using engine
  timestamp: Date.now(),
  shipName: `Test ${v.id}`,
}));
```

Compute `FALLBACK_VESSELS` at module scope (once) so it does not re-compute on each render.

**Hook implementation:**

```typescript
export function useAISStream(): UseAISStreamResult {
  const [vessels, setVessels] = useState<VesselPosition[]>(FALLBACK_VESSELS);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  // Refs for cleanup and reconnection
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const mountedRef = useRef(true);
  const vesselMapRef = useRef<Map<string, VesselPosition>>(new Map());

  // ... connect, disconnect, handleMessage, reconnection logic

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  return { vessels, status };
}
```

**Connection constants:**

```typescript
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 10_000;
const BACKOFF_MULTIPLIER = 2;
```

Use a shorter max backoff (10s) than the server-side relay (30s) because user-facing reconnection should feel more responsive.

**The `connect` function:**

Build the WebSocket URL from `window.location`:

```typescript
const connect = useCallback(() => {
  if (!mountedRef.current) return;

  // Determine WebSocket URL from current page host
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/ais`;

  setStatus("connecting");

  try {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      setStatus("connected");
      backoffRef.current = INITIAL_BACKOFF_MS;
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      handleMessage(event.data);
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setStatus("disconnected");
      fallbackToTestData();
      scheduleReconnect();
    };

    ws.onerror = () => {
      // The close event will fire after error, so reconnection is handled there.
      // No need to duplicate logic here.
    };
  } catch {
    // WebSocket constructor can throw if the URL is malformed
    setStatus("disconnected");
    fallbackToTestData();
    scheduleReconnect();
  }
}, []);
```

**The `handleMessage` function:**

```typescript
const handleMessage = useCallback((rawData: string) => {
  try {
    const msg = JSON.parse(rawData) as DownstreamMessage;

    switch (msg.type) {
      case "snapshot": {
        const map = new Map<string, VesselPosition>();
        for (const pos of msg.data) {
          map.set(pos.mmsi, pos);
        }
        vesselMapRef.current = map;
        setVessels(msg.data);
        break;
      }
      case "position": {
        vesselMapRef.current.set(msg.data.mmsi, msg.data);
        // Create a new array from the map values to trigger React re-render
        setVessels(Array.from(vesselMapRef.current.values()));
        break;
      }
      case "static": {
        // Store for future use (vessel info panel, etc.)
        // For now, no-op — static data does not affect vessel positions on the globe
        break;
      }
    }
  } catch {
    // Malformed message — ignore silently
  }
}, []);
```

**Important: Batching position updates.**

Calling `setVessels(Array.from(vesselMapRef.current.values()))` on every single `position` message could cause excessive re-renders if the relay sends many updates per second. React 18+ automatically batches state updates within the same event handler, but WebSocket `onmessage` events fire individually.

To avoid performance issues, consider a throttle or requestAnimationFrame-based approach:

```typescript
const rafIdRef = useRef<number | null>(null);
const dirtyRef = useRef(false);

const flushVessels = useCallback(() => {
  if (dirtyRef.current && mountedRef.current) {
    setVessels(Array.from(vesselMapRef.current.values()));
    dirtyRef.current = false;
  }
  rafIdRef.current = null;
}, []);

// In handleMessage, for "position" case:
// vesselMapRef.current.set(msg.data.mmsi, msg.data);
// dirtyRef.current = true;
// if (!rafIdRef.current) {
//   rafIdRef.current = requestAnimationFrame(flushVessels);
// }
```

This coalesces multiple position updates per frame into a single `setVessels` call, keeping render frequency at ~60fps max. Use this approach in the `position` case instead of calling `setVessels` directly.

**The `fallbackToTestData` function:**

```typescript
const fallbackToTestData = useCallback(() => {
  vesselMapRef.current = new Map(FALLBACK_VESSELS.map((v) => [v.mmsi, v]));
  setVessels(FALLBACK_VESSELS);
}, []);
```

**The `scheduleReconnect` function:**

```typescript
const scheduleReconnect = useCallback(() => {
  if (!mountedRef.current) return;
  if (reconnectTimerRef.current) return; // Already scheduled

  const delay = backoffRef.current;
  console.log(`[useAISStream] Reconnecting in ${delay}ms...`);

  reconnectTimerRef.current = setTimeout(() => {
    reconnectTimerRef.current = null;
    connect();
  }, delay);

  backoffRef.current = Math.min(
    backoffRef.current * BACKOFF_MULTIPLIER,
    MAX_BACKOFF_MS
  );
}, [connect]);
```

**The `cleanup` function:**

```typescript
const cleanup = useCallback(() => {
  if (reconnectTimerRef.current) {
    clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  }
  if (rafIdRef.current) {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
  }
  if (wsRef.current) {
    wsRef.current.onopen = null;
    wsRef.current.onmessage = null;
    wsRef.current.onclose = null;
    wsRef.current.onerror = null;
    wsRef.current.close();
    wsRef.current = null;
  }
}, []);
```

Setting event handlers to `null` before calling `close()` prevents the `onclose` handler from firing during cleanup (which would trigger reconnection after unmount).

### 2. Update the `Vessels` component (`src/components/globe/Vessels.tsx`)

Change the component to accept a `vessels` prop of `VesselPosition[]` instead of importing `TEST_VESSELS`.

**Props interface:**

```typescript
import type { VesselPosition } from "@/lib/ais";

interface VesselsProps {
  vessels: VesselPosition[];
}
```

**Component signature change:**

```typescript
export default function Vessels({ vessels }: VesselsProps) {
```

**Color mapping update:**

The existing color map uses `v.type` (`"container"`, `"bulk"`, `"tanker"`). `VesselPosition` does not have a `type` field. For now, use a default vessel color (the existing `#00fff2` cyan). When `VesselStatic` data is integrated later (with `shipType` code), the color can be derived from ship type ranges (70-79 = cargo, 80-89 = tanker). For this leg, all vessels use the same color:

```typescript
const colorArray = useMemo(() => {
  const arr = new Float32Array(count * 3);
  const defaultColor = new THREE.Color("#00fff2");
  for (let i = 0; i < count; i++) {
    arr[i * 3] = defaultColor.r;
    arr[i * 3 + 1] = defaultColor.g;
    arr[i * 3 + 2] = defaultColor.b;
  }
  return arr;
}, [count]);
```

**Replace `TEST_VESSELS` references with `vessels` prop:**

- `const count = vessels.length;` (instead of `TEST_VESSELS.length`)
- `vessels.forEach((vessel, i) => { ... })` in the `useEffect`
- For heading: use `vessel.heading`. Note that `VesselPosition.heading` can be `NaN` (unavailable). Fall back to `vessel.cog` if heading is `NaN`, and to `0` if both are `NaN`:

```typescript
const headingDeg = !isNaN(vessel.heading)
  ? vessel.heading
  : !isNaN(vessel.cog)
    ? vessel.cog
    : 0;
const headingRad = (headingDeg * Math.PI) / 180;
```

**Dependencies array update:**

The `useEffect` and `useMemo` dependency arrays must include `vessels` so the instanced mesh updates when vessel data changes:

```typescript
useEffect(() => {
  // ... position/orient each vessel instance
}, [vessels]);

const colorArray = useMemo(() => {
  // ... compute colors
}, [vessels.length]); // Re-compute only when count changes
```

**Critical: InstancedMesh count changes.**

When the number of vessels changes (e.g., from 7 test vessels to 25+ live vessels), the `<instancedMesh>` `args` array `[undefined, undefined, count]` must update. However, R3F does not dynamically resize `InstancedMesh` by changing args after initial creation. To handle count changes, add a `key` prop that forces remount when count changes:

```typescript
<instancedMesh
  key={count}
  ref={meshRef}
  args={[undefined, undefined, count]}
>
```

This causes React to unmount and remount the `<instancedMesh>` when the vessel count changes, creating a new instance with the correct capacity. This is the standard R3F pattern for dynamic instanced mesh sizing.

### 3. Wire the hook into `GlobeScene` (`src/components/scene/GlobeScene.tsx`)

The hook must be called OUTSIDE the `<Canvas>` component. `GlobeScene` is the right place because it renders `<Canvas>` and is already a `"use client"` component.

**Updated GlobeScene:**

```typescript
"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useEffect } from "react";
import Globe from "@/components/globe/Globe";
import Atmosphere from "@/components/globe/Atmosphere";
import Vessels from "@/components/globe/Vessels";
import PortMarkers from "@/components/globe/PortMarkers";
import ShippingLanes from "@/components/globe/ShippingLanes";
import { useAISStream } from "@/hooks/useAISStream";

function ReadySignal() {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const parent = gl.domElement.parentElement;
    if (parent) {
      parent.setAttribute("data-globe-ready", "true");
    }
  }, [gl]);
  return null;
}

export default function GlobeScene() {
  const { vessels } = useAISStream();

  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ antialias: true }}
        style={{ background: "#000000" }}
      >
        <ambientLight intensity={0.15} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} />
        <Globe />
        <Atmosphere />
        <Vessels vessels={vessels} />
        <PortMarkers />
        <ShippingLanes />
        <OrbitControls
          enablePan={false}
          minDistance={1.2}
          maxDistance={4.0}
          enableDamping
          dampingFactor={0.05}
          autoRotate
          autoRotateSpeed={0.003}
        />
        <EffectComposer multisampling={0}>
          <Bloom
            luminanceThreshold={0.9}
            luminanceSmoothing={0.2}
            intensity={0.3}
          />
          <Vignette offset={0.1} darkness={0.8} />
        </EffectComposer>
        <ReadySignal />
      </Canvas>
    </div>
  );
}
```

The key changes:
- Import `useAISStream` from `@/hooks/useAISStream`
- Call `useAISStream()` at the top of `GlobeScene` (outside `<Canvas>`)
- Pass `vessels` to `<Vessels vessels={vessels} />`

### 4. Write unit tests (`src/hooks/__tests__/useAISStream.test.ts`)

Testing a React hook with WebSocket connections requires mocking the WebSocket API. Use Vitest's mocking facilities and a fake WebSocket implementation.

**Test structure:**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
```

**Mock WebSocket class:**

Create a minimal mock WebSocket that exposes `onopen`, `onmessage`, `onclose`, `onerror`, and a `send` method. Track instances for assertions:

```typescript
let mockInstances: MockWebSocket[] = [];

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    mockInstances.push(this);
  }

  send(_data: string): void {}
  close(): void {
    this.readyState = MockWebSocket.CLOSED;
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event("open"));
  }

  simulateMessage(data: unknown): void {
    this.onmessage?.(new MessageEvent("message", {
      data: JSON.stringify(data),
    }));
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent("close"));
  }
}
```

Assign the mock to `globalThis.WebSocket` in `beforeEach` and restore in `afterEach`.

**Tests to write:**

1. **Starts with fallback test data** -- Hook returns `FALLBACK_VESSELS` and status `"connecting"` (or `"disconnected"`) before WebSocket connects.

2. **Connects and processes snapshot** -- Simulate WebSocket open + snapshot message. Verify the hook returns the snapshot's vessels and status `"connected"`.

3. **Processes position updates** -- After snapshot, simulate a `position` message with an updated vessel. Verify the vessel map is updated (either new vessel added or existing vessel's position changed).

4. **Falls back to test data on close** -- Simulate WebSocket close. Verify the hook returns fallback test data and status `"disconnected"`.

5. **Reconnects on disconnect** -- Simulate WebSocket close. Advance timers by the backoff delay. Verify a new WebSocket instance is created (reconnection attempted).

6. **Cleans up on unmount** -- Unmount the component. Verify the WebSocket is closed and no reconnection timer fires.

7. **Handles static messages without error** -- Simulate a `static` message. Verify no error is thrown and vessel data is unchanged.

Use `vi.useFakeTimers()` to control reconnection timing. Use a test utility to render the hook (either `@testing-library/react` `renderHook` if available, or a simple test component that calls the hook and exposes results via a ref). If `@testing-library/react` is not a dependency, write a minimal wrapper:

```typescript
import { createRoot } from "react-dom/client";

function renderHook<T>(hookFn: () => T): { result: { current: T }; unmount: () => void } {
  // ... minimal implementation
}
```

Alternatively, since the project does not have `@testing-library/react` and adding it is out of scope, test the hook's internal logic indirectly:
- Extract the message-handling logic into a pure function `processMessage(currentMap, message)` that returns the new map. Test this pure function directly.
- Test the WebSocket lifecycle behavior with the mock WebSocket class and a thin component wrapper.

**Recommended approach: Test the pure logic + a lightweight integration test.**

Extract a `processDownstreamMessage` utility function from the hook that can be tested without React:

```typescript
// In useAISStream.ts, export for testing:
export function processDownstreamMessage(
  vesselMap: Map<string, VesselPosition>,
  msg: DownstreamMessage
): Map<string, VesselPosition> | null {
  switch (msg.type) {
    case "snapshot": {
      const map = new Map<string, VesselPosition>();
      for (const pos of msg.data) {
        map.set(pos.mmsi, pos);
      }
      return map;
    }
    case "position": {
      const newMap = new Map(vesselMap);
      newMap.set(msg.data.mmsi, msg.data);
      return newMap;
    }
    case "static":
      return null; // No vessel map change
    default:
      return null;
  }
}
```

This pure function is straightforward to test:

```typescript
describe("processDownstreamMessage", () => {
  it("replaces vessel map on snapshot", () => { ... });
  it("upserts vessel on position update", () => { ... });
  it("returns null for static messages", () => { ... });
  it("handles empty snapshot", () => { ... });
});
```

For the full hook integration, a simple test using JSDOM (already available in Vitest's default environment) with mock WebSocket is sufficient for verifying the lifecycle behavior.

**Test file configuration note:**

Since the hook uses browser APIs (`WebSocket`, `window.location`, `requestAnimationFrame`), the test file needs Vitest's JSDOM environment. Add a docblock directive at the top of the test file:

```typescript
/**
 * @vitest-environment jsdom
 */
```

Or configure the test file pattern in `vitest.config.ts` to use JSDOM for `hooks/**` tests. The docblock approach is simpler and does not require a global configuration change.

Vitest's JSDOM environment is available by installing `jsdom` as a dev dependency:

```
npm install -D jsdom
```

This is needed for `document`, `window`, and DOM APIs in tests. Add it to `devDependencies`.

## Edge Cases

- **WebSocket not available in SSR**: The hook file must be used only in client components (`"use client"` context). The `GlobeScene` is already dynamically imported with `ssr: false` in `page.tsx`, so the hook will only execute in the browser. However, guard against SSR by checking `typeof window !== "undefined"` before constructing the WebSocket URL. If running in SSR context, return fallback data immediately without attempting connection.

- **R3F context boundary**: React hooks called inside `<Canvas>` children use the R3F reconciler. `useAISStream` uses DOM `WebSocket` and React state -- it MUST be called outside `<Canvas>`. Calling it in `GlobeScene` (which renders `<Canvas>`) ensures it runs in the DOM reconciler. Data flows into `<Canvas>` children via props, which R3F handles correctly.

- **Vessel count changes dynamically**: When switching from 7 test vessels to 25+ live vessels (or vice versa), the `InstancedMesh` must be recreated. The `key={count}` pattern on `<instancedMesh>` forces React/R3F to remount the mesh with the new capacity. Without this, the mesh would silently clip to the original count.

- **High-frequency position updates**: The mock server sends ~10 messages/second, but real AIS data could be much higher. The `requestAnimationFrame`-based flush ensures at most one `setVessels` call per animation frame, preventing render thrashing. The `vesselMapRef` accumulates all updates between frames.

- **NaN heading/COG values**: `VesselPosition.heading` and `cog` can be `NaN` (AIS "unavailable" sentinel). The `Vessels` component must handle `NaN` heading gracefully -- use `cog` as fallback, then `0` as final fallback. Do not pass `NaN` to `Math.PI` multiplication (it produces `NaN` which causes invisible/corrupted instances).

- **WebSocket URL with HTTPS**: When the page is served over HTTPS, the WebSocket must use `wss://`. The hook derives the protocol from `window.location.protocol`.

- **Multiple rapid connect/disconnect cycles**: The `mountedRef` guard prevents state updates after unmount. The `reconnectTimerRef` guard prevents multiple concurrent reconnection timers. The cleanup function nullifies event handlers before closing the socket to prevent the `onclose` handler from triggering reconnection during teardown.

- **Empty snapshot on fresh relay start**: If the relay just started and has no upstream data yet, the snapshot will be an empty array. The hook should handle this gracefully -- display no vessels (not fallback test data). Fallback to test data only happens on WebSocket disconnection, not on receiving an empty snapshot. An empty snapshot means "relay is connected but has no data yet."

- **Browser tab backgrounded**: When a tab is backgrounded, `requestAnimationFrame` stops firing. `WebSocket.onmessage` still fires and updates `vesselMapRef`. When the tab is foregrounded, the next `requestAnimationFrame` callback flushes the accumulated updates. No data is lost.

- **Malformed JSON from relay**: The `JSON.parse` call in `handleMessage` is wrapped in try/catch. Malformed messages are silently ignored.

## Files Affected

- `src/hooks/useAISStream.ts` -- New file: `useAISStream` hook with WebSocket connection, message handling, fallback, and reconnection
- `src/hooks/__tests__/useAISStream.test.ts` -- New file: unit tests for message processing and hook lifecycle
- `src/components/globe/Vessels.tsx` -- Modified: accepts `vessels: VesselPosition[]` prop, removes `TEST_VESSELS` import, handles NaN heading
- `src/components/scene/GlobeScene.tsx` -- Modified: imports and calls `useAISStream`, passes vessels to `<Vessels>`
- `package.json` -- Add `jsdom` to `devDependencies` (for JSDOM test environment)

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
