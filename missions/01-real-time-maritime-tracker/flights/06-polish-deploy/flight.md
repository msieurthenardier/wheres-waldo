# Flight 06: Polish & Deploy

**Status**: landed
**Branch**: `flight/06-polish-deploy`

## Objective

Performance optimization for large vessel counts, responsive design for mobile, README documentation, and deployment verification.

## Pre-Flight Checklist

- [x] All previous flights merged — full visualization and interactive UI operational
- [x] GitHub Pages workflow already configured
- [x] Static export build passes

## Legs

### Leg 01: Performance Optimization

- [x] Add `MAX_VISIBLE_VESSELS` cap (5000) in Vessels component to prevent GPU overload
- [x] Add `frustumCulled={false}` on instanced mesh (globe always visible, skip per-instance checks)
- [x] Commodity filter short-circuit when all 6 commodities active (skip filtering loop)

### Leg 02: Responsive Design

- [x] TopBar: mobile filter drawer with FILTER toggle button (hidden on lg+)
- [x] TopBar: mobile search input appears in drawer when filter is expanded
- [x] Sidebar: full-width on mobile (`w-full sm:w-80`) for usable touch targets
- [x] Filter chips and subtitle hidden on small screens, accessible via drawer

### Leg 03: README & Documentation

- [x] Write comprehensive README.md with setup instructions
- [x] Document all 6 tracked commodities with colors and key ports
- [x] Architecture diagram (text-based)
- [x] Deployment instructions for GitHub Pages, Vercel, and Cloudflare

### Leg 04: Build Verification

- [x] `npx tsc --noEmit` — zero errors
- [x] `npx vitest run` — 82 tests, all pass
- [x] `GITHUB_PAGES=true npx next build` — static export succeeds
- [x] `npx next build` — standalone build succeeds

## Post-Flight Checklist

- [x] 82 tests pass
- [x] TypeScript clean
- [x] Both build modes (standalone + static export) succeed
- [x] README documents full setup and deployment
- [x] Mobile-responsive UI verified
