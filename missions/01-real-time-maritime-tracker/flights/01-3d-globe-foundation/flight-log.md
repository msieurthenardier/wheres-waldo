# Flight Log: 3D Globe Foundation

**Flight**: [3D Globe Foundation](flight.md)

## Summary

Flight 01 establishing the 3D globe rendering foundation with command-center aesthetic. Using Three.js + react-three-fiber v9 (decided over CesiumJS due to React 19 incompatibility and aesthetic limitations).

---

## Leg Progress

### Leg 00: asset-sourcing ✅ COMPLETED
- **Started**: 2026-02-05 22:10 CST
- **Completed**: 2026-02-05 22:25 CST
- **Duration**: ~15 minutes
- **Status**: Assets sourced and verified
- **Outputs**:
  - `public/textures/earth_nightmap_8k.jpg` (8K night Earth, 3MB)
  - `public/models/cargo-ship.glb` (GLTF ship, 35MB ⚠️ oversized)
  - `public/ASSETS.md` (asset inventory and documentation)

### Leg 01: project-scaffold ✅ COMPLETED
- **Started**: 2026-02-05 22:30 CST
- **Completed**: 2026-02-05 22:45 CST
- **Duration**: ~15 minutes
- **Status**: Project scaffolded, builds, and containerizes
- **Changes Made**:
  - Manual project scaffold (create-next-app conflicted with existing files)
  - Next.js 15.5.12, React 19, TypeScript 5, Tailwind CSS v4 with @tailwindcss/postcss
  - Three.js 0.172 + @react-three/fiber v9 + drei v10 + postprocessing v3
  - Basic R3F Canvas with test sphere in GlobeScene.tsx
  - Page uses `"use client"` + `next/dynamic` with `ssr: false` (required in Next.js 15 App Router)
  - Multi-stage Dockerfile with standalone output, docker-compose.yml
  - `npm run build` succeeds, `docker build` succeeds
- **Anomaly**: `create-next-app` refused to run in non-empty directory — manual scaffold was faster anyway

### Leg 02: globe-core ✅ COMPLETED
- **Started**: 2026-02-05 22:45 CST
- **Completed**: 2026-02-05 22:55 CST
- **Duration**: ~10 minutes
- **Status**: Globe rendering with texture, atmosphere, and controls
- **Changes Made**:
  - `src/components/globe/Globe.tsx` — Textured sphere with 8K night Earth map, Suspense fallback
  - `src/components/globe/Atmosphere.tsx` — Fresnel-based atmospheric limb glow shader (BackSide, transparent)
  - `src/lib/geo.ts` — `latLonToXYZ`, `latLonToVector3`, `greatCirclePoints` utilities
  - `src/components/scene/GlobeScene.tsx` — Integrated Globe, Atmosphere, OrbitControls (no pan, auto-rotate 0.3, damping), ReadySignal for Playwright
  - Build passes clean

---

### Leg 03: command-center-chrome ✅ COMPLETED
- **Started**: 2026-02-05 22:55 CST
- **Completed**: 2026-02-05 23:05 CST
- **Duration**: ~10 minutes
- **Status**: UI chrome complete with command-center aesthetic
- **Changes Made**:
  - `src/components/ui/TopBar.tsx` — Title with cyan glow text-shadow, filter chips (Semiconductors, Lithium, Cobalt, Rare Earths, Copper, Nickel), LIVE status indicator, UTC timestamp
  - `src/components/ui/Sidebar.tsx` — Collapsible intel panel with placeholder stats, toggle chevron
  - `src/components/ui/Layout.tsx` — Full-bleed canvas with overlaid UI chrome (pointer-events-none with pointer-events-auto on interactive elements)
  - Updated page.tsx to wrap GlobeScene in Layout
  - All glass-morphism panels: `bg-black/70 backdrop-blur-md`, accent borders
  - Build passes clean

---

### Leg 04: post-processing ✅ COMPLETED
- **Started**: 2026-02-05 23:05 CST
- **Completed**: 2026-02-05 23:10 CST
- **Duration**: ~5 minutes
- **Status**: Post-processing pipeline active
- **Changes Made**:
  - Added EffectComposer to GlobeScene with Bloom (threshold 0.6, intensity 1.5) and Vignette (offset 0.1, darkness 0.8)
  - Bloom is selective: only emissive/bright materials (atmosphere shader) will glow
  - Build passes clean

