# Leg: 02-globe-core

**Status**: completed
**Flight**: [3D Globe Foundation](../flight.md)

## Objective

Build the custom 3D globe component with a dark Earth texture, atmospheric limb glow, and smooth OrbitControls navigation (rotate, zoom, tilt).

## Context

- Design decision: Custom globe in R3F, not react-globe.gl (see flight.md)
- Design decision: NASA Blue Marble dark/night texture for command-center aesthetic
- The lat/lon → xyz projection utility is needed for all future coordinate-based rendering
- This leg builds on the R3F Canvas established in leg 01
- The globe should feel cinematic — dark ocean, subtle land masses, atmospheric blue glow on the limb

## Inputs

- Working Next.js project with R3F Canvas (from leg 01)
- `src/components/scene/GlobeScene.tsx` exists with basic Canvas
- Earth texture files need to be sourced and added to `public/textures/`

## Outputs

- Custom `Globe` component rendering a textured sphere with atmosphere
- `latLonToXYZ` utility function for coordinate projection
- OrbitControls configured for smooth globe navigation
- Earth texture files in `public/textures/`
- Globe fills the main canvas area and is navigable

## Acceptance Criteria

- [ ] A textured sphere renders in the R3F scene using a dark Earth texture (night/dark variant)
- [ ] The globe has a visible atmospheric glow effect on its limb (edge)
- [ ] OrbitControls allow rotation (click-drag), zoom (scroll), and tilt (right-click drag)
- [ ] OrbitControls have min/max zoom limits to prevent clipping through or zooming too far out
- [ ] `latLonToXYZ(lat, lon, radius)` correctly converts geographic coordinates to 3D positions (verified with known test points)
- [ ] The globe auto-rotates slowly when not being interacted with
- [ ] The scene background is solid black (space)

## Verification Steps

- Open localhost:3000 and confirm the dark Earth globe is visible
- Rotate the globe with click-drag and confirm smooth rotation
- Zoom in/out with scroll and confirm limits work
- Verify atmosphere glow is visible as a blue/cyan halo around the globe edge
- Verify auto-rotation stops on interaction and resumes after release
- Run a manual check: `latLonToXYZ(0, 0, 1)` should place a point on the prime meridian/equator intersection

## Implementation Guidance

1. **Source Earth textures**
   - Download NASA Blue Marble night/dark texture (or NASA Black Marble)
   - Recommended: 4K resolution (4096x2048) for quality, with a 2K fallback
   - Place in `public/textures/earth-dark.jpg` (or `.webp` for size)
   - Optionally source a separate bump map (`earth-bump.jpg`) for subtle surface relief
   - If sourcing takes too long, a solid dark blue sphere with continent outlines is an acceptable placeholder

2. **Build the Globe component**
   ```
   src/components/globe/Globe.tsx
   ```
   - `'use client'` component
   - `<mesh>` with `<sphereGeometry args={[1, 64, 64]}>` (radius 1, high segment count for smooth sphere)
   - `<meshStandardMaterial>` with `map` set to the Earth texture, `roughness: 1`, `metalness: 0`
   - Use `useTexture` from `@react-three/drei` for texture loading

3. **Add atmospheric glow**
   ```
   src/components/globe/Atmosphere.tsx
   ```
   - Render a slightly larger transparent sphere around the globe
   - Use a custom `ShaderMaterial` with a Fresnel-based fragment shader:
     - Transparent at face-on angles, glowing blue/cyan at grazing angles
     - This creates the atmospheric limb glow effect
   - Parameters: `atmosphereColor` (default: `#4da6ff`), `intensity` (default: 1.5), `power` (default: 3.0)
   - Set `side: BackSide`, `transparent: true`, `depthWrite: false`

4. **Implement lat/lon → xyz utility**
   ```
   src/lib/geo.ts
   ```
   ```typescript
   export function latLonToXYZ(
     lat: number,
     lon: number,
     radius: number = 1
   ): [number, number, number] {
     const phi = (90 - lat) * (Math.PI / 180);
     const theta = (lon + 180) * (Math.PI / 180);
     return [
       -(radius * Math.sin(phi) * Math.cos(theta)),
       radius * Math.cos(phi),
       radius * Math.sin(phi) * Math.sin(theta),
     ];
   }
   ```

5. **Configure OrbitControls**
   - Use `<OrbitControls>` from `@react-three/drei`
   - `enablePan={false}` — panning doesn't make sense on a globe
   - `minDistance={1.2}` — prevent clipping into the globe
   - `maxDistance={4.0}` — prevent zooming too far out
   - `enableDamping={true}` — smooth deceleration
   - `dampingFactor={0.05}` — subtle inertia
   - `autoRotate={true}` — slow auto-rotation
   - `autoRotateSpeed={0.3}` — very slow, cinematic

6. **Update GlobeScene**
   - Replace the test sphere from leg 01 with `<Globe />` and `<Atmosphere />`
   - Set camera position to `[0, 0, 2.5]` for a good initial view
   - Keep `<ambientLight intensity={0.1}>` for subtle fill
   - Add a directional light to simulate sun illumination from one side

## Edge Cases

- **Texture loading delay**: Use `useTexture` with a `Suspense` boundary and a loading fallback (e.g., solid dark sphere)
- **Mobile touch controls**: OrbitControls from drei handles touch events automatically (one-finger rotate, pinch zoom, two-finger tilt)
- **Coordinate system handedness**: Three.js uses right-handed coordinates. The `latLonToXYZ` function must account for this — the negative X in the formula handles the flip
- **HiDPI displays**: R3F Canvas handles device pixel ratio automatically, but verify textures aren't blurry on Retina

## Files Affected

- `src/components/globe/Globe.tsx` — Created (main globe mesh)
- `src/components/globe/Atmosphere.tsx` — Created (atmospheric glow shader)
- `src/components/scene/GlobeScene.tsx` — Modified (add Globe, Atmosphere, OrbitControls, lighting)
- `src/lib/geo.ts` — Created (latLonToXYZ utility)
- `public/textures/earth-dark.jpg` — Added (dark Earth texture)
- `public/textures/earth-bump.jpg` — Added (optional bump map)

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
