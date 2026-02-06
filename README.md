# Where's Waldo

Real-time maritime AI supply chain tracker. Watch ships carrying semiconductors, lithium, cobalt, rare earths, nickel, and copper move across the globe in real time.

## What It Does

A 3D globe visualization showing the world's AI-critical supply chains:

- **Real-time vessel tracking** via AIS data (AISStream.io WebSocket)
- **Commodity classification** — vessels classified by cargo type using AIS ship type codes, destination ports, and proximity heuristics
- **Value estimation** — estimated cargo value based on vessel dimensions and commodity prices
- **31 key ports** across 9 regions with commodity-specific trade routes
- **Interactive filters** — toggle commodities on/off, search by vessel name or MMSI
- **Detail panel** — vessel and port information with global statistics

## Tech Stack

- **Frontend**: Next.js 15, React 19, Three.js (react-three-fiber), Tailwind CSS 4
- **3D**: Instanced meshes, great-circle arc rendering, post-processing (Bloom, Vignette)
- **Backend**: Custom WebSocket server relaying AIS data to browser clients
- **Data**: AISStream.io (free), bundled commodity/port reference data

## Getting Started

```bash
npm install
```

### Development (with mock AIS data)

```bash
# Terminal 1: Mock AIS server
npm run dev:mock

# Terminal 2: App server (WebSocket relay + Next.js)
npm run dev:server

# Terminal 3: Next.js frontend (with Turbopack)
npm run dev
```

### Development (with live AIS data)

1. Register at [aisstream.io](https://aisstream.io/) for a free API key
2. Copy `.env.local.example` to `.env.local` and set your key
3. Run `npm run dev:server` and `npm run dev`

### Production

```bash
npm run build
npm run build:server
npm start
```

## Commodities Tracked

| Commodity | Color | Key Ports |
|-----------|-------|-----------|
| Semiconductors | Rose | Kaohsiung, Busan, Shanghai |
| Lithium | Green | Port Hedland, Antofagasta, Iquique |
| Cobalt | Purple | Dar es Salaam, Durban, Mombasa |
| Rare Earths | Amber | Lianyungang, Tianjin, Shenzhen |
| Nickel | Cyan | Sulawesi (Morowali), Surigao, Manila |
| Copper | Orange | Antofagasta, Callao, Santos |

## Deployment

### GitHub Pages (static demo)

Automated via `.github/workflows/pages.yml` on push to `main`. Runs without a backend — uses demo vessel data.

### Vercel / Cloudflare (full-stack)

Deploy as a standard Next.js app. Set environment variables:

```
AISSTREAM_API_KEY=your_key
AIS_UPSTREAM_URL=wss://stream.aisstream.io/v0/stream
```

## Architecture

```
Browser
  ├── 3D Globe (Three.js / react-three-fiber)
  │   ├── Earth sphere with night map texture
  │   ├── Atmosphere shader (rim glow)
  │   ├── Vessel instances (cone geometry, commodity-colored)
  │   ├── Port markers (sphere geometry, throughput-scaled)
  │   ├── Shipping lanes (great-circle arcs, commodity-colored)
  │   └── Post-processing (Bloom + Vignette)
  └── UI Chrome (React / Tailwind)
      ├── TopBar (filters, search, live indicator)
      └── Sidebar (stats, details, port list)

Server
  ├── Upstream: WebSocket to AISStream.io
  ├── VesselStore: In-memory position + static data
  ├── Commodity Enrichment: Classification + valuation on static data receipt
  └── Downstream: WebSocket broadcast to browser clients
```

## License

MIT
