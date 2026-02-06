# Flight Debrief: AIS Data Pipeline

**Date**: 2026-02-06
**Flight**: [AIS Data Pipeline](flight.md)
**Status**: landed
**Duration**: 2026-02-06 (single session)
**Legs Completed**: 6 of 6

## Outcome Assessment

### Objectives Achieved

The flight fully achieved its objective: a real-time AIS data pipeline connects AISStream.io's WebSocket API to the frontend globe via a custom Next.js server relay. The complete data flow — AIS source -> parser/store -> WebSocket relay -> browser hook -> 3D globe — is operational end-to-end with both mock and live data sources.

Specifically delivered:
- TypeScript type system for AIS messages with parser/normalizer and in-memory vessel store
- Mock AIS server generating synthetic vessels on great-circle routes between ports
- Custom Next.js server with upstream WebSocket relay and downstream browser endpoint
- React hook with RAF-batched updates, exponential backoff reconnection, and test data fallback
- Docker production build with esbuild-bundled custom server
- 45 passing tests, zero TypeScript errors

### Mission Criteria Advanced

| Criterion | Status | Notes |
|-----------|--------|-------|
| Real-time vessel positions stream onto the globe from AIS data | **Advanced** | Full pipeline operational; live data flows when API key configured |
| All data sources are free-tier | **Advanced** | AISStream.io free tier confirmed; mock server enables zero-cost development |
| The application is publicly deployable | **Advanced** | Docker deployment updated with custom server; env vars for API key passthrough |

## What Went Well

### Leg specifications were exceptionally detailed
Every leg document included complete implementation guidance with code examples, edge case analysis, and test specifications. The parser leg (00) documented every AIS sentinel value. The relay leg (02) included the full downstream message protocol. The hook leg (03) identified the R3F context boundary issue upfront. This level of detail enabled near-mechanical execution with minimal improvisation.

### Architecture decisions made upfront paid off
The flight's pre-flight design decisions were thorough and well-reasoned:
- **Custom Next.js server over serverless** — Correctly identified that persistent WebSocket connections are incompatible with Vercel serverless. This avoided a costly mid-flight pivot.
- **`ws` library in noServer mode** — Clean integration with the existing HTTP server, no Socket.IO overhead.
- **Mock server implementing the real AISStream.io protocol** — The mock was interchangeable with the live endpoint via a single URL environment variable. This made every subsequent leg testable without external dependencies.
- **Server-side filtering with bounding boxes** — Prevented the client from being overwhelmed by global AIS traffic.

### Clean layered architecture
The codebase has excellent separation of concerns:
- `lib/ais/` — Pure data layer (types, parser, store) with no server or React dependencies
- `server/` — Server-side relay (upstream, downstream, index) depending only on the data layer
- `hooks/` — Client-side hook depending only on types and test data
- `components/` — Rendering layer consuming hook output via props

Each layer is independently testable and the dependency graph flows in one direction.

### Test strategy was effective
The three-tier test approach worked well:
- **Unit tests** (32 tests) for parser/store — Pure function testing, fast, deterministic
- **Smoke tests** (3 tests) for mock server — Protocol verification with real WebSocket connections
- **Integration tests** (3 tests) for relay — Full pipeline verification (mock -> relay -> client)
- **Pure function tests** (7 tests) for hook message processing — Extracted testable logic from React hook

### Performance patterns anticipated correctly
The leg specs correctly identified performance concerns and prescribed solutions:
- `requestAnimationFrame` batching in the hook prevents render thrashing
- `key={count}` on InstancedMesh forces remount when vessel count changes (R3F limitation)
- Delta detection in VesselStore prevents redundant downstream broadcasts
- NaN-safe comparison with `Object.is()` handles AIS sentinel values

### esbuild bundling for Docker was clean
Bundling the TypeScript custom server to a single CJS file (12.6kb) that replaces the default Next.js standalone `server.js` was an elegant solution. It avoids shipping TypeScript or tsx in the production container, keeps the Docker image small, and required only minimal Dockerfile changes.

## What Could Be Improved

### Process

- **Leg 04 (Live AIS Integration) was underspecified as a "configuration-only" leg.** While it correctly identified the `.gitignore` negation issue (`!.env.local.example`), it couldn't include actual data observations because live verification requires a human with an API key. The leg spec recommended documenting observed data characteristics, but since execution was autonomous without a real API key available, the flight log entry was limited to confirming the configuration pipeline. Consider separating "configuration setup" legs (automatable) from "manual verification" legs (require human) in future flights.

- **Leg 05 (Docker and Scripts) was lean compared to others.** It had only 3 acceptance criteria and no implementation guidance section. While this was appropriate for the scope (the leg was straightforward), it suggests the leg sizing heuristic could be refined — simple legs can use an abbreviated format rather than the full template.

- **Flight log Decisions/Deviations/Anomalies sections were empty.** Despite several runtime decisions being made (reverting the `--env-file` approach for dev:server, the `.gitignore` negation fix), these weren't captured in the flight log's structured sections. They appear in leg summaries instead. The flight log format should be used more actively during execution.

### Technical

- **No `.env.local` auto-loading in dev:server.** The `tsx --watch` runtime doesn't load Next.js-style `.env.local` files. Users must export environment variables manually or prefix the command. This is a minor DX friction point. Adding `dotenv/config` import or using Node 20's `--env-file` flag (with existence check) would improve the developer experience. Deferred intentionally because `--env-file` fails if the file doesn't exist and loses `--watch` mode.

- **Bounding boxes are hard-coded in upstream.ts.** The six AI supply chain bounding boxes are constants in source code. For the current mission this is fine, but if bounding box tuning is needed in Flight 03/04 (based on observed traffic patterns), it would require code changes rather than configuration. Consider extracting to a config file or environment variable in a future flight.

