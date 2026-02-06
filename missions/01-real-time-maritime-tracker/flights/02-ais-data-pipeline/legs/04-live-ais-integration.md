# Leg: 04-live-ais-integration

**Status**: completed
**Flight**: [AIS Data Pipeline](../flight.md)

## Objective

Configure the relay server for live AISStream.io data, create a `.env.local.example` template, verify that real vessel data flows end-to-end from AISStream.io through the relay to the globe, and document observed data characteristics.

## Context

- **What exists**: The full AIS pipeline is operational with mock data. The relay server (`src/server/index.ts`) already reads `AIS_UPSTREAM_URL` (defaults to `ws://localhost:9090`) and `AISSTREAM_API_KEY` (defaults to `"mock"`) from environment variables. Bounding boxes covering AI supply chain routes are already defined in `src/server/upstream.ts`. The `.gitignore` already covers `.env*` and `.env.local`.
- **What this leg does**: This is a configuration and verification leg. No significant new code is written. The work is: (1) create a `.env.local.example` file so developers know which env vars to set, (2) document how to obtain an AISStream.io API key, (3) manually verify live data flow, (4) document observed data characteristics (message rate, vessel counts, any rate limits).
- **Prior legs**: Legs 00-03 built the types/parser/store, mock server, relay server, and frontend hook. Everything works end-to-end with mock data. This leg is the first time the real AISStream.io endpoint is used.

## Inputs

What exists before this leg runs:
- `src/server/index.ts` -- Custom server reading `AIS_UPSTREAM_URL` and `AISSTREAM_API_KEY` from env
- `src/server/upstream.ts` -- UpstreamManager with bounding boxes and message type filters already configured
- `.gitignore` -- Already ignores `.env*` and `.env.local`
- `package.json` -- Has `dev:server` and `dev:mock` scripts

## Outputs

What exists after this leg completes:
- `.env.local.example` -- Template showing required environment variables with placeholder values
- `.env.local` -- Actual env file with real API key (gitignored, not committed)
- Updated flight log with data characteristics observations

## Acceptance Criteria

- [ ] `.env.local.example` exists at project root with `AISSTREAM_API_KEY` and `AIS_UPSTREAM_URL` placeholders
- [ ] `.env.local.example` is committed (not gitignored -- it is a template)
- [ ] `.env.local` contains a valid AISStream.io API key and is NOT committed
- [ ] Running `npm run dev:server` with `AIS_UPSTREAM_URL=wss://stream.aisstream.io/v0/stream` and a valid `AISSTREAM_API_KEY` connects to AISStream.io (confirmed by "Upstream connected" log message)
- [ ] Live vessel position messages appear in server console logs within 30 seconds of connection
- [ ] Opening `http://localhost:3000` shows vessels on the globe that are receiving live AIS data (not mock data, not static test data)
- [ ] Flight log updated with observed data characteristics: approximate message rate, number of unique vessels seen within 5 minutes, any errors or rate limit messages

## Verification Steps

1. Confirm `.env.local.example` exists and contains the two env var placeholders
2. Confirm `.env.local` exists locally with a real API key, and `git status` does NOT show it as a tracked/staged file
3. Run `AIS_UPSTREAM_URL=wss://stream.aisstream.io/v0/stream npm run dev:server` -- observe "Upstream connected" in logs
4. Wait 30 seconds -- observe position update log messages appearing
5. Open `http://localhost:3000` in a browser -- vessels appear on the globe and update positions over time
6. After 5 minutes, note approximate vessel count and message rate in flight log

## Implementation Guidance

### 1. Create `.env.local.example`

Create a file at the project root named `.env.local.example` with:

```
# AISStream.io API key (required for live AIS data)
# Register for free at https://aisstream.io/ to get your key
AISSTREAM_API_KEY=your_api_key_here

# Upstream AIS WebSocket URL
# - For live data: wss://stream.aisstream.io/v0/stream
# - For mock data: ws://localhost:9090 (default if not set)
AIS_UPSTREAM_URL=wss://stream.aisstream.io/v0/stream
```

### 2. Verify `.env.local.example` is NOT gitignored

The `.gitignore` has `.env*` which would also match `.env.local.example`. This is a problem because the example file should be committed. Verify with `git check-ignore .env.local.example`. If it is ignored, the `.gitignore` needs adjustment.

**Fix if needed**: Change `.env*` to be more specific so that `.env.local.example` is not ignored. One approach: add `!.env.local.example` after the `.env*` line to explicitly un-ignore it. Alternatively, rename the template to `env.example` (without the leading dot) to avoid the glob match entirely.

