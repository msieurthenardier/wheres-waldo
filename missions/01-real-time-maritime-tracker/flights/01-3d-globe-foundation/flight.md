# Flight: 3D Globe Foundation

**Status**: planning
**Mission**: [Real-Time Maritime AI Supply Chain Tracker](../../mission.md)

## Contributing to Criteria

- [ ] A 3D globe renders in the browser with realistic Earth imagery, navigable via mouse/touch (rotate, zoom, tilt)
- [ ] Vessels render as 3D ship models (GLTF), scaled by estimated cargo dollar value
- [ ] Ports render as visible nodes on the globe, scaled by estimated throughput dollar value
- [ ] The UI has a dark, high-contrast "command center" aesthetic — not a generic dashboard

---

## Pre-Flight

### Objective

Stand up a navigable 3D globe in the browser with the command-center aesthetic established. The globe renders with a dark Earth texture, atmospheric glow, and post-processing effects (selective bloom, vignette). Test ship models (GLTF) and port markers render at known coordinates to prove the rendering pipeline. The project is containerized with Docker and has browser snapshot testing via Playwright for visual validation. This flight establishes the entire visual language and technical foundation for all subsequent flights.

### Open Questions

- [x] CesiumJS vs Three.js → see Design Decisions
- [x] react-globe.gl vs custom globe → see Design Decisions
- [x] Earth texture source for dark aesthetic → see Design Decisions
- [x] Ship model source → see Design Decisions

### Design Decisions

**3D Library: Three.js + react-three-fiber v9 (NOT CesiumJS)**
- Rationale: Resium (CesiumJS React bindings) has no stable React 19 support — stuck in beta since Feb 2025 with `ReactCurrentDispatcher` errors. CesiumJS adds ~23MB bundle, requires complex webpack config for Next.js, and its photorealistic defaults fight against the dark command-center aesthetic. R3F v9 has full React 19 support, MIT license, ~500KB bundle, trivial Next.js integration, and excels at stylized visuals with selective bloom and custom shaders.
- Trade-off: No built-in WGS84 coordinate system — we implement a simple spherical `lat/lon → xyz` projection utility. More than adequate for vessel tracking (not sub-meter survey work).

**Globe Approach: Custom globe in R3F (NOT react-globe.gl)**
- Rationale: react-globe.gl has documented performance degradation at scale, limited shader customization, and a wrapper-over-wrapper architecture that blocks deep visual control. A custom SphereGeometry + dark texture + atmosphere shader gives total control over every visual element.
- Trade-off: More initial code than react-globe.gl, but the upfront cost is modest (sphere + texture + projection) and we gain complete aesthetic control.

**Earth Texture: NASA Blue Marble / Natural Earth dark variant**
- Rationale: Free, public domain, high resolution. We use a dark/night variant (NASA Black Marble or color-adjusted Blue Marble) to establish the command-center mood from the start. City lights texture overlaid for visual interest.
- Trade-off: Need to source and optimize texture files, but these are freely available.

**Ship Models: Free GLTF from Sketchfab/similar, rendered via InstancedMesh**
- Rationale: InstancedMesh renders 1000+ identical geometries in a single draw call. We load one GLTF cargo ship model and instance it across all vessel positions with per-instance transforms.
- Trade-off: All ships look the same in v1 (differentiated by scale/color, not model). Multiple model types can be added later.

**Post-Processing: @react-three/postprocessing (selective bloom + vignette)**
- Rationale: Selective bloom allows port markers and ship trails to glow while the globe stays matte. Vignette darkens edges for cinematic framing. All composable in a single merged EffectPass for minimal perf cost.
- Trade-off: Slight GPU overhead, but modern GPUs handle this trivially.

**Browser Testing: Playwright for screenshot capture**
- Rationale: Playwright has mature WebGL support, headless Chrome screenshot APIs, and can capture the actual rendered globe. Provides visual regression testing and generates presentation-ready screenshots.
- Trade-off: Requires Chrome/Chromium installation in CI/Docker, but Playwright handles this automatically.

**Containerization: Multi-stage Docker build**
- Rationale: Consistent builds, easy hosting for the demo. Multi-stage keeps the production image small (node:alpine for runtime).
- Trade-off: Minor complexity added to project setup, but essential for deployment reliability.

### Prerequisites

- [ ] Node.js 20+ available on development machine
- [ ] Docker available on development machine
- [ ] ~~Free NASA Blue Marble / dark Earth textures sourced~~ → Moved to Leg 00
- [ ] ~~Free GLTF ship model sourced~~ → Moved to Leg 00

### Pre-Flight Checklist

- [ ] All open questions resolved
- [ ] Design decisions documented
- [ ] Prerequisites verified
- [ ] Validation approach defined
- [ ] Legs defined

---

## In-Flight

### Technical Approach

Build a Next.js 15 application with React 19 and TypeScript. **Asset sourcing happens first** to verify texture and GLTF availability (with fallback to simplified geometry if needed). The 3D rendering layer uses react-three-fiber v9 with a custom globe component (SphereGeometry + dark Earth texture + atmospheric limb shader). The UI shell provides a dark command-center chrome around the canvas, then post-processing adds selective bloom on emissive elements and vignette for cinematic framing. Test vessel positions render as GLTF ship models via InstancedMesh (or colored cones as fallback). Port markers render as instanced emissive spheres. Playwright captures browser screenshots for visual testing. Docker containerizes the full application.