---

### Leg 05: test-vessels-and-ports ✅ COMPLETED
- **Started**: 2026-02-05 23:10 CST
- **Completed**: 2026-02-05 23:20 CST
- **Duration**: ~10 minutes
- **Status**: Vessels, ports, and shipping lanes rendering on globe
- **Changes Made**:
  - `src/data/test-markers.ts` — Test data: 6 ports, 7 vessels, 3 shipping lanes
  - `src/components/globe/Vessels.tsx` — ConeGeometry vessels via InstancedMesh, color-coded by type (cyan=container, amber=bulk, red=tanker), oriented tangent to globe
  - `src/components/globe/PortMarkers.tsx` — Emissive instanced spheres with pulse animation, scaled by port value
  - `src/components/globe/ShippingLanes.tsx` — Great-circle arcs using Line from drei, color-coded by commodity
  - Integrated all three into GlobeScene
  - Build passes clean
- **Decision**: Used ConeGeometry fallback instead of 35MB GLTF cargo ship model. Cones are faster to render and perfectly adequate for the demo. GLTF model remains in public/models/ for future use.

---

### Leg 06: snapshot-testing ✅ COMPLETED
- **Started**: 2026-02-05 23:25 CST
- **Completed**: 2026-02-05 23:32 CST
- **Duration**: ~7 minutes
- **Status**: Snapshot testing complete and verified
- **Changes Made**:
  - Playwright installed and configured with Chromium
  - `playwright.config.ts` — Dev server on port 3001, 1920x1080 viewport, 60s timeout
  - `tests/screenshots/globe.spec.ts` — Three test scenarios: default view, zoomed view, rotated view
  - ReadySignal component in GlobeScene for deterministic wait (data-globe-ready attribute)
  - Test passes with 3 screenshots captured in `test-artifacts/screenshots/`
  - Screenshot verification: all > 400KB (well above 50KB threshold), confirmed non-blank
  - `.gitignore` updated to exclude `test-artifacts/` and `test-results/`
  - `package.json` — Added `test:screenshots` script
- **Verification**: Screenshots are presentation-quality, showing full globe with ships, ports, lanes, bloom, vignette, and UI chrome

### Leg 07: docker-production ✅ COMPLETED
- **Started**: 2026-02-06 00:45 CST
- **Completed**: 2026-02-06 01:00 CST
- **Duration**: ~15 minutes
- **Status**: Docker production build verified
- **Changes Made**:
  - `.dockerignore` — Added `playwright.config.ts` exclusion
  - Existing Dockerfile and docker-compose.yml from leg 01 required no changes
  - `next.config.ts` already had `output: "standalone"` configured
- **Verification**:
  - `docker compose build` — success, no errors
  - `docker compose up` — container serves on localhost:3000, HTTP 200
  - Earth texture loads correctly (3.1MB, HTTP 200)
  - Production image size: **377MB** (under 500MB target)
  - Multi-stage build with non-root user (nextjs:nodejs)
  - Container starts in ~2 seconds
- **Note**: Also fixed postprocessing flicker (EffectComposer multisampling conflict) and rewrote atmosphere shader (FrontSide + additive blending) during this session

---

### Flight 01 Complete ✅
- **All 8 legs completed** (00-07)
- **Flight status**: landed
- **Total duration**: ~87 minutes

---

## Decisions

### Vessel Geometry: ConeGeometry Fallback
**Context**: Cargo ship GLB is 35MB — too heavy for instanced rendering in a demo context
**Decision**: Use colored ConeGeometry (pointed end = bow) with per-type coloring
**Impact**: Ships appear as directional arrows rather than detailed models. Visually clear, performant, demo-ready.

*(additional runtime decisions recorded during execution)*

---

## Deviations

*(departures from plan recorded during execution)*

---

## Anomalies

### Leg 00: Ship Model Size
- **Issue**: Cargo ship GLB is 35MB (7x larger than 5MB target)
- **Impact**: May cause loading delays on slow connections
- **Mitigation**: Documented in ASSETS.md with three fallback strategies (ConeGeometry, glTF-Transform optimization, or smaller model)
- **Decision**: Deferred to Leg 05 implementation - will test performance and choose approach then

---

## Session Notes

*(chronological notes from work sessions)*
