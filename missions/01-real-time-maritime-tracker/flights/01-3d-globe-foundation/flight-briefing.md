# Flight Briefing: 3D Globe Foundation

**Date**: 2026-02-05
**Flight**: [3D Globe Foundation](flight.md)
**Status**: Flight is ready for review

## Mission Context

Where's Waldo is a real-time maritime AI supply chain tracker rendered on a 3D globe. This first flight establishes the visual foundation: a dark, navigable 3D globe with the "command center" aesthetic, test vessel and port markers, browser screenshot testing, and Docker containerization. Everything after this flight builds on the rendering pipeline and visual language established here.

**Timeline pressure**: Demo tomorrow 11am CST. This flight must be fast, pragmatic, and presentation-ready.

## Objective

Stand up a navigable 3D globe in the browser with:
- Dark Earth texture and atmospheric glow
- Post-processing effects (selective bloom, vignette)
- Test ship models and port markers at real coordinates
- Shipping lane arcs between port pairs
- Dark command-center UI chrome
- Playwright screenshot testing
- Docker containerization

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 3D Library | **Three.js + R3F v9** (not CesiumJS) | Resium broken on React 19, CesiumJS fights dark aesthetic, 23MB bundle |
| Globe approach | **Custom SphereGeometry** (not react-globe.gl) | Performance at scale, full shader control, aesthetic ownership |
| Ship rendering | **InstancedMesh** with GLTF (cone fallback) | Single draw call for 1000+ vessels |
| Post-processing | **@react-three/postprocessing** | Selective bloom, vignette, composable effect passes |
| Testing | **Playwright** | Mature WebGL support, headless Chrome screenshots |
| Styling | **Tailwind CSS** with CSS custom properties | Dark theme, utility-first, fast iteration |

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| GLTF ship model sourcing takes too long | Fallback to ConeGeometry colored arrows — perfectly fine for demo |
| Earth texture quality/size issues | Multiple free sources (NASA Blue Marble, Black Marble); 2K fallback if 4K too large |
| WebGL performance on target machine | R3F + InstancedMesh is highly optimized; post-processing can be dialed back |
| Playwright can't capture WebGL | Chromium's SwiftShader software renderer handles this; add render-ready signals |
| Docker build fails with standalone | Verify `output: 'standalone'` early in leg 01; fallback to node:slim if alpine issues |
| React 19 + R3F v9 incompatibility | R3F v9 explicitly targets React 19; well-tested ecosystem |

## Legs Overview

1. `01-project-scaffold` — Next.js 15 + React 19 + TypeScript + deps + Docker init — **Foundation**
2. `02-globe-core` — Custom globe with dark texture + atmosphere + OrbitControls — **Core visual**
3. `03-command-center-chrome` — UI shell + post-processing + color system — **Visual language**
4. `04-test-vessels-and-ports` — GLTF ships + port markers + shipping lanes — **Data visualization**
5. `05-snapshot-testing` — Playwright screenshot capture — **Testing + presentation assets**
6. `06-docker-production` — Production Docker build + verification — **Deployment readiness**

## Environment Requirements

- Node.js 20+
- Docker
- Modern browser with WebGL support (Chrome recommended)
- ~200MB disk for Earth textures and GLTF models

## Success Criteria

The flight succeeds when:
1. A dark 3D globe renders in the browser, navigable via mouse
2. Test ship models are visible at ocean coordinates
3. Port markers glow at major port locations
4. Shipping lane arcs connect port pairs
5. The UI has the dark command-center aesthetic with bloom/vignette
6. Playwright captures presentation-quality screenshots
7. `docker compose up` serves the app in a container
