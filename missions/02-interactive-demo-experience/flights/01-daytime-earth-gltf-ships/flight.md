# Flight 01: Daytime Earth & GLTF Ships

**Status**: landed
**Branch**: `flight/m02-01-daytime-earth-gltf-ships`

## Objective

Replace the dark nighttime Earth texture with a vivid daytime Blue Marble, swap cone vessel geometry for instanced GLTF ship models, and connect the browser directly to AISStream.io for live data without a backend relay server.

## Pre-Flight Checklist

- [x] Mission 01 complete, all 6 flights merged
- [x] Existing test suite passing (82 tests)
- [x] AISStream.io API key obtained

## Legs

### Leg 01: Daytime Earth Texture

- [x] Download Solar System Scope 8K Earth Day Map (CC-BY 4.0, 4.5MB)
- [x] Replace `earth_nightmap_8k.jpg` with `earth_daymap_8k.jpg` in `public/textures/`
- [x] Update `Globe.tsx` to reference the new texture
- [x] Remove old nightmap texture

### Leg 02: Optimized GLTF Ship Model

- [x] Run `gltfjsx --transform --simplify` on existing 35MB `cargo-ship.glb`
- [x] Result: `cargo-ship-transformed.glb` at 319KB (99% reduction)
- [x] 2 mesh nodes (`node_id6`, `node_id9`) with 2 materials
- [x] Remove old 35MB model

### Leg 03: GLTF Instanced Vessels

- [x] Rewrite `Vessels.tsx` to use `useGLTF` for model loading
- [x] Extract geometry from GLTF nodes for `InstancedMesh`
- [x] Create 2 InstancedMesh instances sharing transform matrices (one per model mesh)
- [x] Wrap in `Suspense` for async GLTF loading
- [x] Maintain commodity coloring and value-based scaling

### Leg 04: Direct AISStream.io Connection

- [x] Rewrite `useAISStream.ts` to connect directly to `wss://stream.aisstream.io/v0/stream`
- [x] Send subscription with API key and global bounding boxes
- [x] Parse raw AIS envelopes using existing `parsePositionReport` and `parseShipStaticData`
- [x] Use `VesselStore` for client-side state management
- [x] Run `enrichVessel` client-side (classifier + valuator) for commodity classification and $ value
- [x] Periodic flush every 2s to React state (prevent re-render thrashing)
- [x] Hardcode API key as fallback for zero-config demo
- [x] Rewrite tests for new `processAISEnvelope` function (6 tests)

## Post-Flight Checklist

- [x] 81 tests pass
- [x] TypeScript clean
- [x] Static export build succeeds
- [x] Daytime Earth texture loads correctly
- [x] GLTF ship model loads and renders via instancing
- [x] Live AIS data streams directly from AISStream.io in the browser
