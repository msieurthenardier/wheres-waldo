# Where's Waldo

Real-time maritime AI supply chain tracker. Hundreds of real cargo and tanker vessels rendered as 3D ship models on a daytime Earth globe, with commodity classification, value estimation, and click-to-inspect interactivity.

## What It Does

A 3D globe visualization showing the world's AI-critical supply chains:

- **Real vessel data** — 427 cargo and tanker ships from a live AIS snapshot, at their actual ocean positions
- **Commodity classification** — vessels classified by cargo type (semiconductors, lithium, cobalt, rare earths, nickel, copper)
- **Value estimation** — estimated cargo value based on vessel size and commodity prices
- **Click to inspect** — click any vessel or port to see details in the sidebar
- **31 key ports** across 9 regions with commodity-specific trade routes
- **Interactive filters** — toggle commodities on/off, search by vessel name or MMSI

## Tech Stack

- **Frontend**: Next.js 15, React 19, Three.js (react-three-fiber), Tailwind CSS 4
- **3D**: GLTF ship models, instanced meshes (12k capacity), great-circle arcs, post-processing (Bloom, Vignette)
- **Data**: Bundled AIS snapshot (real vessel positions), commodity/port reference data
- **Deployment**: GitHub Pages static export — zero configuration, no backend

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commodities Tracked

| Commodity | Color | Key Ports |
|-----------|-------|-----------|
| Semiconductors | Rose | Kaohsiung, Busan, Shanghai |
| Lithium | Green | Port Hedland, Antofagasta, Iquique |
| Cobalt | Purple | Dar es Salaam, Durban, Mombasa |
| Rare Earths | Amber | Lianyungang, Tianjin, Shenzhen |
| Nickel | Cyan | Sulawesi (Morowali), Surigao, Manila |
| Copper | Orange | Antofagasta, Callao, Santos |

## Architecture

```
Browser (static — no backend required)
  ├── 3D Globe (Three.js / react-three-fiber)
  │   ├── Earth sphere with 8K daytime texture
  │   ├── Atmosphere shader (rim glow)
  │   ├── GLTF ship model instances (commodity-colored)
  │   ├── Port markers (sphere geometry, throughput-scaled)
  │   ├── Shipping lanes (great-circle arcs, commodity-colored)
  │   ├── Click raycasting (invisible picking spheres)
  │   └── Post-processing (Bloom + Vignette)
  └── UI Chrome (React / Tailwind)
      ├── TopBar (commodity filters, search)
      └── Sidebar (vessel/port details, stats, port list)

Data
  └── public/data/ais-snapshot.json (427 real vessels from AISStream.io)
```

## Asset Attribution

- **Earth Texture**: [Solar System Scope](https://www.solarsystemscope.com/textures/) — 8K daytime Blue Marble, CC BY 4.0
- **Ship Model**: [FetchCFD Cargo Ship](https://fetchcfd.com/threeDViewGltf/1491-cargo-ship-3d-model) — optimized with gltfjsx (35MB → 319KB)
- **AIS Data**: [AISStream.io](https://aisstream.io/) — real-time vessel positions, free API

## License

MIT