**Recommended approach**: Add a negation rule `!.env.local.example` to `.gitignore` immediately after the `.env*` line. This is the standard pattern for keeping example env files committed.

### 3. Create `.env.local` with real API key

Copy the example and fill in the actual key:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` to replace `your_api_key_here` with the real AISStream.io API key.

**How to get an AISStream.io API key:**
1. Go to https://aisstream.io/
2. Click "Sign Up" or "Register" to create a free account
3. After email verification, log in to the dashboard
4. Copy your API key from the dashboard (it is displayed on the main page after login)
5. The free tier provides access to the full global AIS feed via WebSocket

### 4. Test the live connection

Run the relay server with the live upstream URL:

```bash
npm run dev:server
```

Since `.env.local` now contains `AIS_UPSTREAM_URL=wss://stream.aisstream.io/v0/stream` and a valid `AISSTREAM_API_KEY`, the server should:
1. Print "Upstream connected to wss://stream.aisstream.io/v0/stream"
2. Begin logging position updates within seconds
3. The existing bounding boxes in `upstream.ts` cover major AI supply chain routes -- expect cargo ships (type 70-79) and tankers (type 80-89) to dominate

**Note on `.env.local` loading**: The `dev:server` script uses `tsx --watch src/server/index.ts` which does NOT automatically load `.env.local` (tsx does not process Next.js env files). If `.env.local` is not loaded, set the variables directly:

```bash
AISSTREAM_API_KEY=<key> AIS_UPSTREAM_URL=wss://stream.aisstream.io/v0/stream npm run dev:server
```

Alternatively, install `dotenv` and add a small loader, or use a shell wrapper. Check whether the existing server code already loads dotenv. If not, the simplest approach for this configuration leg is to export the variables in the shell before running:

```bash
export AISSTREAM_API_KEY=<your_key>
export AIS_UPSTREAM_URL=wss://stream.aisstream.io/v0/stream
npm run dev:server
```

If `.env.local` loading is not working, document this finding and consider adding `dotenv` loading to `src/server/index.ts` as a minor addition in this leg (a single `import 'dotenv/config'` at the top, or using Node.js 20's built-in `--env-file` flag by updating the `dev:server` script to `node --env-file=.env.local --import tsx src/server/index.ts`).

### 5. Verify frontend receives live data

1. Open `http://localhost:3000` in a browser
2. Open browser DevTools, Network tab, filter by WS -- confirm the `/ws/ais` WebSocket connection is active
3. Vessels should appear on the globe and their positions should update over time
4. The vessels should be in the expected regions (Pacific, Indian Ocean, Atlantic, Mediterranean) matching the bounding boxes

### 6. Document observations in flight log

After running for at least 5 minutes, record:
- Approximate message rate (messages per second)
- Number of unique vessels seen
- Geographic distribution (which bounding boxes are producing the most traffic)
- Any error messages or disconnections observed
- Whether the bounding box coverage seems appropriate or needs tuning
- Any rate limit warnings from AISStream.io

## Edge Cases

- **Invalid API key**: AISStream.io may close the connection immediately or send an error message. The relay's exponential backoff reconnection will keep retrying. Check server logs for error details.
- **`.env.local` not loaded by tsx**: The `tsx` runtime does not process Next.js-style env files. See Implementation Guidance section 4 for workarounds.
- **`.env.local.example` gitignored by `.env*` glob**: The `.gitignore` pattern `.env*` matches `.env.local.example`. Must add negation rule. See section 2.
- **No messages received**: If the bounding boxes are correct but no messages arrive, the API key may be invalid or the AISStream.io service may be experiencing issues. Try with a single large bounding box `[[-90, -180], [90, 180]]` to test global coverage.
- **Too many messages**: If the six bounding boxes produce overwhelming volume, consider narrowing them or adding a server-side throttle. The existing ship type filter (`PositionReport` and `ShipStaticData` only) already limits message types.

## Files Affected

- `.env.local.example` -- New file: environment variable template (committed)
- `.env.local` -- New file: actual environment variables (gitignored, not committed)
- `.gitignore` -- Possibly modified: add `!.env.local.example` negation if needed

---

## Post-Completion Checklist

**Complete ALL steps before signaling `[COMPLETE:leg]`:**

- [ ] All acceptance criteria verified
- [ ] `.env.local.example` committed, `.env.local` NOT committed
- [ ] Update flight-log.md with leg progress entry and data observations
- [ ] Set this leg's status to `completed` (in this file's header)
- [ ] Check off this leg in flight.md
- [ ] If final leg of flight:
  - [ ] Update flight.md status to `landed`
  - [ ] Check off flight in mission.md
- [ ] Commit all changes together (code + artifacts)
