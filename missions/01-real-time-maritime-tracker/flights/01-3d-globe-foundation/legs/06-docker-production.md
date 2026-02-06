# Leg: 06-docker-production

**Status**: queued
**Flight**: [3D Globe Foundation](../flight.md)

## Objective

Finalize the Docker containerization for production deployment. Verify the multi-stage build works, the container serves the app correctly, and document the build/run workflow.

## Context

- An initial Dockerfile and docker-compose.yml were created in leg 01
- The full application (globe, UI, markers, post-processing) is complete from legs 01-04
- Snapshot testing is available from leg 05
- This leg ensures the Docker build actually works end-to-end with the full application
- The container needs to be ready for potential hosting by tomorrow's demo
- Next.js standalone output mode is required for an optimized Docker image

## Inputs

- Complete application with all features from legs 01-05
- Initial Dockerfile from leg 01 (may need updates for static assets, textures, models)
- docker-compose.yml from leg 01

## Outputs

- Production-ready multi-stage Dockerfile
- Working docker-compose.yml that builds and serves the app
- `.dockerignore` optimized to exclude unnecessary files
- The containerized app renders the globe correctly on localhost:3000
- Build and run commands documented

## Acceptance Criteria

- [ ] `docker compose build` completes successfully with no errors
- [ ] `docker compose up` starts the container and serves the app on localhost:3000
- [ ] The containerized app renders the 3D globe with all visual elements (dark texture, atmosphere, ships, ports, lanes, bloom, vignette, UI chrome)
- [ ] The production Docker image is under 500MB
- [ ] Static assets (textures, models) are included in the Docker image and load correctly
- [ ] The container starts in under 10 seconds
- [ ] The Dockerfile uses multi-stage build (build stage + production stage)
- [ ] `.dockerignore` excludes node_modules, .git, test-artifacts, and other unnecessary files

## Verification Steps

- Run `docker compose build` and confirm it completes
- Run `docker compose up -d` and then open localhost:3000 in a browser
- Verify the globe, ships, ports, lanes, and UI are all rendering correctly
- Run `docker images` and confirm the image size is under 500MB
- Run `docker compose down` to clean up
- Time the startup: `time docker compose up -d` — should be fast

## Implementation Guidance

1. **Update Dockerfile for production**
   ```dockerfile
   # Build stage
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   # Production stage
   FROM node:20-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV=production
   ENV NEXT_TELEMETRY_DISABLED=1

   # Create non-root user
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs

   # Copy standalone output
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   COPY --from=builder /app/public ./public

   USER nextjs
   EXPOSE 3000
   ENV PORT=3000
   ENV HOSTNAME="0.0.0.0"

   CMD ["node", "server.js"]
   ```

2. **Verify next.config.ts has standalone output**
   ```typescript
   const nextConfig = {
     output: 'standalone',
     // ... other config
   };
   ```
   This is critical — without it, the `.next/standalone` directory won't be generated and the Docker build will fail.

3. **Update docker-compose.yml**
   ```yaml
   services:
     app:
       build:
         context: .
         dockerfile: Dockerfile
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
       restart: unless-stopped
   ```

4. **Optimize .dockerignore**
   ```
   .git
   .gitignore
   node_modules
   .next
   test-artifacts
   test-results
   tests
   *.md
   .flight-ops
   missions
   .env*
   playwright.config.ts
   playwright-report
   ```

5. **Test the full build cycle**
   - `docker compose build` — should complete in 1-3 minutes
   - `docker compose up -d` — should start in < 10 seconds
   - Open browser to localhost:3000 and verify rendering
   - `docker compose down` — clean up

6. **Verify static asset serving**
   - Check that `public/textures/earth-dark.jpg` loads in the container
   - Check that `public/models/cargo-ship.glb` loads in the container (if used)
   - The `COPY --from=builder /app/public ./public` line in the Dockerfile handles this
   - In the running container, verify with browser DevTools network tab that texture/model requests return 200

## Edge Cases

- **node:alpine + native dependencies**: If any npm package has native bindings (unlikely for this stack), alpine may fail. Switch to `node:20-slim` (Debian-based) as a fallback.
- **Missing .next/standalone**: If the build doesn't produce this directory, check that `output: 'standalone'` is in next.config. This is the most common Docker build failure with Next.js.
- **Public directory not copied**: The standalone build does NOT include the `public/` directory automatically. The `COPY --from=builder /app/public ./public` line is mandatory.
- **Port binding conflicts**: If port 3000 is in use, docker-compose will fail. User can change the host port mapping (e.g., `3001:3000`).
- **Large texture files**: If the Earth texture is very large (>10MB), it will inflate the Docker image. Consider compressing to WebP or using a lower resolution texture for the Docker build.

## Files Affected

- `Dockerfile` — Modified (finalize multi-stage build with all assets)
- `docker-compose.yml` — Modified (finalize service configuration)
- `.dockerignore` — Modified (optimize exclusions)
- `next.config.ts` — Verified (standalone output must be set)

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
