# Leg: 05-test-vessels-and-ports

**Status**: queued
**Flight**: [3D Globe Foundation](../flight.md)

## Objective

Render test ship models (GLTF) and port markers on the globe at known coordinates, with shipping lane arcs connecting port pairs. Prove the full marker rendering pipeline using InstancedMesh for performance.

## Context

- Design decision: GLTF ship models via InstancedMesh for 1000+ vessel scalability (see flight.md)
- Design decision: Port markers as emissive instanced spheres that bloom with the post-processing pipeline
- The globe and coordinate projection utility exist from leg 02
- Post-processing (selective bloom) is active from leg 03 — emissive markers will glow automatically
- Test data uses real port coordinates but fake vessel positions along known shipping lanes

## Inputs

- Working globe with atmosphere, OrbitControls, and post-processing (from legs 01-03)
- `latLonToXYZ()` utility (from leg 02)
- GLTF ship model file (needs to be sourced and added to `public/models/`)

## Outputs

- Ship GLTF model loaded and rendered at test coordinates via InstancedMesh
- Port markers rendered as glowing spheres at 5+ major ports
- Shipping lane arcs rendered between connected port pairs
- Test data module with hardcoded vessel/port/route definitions
- All markers correctly positioned on the globe surface using latLonToXYZ

## Acceptance Criteria

- [ ] A GLTF ship model (or colored 3D arrow/cone fallback) renders at 5+ test ocean coordinates
- [ ] Ships are oriented tangent to the globe surface (not pointing toward center)
- [ ] Port markers render as glowing emissive spheres at these ports: Shanghai (31.2°N, 121.5°E), Rotterdam (51.9°N, 4.5°E), Singapore (1.3°N, 103.8°E), Los Angeles (33.7°N, 118.3°W), Busan (35.1°N, 129.1°E)
- [ ] Port markers visibly bloom due to emissive material + post-processing
- [ ] At least 3 shipping lane arcs render as curved lines between port pairs (e.g., Shanghai→LA, Rotterdam→Singapore, Busan→LA)
- [ ] Shipping lanes have a visible glow/color (cyan or accent-colored)
- [ ] InstancedMesh is used for ships (not individual mesh per ship) — verified by checking that a single draw call renders all ships
- [ ] All markers are visible from the default camera position and discoverable by rotating the globe

## Verification Steps

- Open localhost:3000 and rotate the globe to find East Asia — confirm Shanghai port marker glows
- Rotate to Europe and confirm Rotterdam port marker glows
- Zoom into a shipping lane and confirm the arc is visible between ports
- Confirm ships are visible as 3D objects on ocean areas
- Check browser DevTools (Three.js inspector or console) to verify InstancedMesh usage
- Confirm bloom makes port markers and lane arcs glow distinctly against the dark globe

## Implementation Guidance

1. **Source a ship model**
   - Find a free low-poly cargo ship GLTF/GLB on Sketchfab (CC license) or create a simple one
   - Target: < 5000 triangles, single mesh if possible (simplifies instancing)
   - Place in `public/models/cargo-ship.glb`
   - **Fallback**: If model sourcing takes too long, create a simple `ConeGeometry` (pointed end = bow) with accent-colored material. This is perfectly acceptable for the demo and can be swapped later.

2. **Create test data module**
   ```
   src/data/test-markers.ts
   ```
   ```typescript
   export interface Port {
     name: string;
     lat: number;
     lon: number;
     value: number; // relative throughput (0-1 for scaling)
   }

   export interface Vessel {
     id: string;
     lat: number;
     lon: number;
     heading: number; // degrees from north
     speed: number;
     type: string;
   }

   export interface ShippingLane {
     from: string; // port name
     to: string;   // port name
     commodity: string;
   }

   export const TEST_PORTS: Port[] = [
     { name: 'Shanghai', lat: 31.2, lon: 121.5, value: 1.0 },
     { name: 'Rotterdam', lat: 51.9, lon: 4.5, value: 0.7 },
     { name: 'Singapore', lat: 1.3, lon: 103.8, value: 0.9 },
     { name: 'Los Angeles', lat: 33.7, lon: -118.3, value: 0.6 },
     { name: 'Busan', lat: 35.1, lon: 129.1, value: 0.8 },
     { name: 'Kaohsiung', lat: 22.6, lon: 120.3, value: 0.75 },
   ];

   export const TEST_VESSELS: Vessel[] = [
     // Pacific Ocean vessels
     { id: 'V001', lat: 35.0, lon: -160.0, heading: 270, speed: 14, type: 'container' },
     { id: 'V002', lat: 30.0, lon: -140.0, heading: 90, speed: 12, type: 'bulk' },
     { id: 'V003', lat: 25.0, lon: 170.0, heading: 45, speed: 16, type: 'container' },
     // Indian Ocean vessels
     { id: 'V004', lat: 5.0, lon: 80.0, heading: 315, speed: 13, type: 'tanker' },
     { id: 'V005', lat: -10.0, lon: 60.0, heading: 0, speed: 11, type: 'bulk' },
   ];

   export const TEST_LANES: ShippingLane[] = [
     { from: 'Shanghai', to: 'Los Angeles', commodity: 'semiconductors' },
     { from: 'Rotterdam', to: 'Singapore', commodity: 'mixed' },
     { from: 'Busan', to: 'Los Angeles', commodity: 'electronics' },
     { from: 'Shanghai', to: 'Rotterdam', commodity: 'rare-earths' },
   ];
   ```

