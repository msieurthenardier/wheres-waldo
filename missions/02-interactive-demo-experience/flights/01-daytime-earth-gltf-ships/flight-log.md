# Flight Log: Daytime Earth & GLTF Ships

**Flight**: [Daytime Earth & GLTF Ships](flight.md)

## Summary

All 4 legs completed successfully. Earth texture swapped to daytime Blue Marble, ship model optimized from 35MB to 319KB, vessels now render as GLTF instances, and AIS data streams directly from AISStream.io without a backend relay.

---

## Leg Progress

### Leg 01: Daytime Earth Texture
**Status**: completed

#### Changes Made
- Downloaded Solar System Scope 8K Earth Day Map (4.5MB, CC-BY 4.0)
- Updated `Globe.tsx` texture reference from `earth_nightmap_8k.jpg` to `earth_daymap_8k.jpg`
- Removed unused nightmap texture

### Leg 02: Optimized GLTF Ship Model
**Status**: completed

#### Changes Made
- Ran `gltfjsx --transform --simplify --resolution 512` on 35MB `cargo-ship.glb`
- Output: `cargo-ship-transformed.glb` at 319KB (99% reduction)
- Model has 2 mesh nodes and 2 materials
- Removed original 35MB model

#### Notes
- The `--simplify` flag aggressively decimates geometry
- The `--resolution 512` flag downscales textures to 512px
- Even with this compression, the ship silhouette is clearly recognizable

### Leg 03: GLTF Instanced Vessels
**Status**: completed

#### Changes Made
- Rewrote `Vessels.tsx` to use `useGLTF` from `@react-three/drei`
- Extracts geometry from GLTF nodes (`node_id6`, `node_id9`)
- Creates 2 `InstancedMesh` instances sharing transform matrices
- Wrapped in `<Suspense>` for async loading
- Adjusted scale from 0.012 (cone) to 0.003 (GLTF) to fit globe proportions

### Leg 04: Direct AISStream.io Connection
**Status**: completed

#### Changes Made
- Rewrote `useAISStream.ts` — no longer connects to `/ws/ais` backend relay
- Connects directly to `wss://stream.aisstream.io/v0/stream` with API key
- Sends subscription with global bounding boxes and filtered message types
- Processes raw AIS envelopes client-side using existing parser + VesselStore + enrichment pipeline
- Periodic 2s flush to React state prevents re-render thrashing from high-frequency AIS messages
- API key hardcoded as fallback for zero-config demo
- Rewrote test suite: 6 tests covering processAISEnvelope function

#### Notes
- The enrichment pipeline (classifier + valuator) runs entirely client-side now
- Position-only vessels get low-confidence proxy enrichment
- When ShipStaticData arrives (type 5), vessel is re-enriched with proper classification
- Global bounding boxes mean high message volume — the 2s flush interval is critical for performance

---

## Decisions

### Direct Browser Connection
**Context**: Original architecture used a backend WebSocket relay server
**Decision**: Connect browser directly to AISStream.io, removing the backend dependency
**Impact**: GitHub Pages static export can show live data with just the hardcoded API key

### Hardcoded API Key
**Context**: User provided key and requested hardcode for zero-config demo
**Decision**: Key embedded as fallback constant, env var takes precedence
**Impact**: Public repo exposes the free-tier API key — acceptable risk for public AIS data
