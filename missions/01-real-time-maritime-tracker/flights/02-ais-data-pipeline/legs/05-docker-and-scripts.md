# Leg: 05-docker-and-scripts

**Status**: completed
**Flight**: [AIS Data Pipeline](../flight.md)

## Objective

Update the Dockerfile to use the custom server entrypoint instead of the default Next.js standalone server. Bundle the custom TypeScript server with esbuild for production. Update docker-compose.yml with AIS environment variables. This is the final leg of Flight 02.

## Acceptance Criteria

- [ ] `esbuild` added as devDependency
- [ ] `build:server` npm script bundles `src/server/index.ts` → `.next/standalone/server.js` with `next` and `ws` as externals
- [ ] Dockerfile runs `build:server` after `next build`, producing a custom server.js in the standalone output
- [ ] `docker-compose.yml` passes `AISSTREAM_API_KEY` and `AIS_UPSTREAM_URL` as environment variables
- [ ] `npm run build && npm run build:server` succeeds without errors
- [ ] `npx vitest run` passes all tests
- [ ] `npx tsc --noEmit` reports zero TypeScript errors

## Files Affected

- `package.json` -- Add `esbuild` devDep, `build:server` script
- `Dockerfile` -- Add `build:server` step, keep same CMD
- `docker-compose.yml` -- Add AIS environment variables

---

## Post-Completion Checklist

- [ ] All acceptance criteria verified
- [ ] Tests passing
- [ ] Update flight-log.md with leg progress entry
- [ ] Set this leg's status to `completed`
- [ ] Check off this leg in flight.md
- [ ] **Final leg**: Update flight.md status to `landed`
- [ ] Commit all changes together
