# Mission: Interactive Demo Experience

**Status**: active

## Outcome

Opening the deployed GitHub Pages site feels like stepping into a live command center — without any setup. Hundreds of real ships sit at their actual ocean positions, each rendered as a recognizable 3D vessel model with real names, real MMSIs, and estimated cargo values. Clicking a ship highlights it and opens its detail panel in the sidebar. The daytime Earth is vivid and readable beneath the data layer. For users who provide an AISStream.io API key, vessels update in real time — but the bundled snapshot of real data is impressive enough on its own.

## Context

Mission 01 delivered a complete 3D globe with AIS integration, commodity filtering, and search. However, the deployed GitHub Pages experience has four visible gaps:

1. **Dark Earth** — The nighttime texture makes it hard to read geographic context beneath shipping lanes and port markers
2. **Zero dollar values** — Demo fallback vessels have `estimatedValueUsd: 0` because enrichment only happens server-side
3. **Almost no ships** — Only 7 hardcoded test vessels appear without a running backend, making the globe feel empty
4. **Cone geometry** — Vessels render as simple cones instead of recognizable ship silhouettes

Beyond fixing these, the globe lacks interactivity — you can look but not touch. Clicking a vessel or port should open its details.

The key insight: real AIS data can be captured as a static JSON snapshot and bundled into the build. No fake data generators needed — the demo shows real ships at real positions. Ships barely move, so a static snapshot looks authentic. When an API key is provided, the app upgrades to live streaming.

## Success Criteria

- [ ] The Earth renders with a daytime (Blue Marble) texture — continents, oceans, and geographic features clearly visible
- [ ] A bundled snapshot of real AIS data (500+ vessels) loads on first visit with zero configuration
- [ ] Snapshot vessels have real ship names, real MMSI numbers, commodity classifications, and estimated cargo values
- [ ] Vessels render as GLTF 3D ship models (low-poly, <5k triangles per model) instead of cone geometry
- [ ] GLTF ship models are instanced via InstancedMesh for performance with 500+ vessels
- [ ] Clicking a vessel on the globe selects it and opens its detail panel in the sidebar
- [ ] Clicking a port marker on the globe selects it and opens its detail panel in the sidebar
- [ ] Hovering over a vessel or port shows a visual highlight (color change or glow)
- [ ] When an AISStream.io API key is provided (env var or URL param), live data replaces the snapshot
- [ ] The GitHub Pages static export works with zero configuration — no API keys, no backend, no environment variables
- [ ] All existing tests continue to pass; new functionality has test coverage

## Stakeholders

- **First-time visitors** — People arriving via a shared link should be immediately impressed by the visual richness and interactivity
- **Researchers & journalists** — Need to click vessels and ports to inspect commodity flows and values
- **Developer** — Portfolio piece that demonstrates technical depth (GLTF instancing, real data, raycasting)

## Constraints

- **Free assets only** — Ship models must be CC-BY or more permissive (Sketchfab, Poly Pizza, etc.)
- **Static-first** — Everything must work as a GitHub Pages static export; live AIS is an optional upgrade
- **Performance budget** — 500+ vessels with GLTF models and raycasting must maintain 30+ FPS on mid-range hardware
- **Existing architecture** — Build on the existing React Three Fiber / drei stack; no framework changes
- **Bundle size** — GLTF models should total <2MB after compression (use `gltfjsx --transform`); snapshot JSON should be <5MB
- **Attribution** — CC-BY assets require visible attribution (in README and/or about panel)

## Environment Requirements

- Node.js / Next.js development environment (existing)
- `gltfjsx` CLI for GLTF optimization and React component generation
- Free GLTF ship models from Sketchfab (CC-BY 4.0)
- NASA Blue Marble or Solar System Scope daytime Earth texture (public domain / CC-BY 4.0)
- AISStream.io API key (free registration) for snapshot capture and live mode
- GitHub Pages deployment (existing workflow)

## Open Questions

- [ ] How many distinct ship model types needed? (1 universal vs. 2-3 for tanker/container/bulk)
- [ ] Should snapshot capture be a CLI script or a dev-mode UI feature?
- [ ] How often should the bundled snapshot be refreshed? (weekly? monthly?)
- [ ] Should the API key input be a URL parameter, localStorage setting, or both?

## Flights

> **Note:** These are tentative suggestions, not commitments. Flights are planned and created one at a time as work progresses. This list will evolve based on discoveries during implementation.

- [x] Flight 01: **Daytime Earth & GLTF Ships** — Replace nighttime texture with Blue Marble daytime. Download, optimize, and integrate low-poly GLTF ship model(s). Replace cone geometry with instanced GLTF rendering.
- [ ] Flight 02: **Real Data Snapshot** — Build a capture script that connects to AISStream.io, collects 500+ enriched vessel positions, and saves as a static JSON. Bundle the snapshot as default data. Hybrid fallback: snapshot on load, live WebSocket when API key provided.
- [ ] Flight 03: **Click Selection & Raycasting** — Add click handlers to instanced vessel mesh and port markers. Wire selection to sidebar detail panels. Add hover highlighting. Globe click deselects.
- [ ] Flight 04: **Polish & Deploy** — Performance verification with 500+ vessels. Attribution for CC-BY assets. Final GitHub Pages deployment validation.
