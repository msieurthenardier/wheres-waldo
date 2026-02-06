# Leg: 03-command-center-chrome

**Status**: queued
**Flight**: [3D Globe Foundation](../flight.md)

## Objective

Create the dark command-center UI shell around the 3D canvas. Focus on chrome only (layout, colors, fonts) — post-processing effects are deferred to leg 04.

## Context

- Design decision: Dark, high-contrast "command center / video game" aesthetic (see mission.md)
- The globe is rendering from leg 02 — this leg wraps it in the UI chrome
- Post-processing (bloom, vignette) is handled in leg 04 — this leg focuses on layout and styling
- The UI layout must accommodate future panels: top bar for filters/search, right sidebar for details
- Think "XCOM command screen" or "EVE Online star map" — not a corporate dashboard
- Estimated duration: ~1.5 hours

## Inputs

- Working globe rendering in R3F canvas (from legs 01-02)
- Tailwind CSS configured with dark theme (from leg 01)
- Globe with atmosphere glow (from leg 02)

## Outputs

- Top bar component with title, placeholder filter chips, and status indicators
- Collapsible right sidebar with placeholder content
- Consistent color palette and typography established
- The full-page layout with globe as the hero element

## Acceptance Criteria

- [ ] A top bar renders across the top with the app title "WHERE'S WALDO" (or similar), styled with glow/accent colors
- [ ] A right sidebar panel exists, collapsible, with placeholder "Selected Entity" content
- [ ] The globe canvas fills the remaining viewport (full height minus top bar, full width minus sidebar when open)
- [ ] The color palette uses deep blacks (#000000-#0a0a0f), accent cyan/teal (#00fff2-#0ff), and high-contrast white text
- [ ] Monospace or technical font is used for data/labels (e.g., JetBrains Mono, Space Mono, or similar from Google Fonts)
- [ ] The overall aesthetic reads as "command center / video game" — not a generic dashboard
- [ ] Layout is responsive — sidebar hidden on mobile, top bar stacks

## Verification Steps

- Open localhost:3000 and confirm the dark UI chrome wraps the globe
- Verify the top bar is visible with title and accent styling
- Click the sidebar toggle and confirm it opens/closes
- Resize to mobile width and confirm layout adapts

## Implementation Guidance

1. **Define the color system**
   ```
   src/app/globals.css (CSS variables)
   ```
   ```css
   :root {
     --bg-primary: #000000;
     --bg-secondary: #0a0a0f;
     --bg-panel: #0d1117;
     --border-subtle: #1a1f2e;
     --accent-primary: #00fff2;    /* Cyan/teal glow */
     --accent-secondary: #0ea5e9;  /* Blue accent */
     --accent-warning: #f59e0b;    /* Amber for alerts */
     --text-primary: #e2e8f0;
     --text-secondary: #64748b;
     --text-accent: #00fff2;
   }
   ```
   Also add these to the Tailwind config as custom colors.

2. **Load technical font**
   - Use `next/font/google` to load a monospace font (JetBrains Mono or Space Mono)
   - Apply as the default body font or as a utility class for data labels
   - Consider a secondary sans-serif (Inter or Geist) for UI text

3. **Build the layout structure**
   ```
   src/components/ui/TopBar.tsx
   src/components/ui/Sidebar.tsx
   src/components/ui/Layout.tsx
   ```
   - `Layout.tsx`: Flexbox wrapper — top bar fixed at top, main area fills remaining height, sidebar overlays or pushes from right
   - `TopBar.tsx`: Fixed height (~48-56px), contains logo/title on left, placeholder filter chips in center, status indicators on right. Semi-transparent background with blur (`backdrop-blur-md bg-black/60`). Bottom border with accent glow.
   - `Sidebar.tsx`: Fixed width (~320px), slides in from right, has sections for "Selected Entity" details. Toggle button visible even when collapsed. Same semi-transparent + blur treatment.

4. **Style the top bar**
   - Title "WHERE'S WALDO" in monospace, with `text-shadow` glow in accent cyan
   - Placeholder chips: "Semiconductors", "Lithium", "Cobalt" styled as outlined pills with accent border
   - Right side: small status dot (green = "LIVE") and a timestamp
   - Use `border-b border-[var(--border-subtle)]` with a subtle glow

5. **Style the sidebar**
   - Header: "INTEL PANEL" or "DETAIL VIEW" in monospace
   - Body: placeholder text "Select a vessel or port for details"
   - Sections separated by thin accent-colored dividers
   - Collapse/expand with a chevron button

6. **Update page layout**
   - `page.tsx` uses `<Layout>` wrapping `<GlobeScene />`
   - Globe canvas should use `position: absolute; inset: 0` within its container for full-bleed rendering
   - Top bar and sidebar overlay the canvas with semi-transparent backgrounds

## Edge Cases

- **Z-index layering**: The R3F Canvas renders in a WebGL context. HTML UI elements (top bar, sidebar) must be positioned above it with appropriate z-index. Use a wrapper div structure rather than trying to mix HTML and R3F.
- **Font loading flash**: Use `next/font` with `display: 'swap'` to prevent layout shifts during font loading.
- **Sidebar width on small screens**: On screens < 768px, sidebar should be hidden by default and overlay full-width when opened.
- **Transparency + blur support**: `backdrop-filter: blur()` has good browser support but can be GPU-intensive. Provide a solid fallback.

## Files Affected

- `src/app/globals.css` — Modified (add CSS custom properties, color system)
- `src/app/layout.tsx` — Modified (add font loading, apply dark class)
- `src/app/page.tsx` — Modified (use Layout component)
- `src/components/ui/TopBar.tsx` — Created
- `src/components/ui/Sidebar.tsx` — Created
- `src/components/ui/Layout.tsx` — Created
- `tailwind.config.ts` — Modified (add custom colors from CSS variables)

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
