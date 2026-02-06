# Leg: 04-post-processing

**Status**: queued
**Flight**: [3D Globe Foundation](../flight.md)

## Objective

Apply post-processing effects to the R3F scene: selective bloom on emissive materials and vignette for cinematic framing. Configure EffectComposer and tune parameters for the command-center aesthetic.

## Context

- Split from original leg 03 to keep scope focused
- The globe and UI chrome are complete from legs 01-03
- Post-processing makes emissive materials (atmosphere, future port markers) glow
- @react-three/postprocessing provides composable React components for effects
- Estimated duration: ~1 hour

## Inputs

- Working globe with atmosphere and UI chrome (from legs 01-03)
- @react-three/postprocessing already installed (from leg 01)
- Atmosphere component with emissive/bright shader (from leg 02)

## Outputs

- EffectComposer pipeline added to GlobeScene
- Selective bloom active on emissive materials
- Vignette darkening screen edges
- Tuned parameters for the command-center look

## Acceptance Criteria

- [ ] EffectComposer renders without errors in the R3F canvas
- [ ] Bloom effect causes the atmosphere glow to bloom visibly
- [ ] Non-emissive surfaces (globe texture, UI) do NOT bloom
- [ ] Vignette visibly darkens the edges/corners of the viewport
- [ ] No significant frame rate drop from post-processing (maintain 30+ FPS)
- [ ] Bloom threshold, intensity, and vignette darkness are tuned for cinematic look

## Verification Steps

- Open localhost:3000 and confirm atmosphere glow blooms outward
- Verify dark ocean/land areas of globe do not bloom
- Verify screen edges are darker than center (vignette)
- Check FPS in browser DevTools — should be 30+ FPS

## Implementation Guidance

1. **Add EffectComposer to GlobeScene**
   ```tsx
   import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

   // Inside Canvas, after all scene objects:
   <EffectComposer>
     <Bloom
       luminanceThreshold={0.6}
       luminanceSmoothing={0.9}
       intensity={1.5}
     />
     <Vignette eskil={false} offset={0.1} darkness={0.8} />
   </EffectComposer>
   ```

2. **Tune bloom for selectivity**
   - `luminanceThreshold={0.6}` — only bright/emissive materials trigger bloom
   - The atmosphere shader outputs values > 1.0 at grazing angles → blooms
   - The globe texture is dark (values < 0.5) → does not bloom
   - Adjust threshold up if too much blooms, down if atmosphere doesn't bloom enough

3. **Tune vignette for cinematic framing**
   - `offset={0.1}` — how far from edge the darkening starts
   - `darkness={0.8}` — how dark the edges get
   - Should feel subtle, not like looking through a tunnel

4. **Performance check**
   - Post-processing adds GPU overhead
   - If FPS drops below 30, reduce bloom `intensity` or increase `luminanceThreshold`
   - Can also reduce canvas resolution with R3F's `dpr` prop if needed

## Edge Cases

- **Bloom bleeding**: If bloom is too intense, bright areas bleed into nearby dark areas. Increase luminanceThreshold or decrease intensity.
- **Mobile performance**: Post-processing can be heavy on mobile GPUs. For now, desktop-first is fine (demo is on desktop).
- **Effect ordering**: Bloom should come before Vignette in the EffectComposer for correct compositing.

## Files Affected

- `src/components/scene/GlobeScene.tsx` — Modified (add EffectComposer, Bloom, Vignette)

---

## Post-Completion Checklist

**Complete ALL steps before signaling `[COMPLETE:leg]`:**

- [ ] All acceptance criteria verified
- [ ] Tests passing
- [ ] Update flight-log.md with leg progress entry
- [ ] Set this leg's status to `completed` (in this file's header)
- [ ] Check off this leg in flight.md
- [ ] Commit all changes together (code + artifacts)
