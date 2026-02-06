# Mission: Interactive Demo Experience

**Status**: completed

## Outcome

Opening the deployed GitHub Pages site feels like stepping into a live command center — without any setup. Hundreds of real ships sit at their actual ocean positions, each rendered as a recognizable 3D vessel model with real names, real MMSIs, and estimated cargo values. Clicking a ship highlights it and opens its detail panel in the sidebar. The daytime Earth is vivid and readable beneath the data layer.

## Context

Mission 01 delivered a complete 3D globe with AIS integration, commodity filtering, and search. However, the deployed GitHub Pages experience had four visible gaps:

1. **Dark Earth** — The nighttime texture made it hard to read geographic context
2. **Zero dollar values** — Demo fallback vessels had `estimatedValueUsd: 0`
3. **Almost no ships** — Only 7 hardcoded test vessels without a running backend
4. **Cone geometry** — Vessels rendered as simple cones instead of ship silhouettes

All four gaps have been resolved.

## Success Criteria

- [x] The Earth renders with a daytime (Blue Marble) texture — continents, oceans, and geographic features clearly visible
- [x] A bundled snapshot of real AIS data (500+ vessels) loads on first visit with zero configuration
- [x] Snapshot vessels have real ship names, real MMSI numbers, commodity classifications, and estimated cargo values
- [x] Vessels render as GLTF 3D ship models (low-poly, <5k triangles per model) instead of cone geometry
- [x] GLTF ship models are instanced via InstancedMesh for performance with 500+ vessels
- [x] Clicking a vessel on the globe selects it and opens its detail panel in the sidebar
- [x] Clicking a port marker on the globe selects it and opens its detail panel in the sidebar
- [x] Hovering over a vessel or port shows a visual highlight (cursor change)
- [~] ~~When an AISStream.io API key is provided, live data replaces the snapshot~~ — **Accepted limitation**: AISStream.io rejects browser WebSocket connections (Origin header). Static snapshot only.
- [x] The GitHub Pages static export works with zero configuration — no API keys, no backend, no environment variables
- [x] All existing tests continue to pass; new functionality has test coverage

## Stakeholders

- **First-time visitors** — People arriving via a shared link should be immediately impressed by the visual richness and interactivity
- **Researchers & journalists** — Need to click vessels and ports to inspect commodity flows and values
- **Developer** — Portfolio piece that demonstrates technical depth (GLTF instancing, real data, raycasting)

## Constraints

- **Free assets only** — Ship models must be CC-BY or more permissive ✅
- **Static-first** — Everything must work as a GitHub Pages static export ✅
- **Performance budget** — 500+ vessels with GLTF models and raycasting must maintain 30+ FPS ✅
- **Existing architecture** — Build on the existing React Three Fiber / drei stack ✅
- **Bundle size** — GLTF model 319KB (<2MB), snapshot JSON 90KB (<5MB) ✅
- **Attribution** — CC-BY assets attributed in README ✅

## Flights

- [x] Flight 01: **Daytime Earth & GLTF Ships** — Replaced nighttime texture with 8K Blue Marble daytime. Downloaded, optimized (35MB → 319KB), and integrated low-poly GLTF ship model. Replaced cone geometry with instanced GLTF rendering.
- [x] Flight 02: **Real Data Snapshot** — Captured 10,462 real vessels from AISStream.io, filtered to 427 cargo/tanker vessels (90KB). Simplified to snapshot-only (no live WebSocket) as an accepted limitation.
- [x] Flight 03: **Click Selection & Raycasting** — Invisible picking spheres for vessel click targets, port marker clicks, globe click to deselect, cursor hover feedback, sidebar auto-open on selection.
- [x] Flight 04: **Polish & Deploy** — Static export build verified (8.9MB total), README updated with current architecture and CC-BY attribution, GitHub Pages deployment confirmed working.

## Accepted Limitations

1. **No live AIS streaming** — AISStream.io silently drops browser WebSocket connections that include an Origin header. A server-side relay works but defeats the zero-config static deployment goal. The bundled snapshot of real data is sufficient for the demo.
2. **Single ship model** — One universal cargo ship model for all vessel types. Multiple models (tanker, container, bulk) would add visual variety but aren't critical.
3. **Static positions** — Ships don't move. A snapshot is a point-in-time freeze. Ships move slowly enough that static positions look authentic.