**Flight structure: 7 legs + ~5-hour buffer for iteration** (~14.5 hours total available).

**Key packages:**
- `next@15`, `react@19`, `react-dom@19`, `typescript`
- `three`, `@react-three/fiber@9`, `@react-three/drei`, `@react-three/postprocessing`
- `playwright` (dev dependency)
- `tailwindcss` for utility styling

**Coordinate system:**
```
function latLonToXYZ(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}
```

### Checkpoints

- [ ] NASA dark Earth textures and GLTF ship model sourced and verified (or fallback geometry ready)
- [ ] Next.js app boots with R3F canvas rendering a sphere
- [ ] Dark Earth globe renders with atmosphere and is navigable (rotate/zoom/tilt)
- [ ] Dark command-center UI chrome wraps the canvas
- [ ] Post-processing effects (bloom, vignette) applied to scene
- [ ] Test ship GLTF models (or fallback geometry) visible at known coordinates
- [ ] Port markers glow with emissive material at known coordinates
- [ ] Playwright captures a screenshot of the rendered globe
- [ ] Docker container builds and serves the app

### Adaptation Criteria

**Divert if**:
- react-three-fiber v9 has critical bugs with React 19 that block rendering
- WebGL performance on the target machine is insufficient for globe + post-processing
- GLTF ship model loading causes memory issues that require a fundamentally different approach

**Acceptable variations**:
- Swap Earth texture source if preferred one has quality issues
- Adjust post-processing intensity (bloom threshold, vignette darkness)
- Use simplified ship geometry (colored cones/arrows) if GLTF model sourcing takes too long
- Use node:20-slim instead of node:alpine for Docker if build issues arise

### Legs

> **Note:** These are tentative suggestions, not commitments. Legs are planned and created one at a time as the flight progresses. This list will evolve based on discoveries during implementation.

- [ ] `00-asset-sourcing` — Download and verify NASA Blue Marble/Black Marble dark Earth texture (~8K resolution). Source free GLTF cargo ship model from Sketchfab or similar. Test-load both assets in Three.js to confirm format compatibility. **Fallback:** If GLTF sourcing exceeds 20 minutes, use simplified colored cone geometry for ships. ⏱️ ~30 min
- [ ] `01-project-scaffold` — Initialize Next.js 15 + React 19 + TypeScript project. Install Three.js/R3F/drei/postprocessing. Set up Tailwind CSS. Create project structure with placeholder components. Add initial Dockerfile and docker-compose.yml. Verify the app boots with a basic R3F canvas. ⏱️ ~1 hour
- [ ] `02-globe-core` — Build the custom globe component: SphereGeometry with dark Earth texture, atmospheric limb glow shader, OrbitControls for navigation (rotate/zoom/tilt). Implement the lat/lon → xyz coordinate projection utility. Globe renders centered in viewport with smooth interaction. ⏱️ ~1.5 hours
- [ ] `03-command-center-chrome` — Create the UI shell: dark theme via Tailwind + CSS variables, top bar with title/placeholder controls, collapsible right sidebar, main canvas area. Establish the visual language — fonts, colors, layout structure. Focus on chrome only, defer post-processing to next leg. ⏱️ ~1.5 hours
- [ ] `04-post-processing` — Apply post-processing to the R3F scene: selective bloom on emissive materials, vignette for cinematic framing. Configure EffectComposer and EffectPass. Tune bloom threshold and vignette intensity for command-center aesthetic. ⏱️ ~1 hour
- [ ] `05-test-vessels-and-ports` — Load GLTF cargo ship model (or fallback geometry) and render test vessels at known coordinates using InstancedMesh. Create port markers as emissive instanced spheres at major port locations (Shanghai, Rotterdam, Singapore, Los Angeles, Busan). **Stretch goal:** Add shipping lane arcs between port pairs using TubeGeometry or Line with glow if time permits. Prove the full marker pipeline. ⏱️ ~2 hours
- [ ] `06-snapshot-testing` — Set up Playwright with headless Chromium. Write test scripts that launch the app, wait for WebGL render, and capture full-page screenshots of the globe from multiple angles. Store screenshots in a test-artifacts directory. Verify screenshots show globe, ships, and ports. ⏱️ ~45 min
- [ ] `07-docker-production` — Finalize multi-stage Dockerfile (build stage + production stage). Optimize Next.js build for production. Verify docker-compose up serves the app on localhost. Test that the containerized app renders correctly. Document the build/run commands. ⏱️ ~45 min

---

## Post-Flight

### Completion Checklist

- [ ] All legs completed
- [ ] Code merged
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Flight debrief completed

### Verification

1. `npm run dev` launches the app and a dark 3D globe is visible, navigable via mouse
2. Test ship models (GLTF or fallback geometry) are visible at known ocean coordinates
3. Port markers glow at major port locations
4. *(Stretch)* Shipping lane arcs connect port pairs if time permitted
5. The UI has dark command-center aesthetic with bloom/vignette effects
6. `npx playwright test` captures screenshots showing the rendered globe
7. `docker compose up` builds and serves the app successfully
8. Screenshots are presentation-quality for tomorrow's demo
