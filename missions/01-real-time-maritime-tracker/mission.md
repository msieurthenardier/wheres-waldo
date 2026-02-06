# Mission: Real-Time Maritime AI Supply Chain Tracker

**Status**: active

## Outcome

Anyone can open a browser and see — on a 3D globe — where the world's AI-critical resources are right now. Ships carrying semiconductors, lithium, cobalt, nickel, rare earths, and copper move across the ocean in real time, scaled by estimated cargo value. Ports glow proportionally to the dollar value flowing through them. Shipping lanes light up between origin and destination. It feels like a command center from a video game, but every data point is real.

## Context

The AI hardware supply chain is one of the most strategically important and least visible systems in the world. TSMC in Taiwan fabricates 90% of advanced chips. Lithium flows from Australia and Chile. Cobalt comes from the Congo. Rare earths are processed almost exclusively in China. These resources traverse chokepoints like the Taiwan Strait, Strait of Malacca, and Suez Canal — yet there's no accessible, public tool that makes this visible.

Where's Waldo makes the invisible visible. It combines free AIS vessel tracking data with public trade statistics to create a real-time, value-weighted visualization of the AI supply chain on a 3D globe.

## Success Criteria

- [ ] A 3D globe renders in the browser with realistic Earth imagery, navigable via mouse/touch (rotate, zoom, tilt)
- [ ] Real-time vessel positions stream onto the globe from AIS data (AISStream.io WebSocket)
- [ ] Vessels render as 3D ship models (GLTF), scaled by estimated cargo dollar value
- [ ] Ports render as visible nodes on the globe, scaled by estimated throughput dollar value
- [ ] Shipping paths/routes render as arcs or lines connecting origin and destination ports
- [ ] Users can filter vessels by commodity type (semiconductors, lithium, cobalt, nickel, rare earths, copper)
- [ ] Users can search for specific vessels, ports, or commodities
- [ ] A top panel provides filtering controls, search, and global stats
- [ ] A right sidebar shows details on selected vessels, ports, or routes
- [ ] The UI has a dark, high-contrast "command center" aesthetic — not a generic dashboard
- [ ] All data sources are free-tier (no paid API subscriptions)
- [ ] The application is publicly deployable (Vercel/Cloudflare)

## Stakeholders

- **General public** — Anyone curious about where AI resources come from and how they move
- **Researchers & journalists** — People investigating supply chain concentration, chokepoints, and geopolitical risk
- **Developer** (you) — A compelling portfolio project and personal research tool

## Constraints

- **Free data only** — No paid API subscriptions. Primary AIS source: AISStream.io (free WebSocket streaming). Supplemented by BarentsWatch, Kystverket, UN Comtrade, USGS
- **Browser-based** — Must run in modern browsers without plugins or installs
- **Full-stack web app** — React/Next.js frontend, backend API for data ingestion and value estimation
- **No user accounts** — Public tool, no authentication required for v1
- **Performance** — Must handle thousands of concurrent vessel positions without degrading the 3D experience

## Environment Requirements

- Node.js / Next.js development environment
- 3D globe library: CesiumJS or Three.js + react-globe.gl (to be decided in Flight 01)
- Free 3D ship models (GLTF/GLB) from Sketchfab or similar
- AISStream.io API key (free registration)
- Vercel or Cloudflare for deployment

## Open Questions

- [ ] CesiumJS vs Three.js/react-three-fiber — which gives the best "video game" aesthetic with GLTF ship support?
- [ ] How to estimate cargo $ value from AIS data (vessel type, size, route) + trade statistics?
- [ ] What vessel types in AIS data correlate to AI-critical commodity transport (bulk carriers, container ships, tankers)?
- [ ] How to map AIS vessel positions to specific commodity routes vs. generic shipping?
- [ ] Should the backend be a persistent server (WebSocket relay) or serverless functions?
- [ ] What's the right level of ship model detail for performance with 1000+ vessels?
- [ ] How to handle AIS data gaps (vessels going dark, poor coverage areas)?

## Flights

> **Note:** These are tentative suggestions, not commitments. Flights are planned and created one at a time as work progresses. This list will evolve based on discoveries during implementation.

- [x] Flight 01: **3D Globe Foundation** — Get a navigable 3D globe rendering in the browser with the command-center aesthetic. Evaluate CesiumJS vs Three.js. Render test ship models and port markers. Establish the visual language.
- [x] Flight 02: **AIS Data Pipeline** — Connect to AISStream.io WebSocket, parse AIS messages, store/relay vessel positions to the frontend. Backend architecture for real-time data flow.
- [x] Flight 03: **Value Estimation Engine** — Build the commodity classification and dollar-value estimation system. Map vessel types and routes to commodities. Integrate UN Comtrade / USGS data for value weighting.
- [ ] Flight 04: **Ships, Ports & Paths** — Render real vessels as scaled 3D models, ports as scaled nodes, and shipping routes as path arcs. Apply value-based sizing to all three.
- [ ] Flight 05: **Search, Filter & Detail Panels** — Top panel with commodity filters and search. Right sidebar with vessel/port/route detail views. Global statistics overlay.
- [ ] Flight 06: **Polish & Deploy** — Performance optimization for large vessel counts. Responsive design. Public deployment to Vercel/Cloudflare. README and landing experience.