3. **Build Vessels component with InstancedMesh**
   ```
   src/components/globe/Vessels.tsx
   ```
   - Load the GLTF model with `useGLTF` from drei
   - Create an `InstancedMesh` with `count` = number of vessels
   - In a `useEffect` or `useFrame`, set each instance's matrix:
     1. Convert lat/lon to xyz using `latLonToXYZ(lat, lon, 1.01)` (slightly above surface)
     2. Create a rotation quaternion to orient the ship tangent to the globe (normal = direction from center to position, then apply heading rotation around that normal)
     3. Apply scale based on vessel type
     4. Call `instancedMesh.setMatrixAt(i, matrix)`
   - Set `instancedMesh.instanceMatrix.needsUpdate = true`
   - **Fallback**: Use `ConeGeometry` if GLTF loading is problematic

4. **Build PortMarkers component**
   ```
   src/components/globe/PortMarkers.tsx
   ```
   - Use `InstancedMesh` with `SphereGeometry` (small radius, e.g., 0.015)
   - Material: `MeshStandardMaterial` with `emissive` set to accent cyan, `emissiveIntensity` > 1.0 (this triggers bloom)
   - Position each instance at `latLonToXYZ(lat, lon, 1.005)` (just above surface)
   - Scale each marker based on the port's `value` property
   - Optional: Add a pulsing animation in `useFrame` by oscillating emissive intensity

5. **Build ShippingLanes component**
   ```
   src/components/globe/ShippingLanes.tsx
   ```
   - For each lane, generate a great-circle arc between the two ports:
     1. Get xyz positions for both ports
     2. Interpolate along the great circle with 50-100 intermediate points
     3. Lift each point slightly above the globe surface (radius 1.01 + altitude curve)
   - Render using `<Line>` from drei with `lineWidth={1.5}`, accent cyan color
   - Or use `TubeGeometry` with small radius for a 3D lane that can bloom
   - Material should be emissive to trigger bloom glow

6. **Great-circle interpolation utility**
   ```
   src/lib/geo.ts (add to existing)
   ```
   - `function greatCirclePoints(lat1, lon1, lat2, lon2, segments, altitude): Vector3[]`
   - Use spherical linear interpolation (slerp) between the two points
   - Add a height curve (parabolic) so arcs rise above the globe surface

7. **Integrate into GlobeScene**
   - Add `<Vessels />`, `<PortMarkers />`, and `<ShippingLanes />` as children in the scene
   - They should be siblings of `<Globe />` and `<Atmosphere />`

## Edge Cases

- **Ship orientation on globe surface**: Ships must be oriented tangent to the sphere, not in world space. Calculate the surface normal at each position and align the ship's "up" vector with it, then rotate around the normal for heading.
- **Dateline crossing**: Shipping lanes between Shanghai and Los Angeles cross the Pacific. The great-circle arc must handle longitude wrapping correctly (going east across the Pacific, not west through the Atlantic).
- **GLTF model scale**: Free models come in wildly different scales. Apply a normalizing scale factor so ships appear as small markers on the globe, not continent-sized.
- **Z-fighting**: Markers placed exactly on the globe surface (radius = 1.0) may z-fight with the globe texture. Offset all markers slightly above the surface (radius 1.005-1.02).

## Files Affected

- `src/data/test-markers.ts` — Created (test data)
- `src/components/globe/Vessels.tsx` — Created (instanced ship rendering)
- `src/components/globe/PortMarkers.tsx` — Created (instanced port markers)
- `src/components/globe/ShippingLanes.tsx` — Created (arc rendering)
- `src/components/scene/GlobeScene.tsx` — Modified (add Vessels, PortMarkers, ShippingLanes)
- `src/lib/geo.ts` — Modified (add greatCirclePoints)
- `public/models/cargo-ship.glb` — Added (ship model, or fallback to ConeGeometry)

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
