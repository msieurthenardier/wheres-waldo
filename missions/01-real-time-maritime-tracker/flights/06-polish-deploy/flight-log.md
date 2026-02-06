# Flight Log — Flight 06: Polish & Deploy

## Entry 1 — Performance

Added vessel count cap at 5000 instances — beyond this, GPU instanced rendering starts to degrade on lower-end hardware. The instanced mesh approach already handles 1000+ efficiently; the cap is a safety valve for scenarios where the AIS stream provides a massive snapshot.

Set `frustumCulled={false}` on the vessel instanced mesh. Since the globe is always centered and visible, per-instance frustum culling is wasted work — the entire instanced mesh should render as a unit.

Added short-circuit in GlobeScene: when all 6 commodities are active (default state), skip the filter loop entirely.

## Entry 2 — Responsive Design

TopBar now has a collapsible filter drawer on mobile:
- Desktop (lg+): filter chips inline in the header bar
- Tablet (md-lg): search visible, filter chips in collapsible drawer via FILTER button
- Mobile (<md): search and filter chips both in collapsible drawer

Sidebar uses full width on mobile (`w-full sm:w-80`) so touch targets are large enough for use on phones.

## Entry 3 — README

Wrote comprehensive README covering:
- Project description and feature list
- Tech stack summary
- Getting started with mock and live AIS data
- Commodity table with colors and key ports
- Deployment options (GitHub Pages, Vercel, Cloudflare)
- Text-based architecture diagram

## Entry 4 — Build Verification

Verified all four quality gates:
1. TypeScript: zero errors
2. Tests: 82/82 passing
3. Static export: `GITHUB_PAGES=true next build` succeeds, outputs to `out/`
4. Standalone: `next build` succeeds, outputs to `.next/standalone/`

## Outcome

Application is polished, documented, and ready for deployment. The GitHub Pages workflow will automatically deploy the static demo on push to main.
