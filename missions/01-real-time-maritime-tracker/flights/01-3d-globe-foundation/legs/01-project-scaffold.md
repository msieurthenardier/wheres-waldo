# Leg: 01-project-scaffold

**Status**: queued
**Flight**: [3D Globe Foundation](../flight.md)

## Objective

Initialize the Next.js 15 + React 19 + TypeScript project with all dependencies, project structure, Tailwind CSS, and an initial Docker setup. Verify the app boots with a basic R3F canvas rendering a colored sphere.

## Context

- This is the first leg of the first flight — starting from an empty project
- Design decision: Three.js + react-three-fiber v9 (see flight.md)
- Design decision: Tailwind CSS for styling (utility-first, dark theme friendly)
- Docker is included early so containerization is validated from the start
- The project at ~/projects/wheres-waldo/ has a missions/ directory and .flight-ops/ but no application code yet

## Inputs

- Empty project directory (no package.json, no src/)
- Node.js 20+ available
- Docker available

## Outputs

- Fully initialized Next.js 15 project with TypeScript
- All 3D dependencies installed and importable
- Tailwind CSS configured with dark theme defaults
- Project directory structure established
- Basic R3F `<Canvas>` rendering a test sphere on the index page
- Dockerfile and docker-compose.yml present (initial versions)
- App boots successfully with `npm run dev`

## Acceptance Criteria

- [ ] `package.json` exists with next@15, react@19, react-dom@19, typescript, three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, tailwindcss as dependencies
- [ ] `npm run dev` starts the dev server without errors
- [ ] Navigating to localhost:3000 shows a page with an R3F Canvas containing a visible 3D sphere
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] Tailwind CSS is functional (utility classes apply styles)
- [ ] Dockerfile exists and `docker build .` completes successfully
- [ ] docker-compose.yml exists with a service definition for the app

## Verification Steps

- Run `npm run dev` and confirm server starts on port 3000
- Open localhost:3000 in a browser and visually confirm a 3D sphere renders
- Run `npx tsc --noEmit` and confirm zero errors
- Run `docker build -t wheres-waldo .` and confirm build succeeds
- Confirm Tailwind classes render correctly (e.g., `bg-black text-white` on body)

## Implementation Guidance

1. **Initialize Next.js project**
   - Use `npx create-next-app@latest` with TypeScript, Tailwind CSS, App Router, and ESLint
   - Choose `src/` directory structure
   - Use the `--use-npm` flag for consistency

2. **Install 3D dependencies**
   - `npm install three @react-three/fiber @react-three/drei @react-three/postprocessing`
   - `npm install -D @types/three`

3. **Configure Tailwind for dark theme**
   - Set `darkMode: 'class'` in tailwind config
   - Add dark color palette to theme (deep blacks, accent greens/cyans, high-contrast whites)
   - Apply `dark` class to html element by default

4. **Create project structure**
   ```
   src/
   ├── app/
   │   ├── layout.tsx        # Root layout with dark theme, fonts
   │   ├── page.tsx           # Main page, renders GlobeScene
   │   └── globals.css        # Tailwind imports + CSS variables
   ├── components/
   │   ├── globe/             # Globe-related components (future)
   │   ├── ui/                # UI shell components (future)
   │   └── scene/
   │       └── GlobeScene.tsx # R3F Canvas wrapper ('use client')
   ├── lib/
   │   └── geo.ts             # Coordinate projection utilities (future)
   └── types/
       └── index.ts           # Shared TypeScript types
   ```

5. **Create the test R3F scene**
   - `GlobeScene.tsx`: `'use client'` component with R3F `<Canvas>`
   - Render a `<mesh>` with `<sphereGeometry>` and a basic `<meshStandardMaterial>` in a visible color
   - Add `<ambientLight>` and `<pointLight>` for visibility
   - Set canvas background to black
   - Import dynamically in page.tsx with `next/dynamic` and `{ ssr: false }` to avoid SSR issues with Three.js

6. **Create initial Dockerfile**
   - Multi-stage: `node:20-alpine` for build, `node:20-alpine` for production
   - Build stage: `npm ci && npm run build`
   - Production stage: copy `.next/standalone`, expose port 3000
   - Set `output: 'standalone'` in next.config.ts for Docker optimization

7. **Create docker-compose.yml**
   - Single service `app` building from Dockerfile
   - Port mapping 3000:3000
   - Environment variables for NODE_ENV=production

## Edge Cases

- **R3F + SSR**: Three.js cannot render server-side. The GlobeScene component MUST use `'use client'` directive and be imported with `next/dynamic({ ssr: false })`.
- **Three.js type mismatches**: Ensure `@types/three` version matches `three` version. Pin if needed.
- **Tailwind v4 vs v3**: Next.js 15 `create-next-app` may install Tailwind v4. Either version works but the config format differs. Adapt accordingly.
- **Docker + standalone**: Next.js standalone output requires `output: 'standalone'` in next.config.ts. Without it, the Docker image will be much larger.

## Files Affected

- `package.json` — Created (all dependencies)
- `tsconfig.json` — Created (TypeScript config)
- `next.config.ts` — Created (standalone output, webpack config if needed)
- `tailwind.config.ts` — Created (dark theme, custom colors)
- `src/app/layout.tsx` — Created (root layout)
- `src/app/page.tsx` — Created (main page)
- `src/app/globals.css` — Created (Tailwind + CSS variables)
- `src/components/scene/GlobeScene.tsx` — Created (R3F canvas)
- `Dockerfile` — Created (multi-stage build)
- `docker-compose.yml` — Created (service definition)
- `.dockerignore` — Created (node_modules, .next, .git)

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