- **VesselStore.getAll() returns the internal Map directly.** Callers could accidentally mutate it. This hasn't caused issues because the two consumers (downstream snapshot and eviction) are well-behaved, but it's a latent risk. A defensive copy or read-only wrapper would be safer.

- **No heartbeat/ping mechanism.** The flight spec mentioned heartbeat pings as an acceptable variation to skip. Browser WebSocket connections can silently die (especially on mobile or flaky networks) without a ping/pong mechanism to detect stale connections. The hook's reconnection handles server-side disconnects but not silent connection death.

### Documentation

- **README.md doesn't exist.** The project has no top-level README. CLAUDE.md is minimal (14 lines). While `.flight-ops/` contains methodology documentation, a developer-facing README with setup instructions, architecture overview, and screenshot would significantly improve onboarding. This should be addressed in Flight 06 (Polish & Deploy).

- **CLAUDE.md could be more comprehensive.** It references `.flight-ops/` docs but doesn't document project-specific conventions (path aliases, test commands, dev workflow, architecture). A richer CLAUDE.md would improve future flight execution.

## Deviations and Lessons Learned

| Deviation | Reason | Standardize? |
|-----------|--------|--------------|
| Reverted `node --env-file=.env.local` for dev:server | Fails if `.env.local` doesn't exist; loses `--watch` mode | No — keep `tsx --watch` for DX; document manual env export |
| `.gitignore` needed `!.env.local.example` negation | `.env*` glob was too broad; standard pattern for keeping example files | Yes — always add negation for `.env.*.example` files |
| Leg 05 used abbreviated format (no implementation guidance) | Scope was simple enough to not need detailed guidance | Yes — allow abbreviated leg format for simple configuration/script changes |
| `processDownstreamMessage` extracted as pure function | Avoids needing `@testing-library/react` for hook testing | Yes — extract pure logic from hooks for easier testing |

## Key Learnings

1. **R3F context boundary is a critical architectural constraint.** React Three Fiber uses its own reconciler inside `<Canvas>`. Any hook that uses DOM APIs (WebSocket, fetch, timers) must be called outside `<Canvas>` and data passed in as props. This should be documented in CLAUDE.md and noted in future leg specs that touch the 3D rendering layer.

2. **Mock servers that implement the real protocol are invaluable.** The mock AIS server's fidelity to the AISStream.io protocol meant every subsequent leg could be developed and tested without network access. The `AIS_UPSTREAM_URL` environment variable pattern (pointing to either mock or real) is a reusable pattern for any external API integration.

3. **esbuild is excellent for bundling custom Next.js servers.** The standalone output pattern (replacing the default `server.js` with a custom esbuild-bundled one) keeps Docker deployment simple while supporting TypeScript and path aliases in server code. This pattern should be documented for reuse.

4. **Delta detection at the store level prevents cascading performance issues.** By returning a boolean from `updatePosition()`, the store enables the relay to skip redundant broadcasts, which prevents the hook from triggering unnecessary re-renders. This "gate at the source" pattern is more efficient than throttling downstream.

5. **`requestAnimationFrame` batching is essential for high-frequency WebSocket data.** Without RAF batching, each position update would trigger a React re-render. With 50+ updates/second from the relay, this would destroy frame rate. The dirty-flag + RAF flush pattern coalesces all updates into a single render per frame.

## Recommendations

1. **Add a developer-facing README.md** (Flight 06) with setup instructions, architecture diagram, and screenshots. Include the dev workflow: `dev:mock` + `dev:server` for local development, env var configuration for live data.

2. **Enrich CLAUDE.md** with project conventions: path alias usage, test commands, R3F context boundary rule, custom server architecture, and the mock/live upstream URL pattern.

3. **Add dotenv loading to the custom server** for improved DX. A conditional `import('dotenv/config')` with a try/catch, or a small shell wrapper script, would eliminate the need to manually export env vars.

4. **Consider a heartbeat/ping mechanism** for the downstream WebSocket connections before Flight 05 (Search, Filter & Detail Panels), when users will be interacting with live data and silent connection death becomes more impactful.

5. **Extract bounding box configuration** to a JSON config file or environment variable before Flight 03 (Value Estimation Engine), as commodity-specific route filtering may need different geographic coverage.

## Skill Effectiveness Analysis

### Mission Skill
- Mission provided excellent context: the "command center" aesthetic, free-tier constraint, and specific commodity focus gave clear direction
- Success criteria were specific and measurable
- Open questions were well-chosen and resolved during flight planning

### Flight Skill
- Pre-flight design decisions were comprehensive and well-reasoned — every decision justified with rationale and trade-offs
- The technical approach section gave a clear mental model of the four-layer architecture
- Adaptation criteria were useful (serverless limitation, rate limiting thresholds)
- Checkpoint list covered all key milestones

### Leg Skill
- Leg specs were the standout artifact of this flight — extremely detailed with full code examples
- Edge case sections caught real issues (NaN comparison, AIS padding, `.gitignore` glob)
- Implementation guidance was essentially pair-programming-quality instruction
- The progressive context buildup (each leg referencing learnings from prior legs) was effective
- **Minor improvement**: Allow an abbreviated format for simple legs (like 04 and 05) that don't need 600+ line specs

## Action Items

- [ ] Create README.md with setup instructions and architecture overview (Flight 06)
- [ ] Enrich CLAUDE.md with project conventions and R3F context boundary rule
- [ ] Add dotenv loading to custom server for improved DX
- [ ] Document the esbuild custom server pattern in CLAUDE.md for reuse
- [ ] Consider heartbeat/ping for downstream WebSocket before Flight 05
