# Leg: 06-snapshot-testing

**Status**: queued
**Flight**: [3D Globe Foundation](../flight.md)

## Objective

Set up Playwright browser automation to capture screenshots of the rendered 3D globe, establishing visual testing infrastructure and generating presentation-ready images.

## Context

- Chuck specifically requested browser snapshot testing integrated into the workflow
- Screenshots serve dual purpose: visual regression testing AND presentation material for tomorrow's demo
- The globe with ships, ports, lanes, and post-processing effects is complete from legs 01-04
- Playwright is preferred for its mature WebGL/Canvas support and headless Chrome capabilities
- Screenshots must capture the actual WebGL-rendered globe, not just DOM structure

## Inputs

- Fully rendered globe application with ships, ports, lanes, and post-processing (from legs 01-04)
- Dev server running on localhost:3000

## Outputs

- Playwright installed and configured as a dev dependency
- Test scripts that capture screenshots of the globe from multiple views
- Screenshot artifacts stored in `test-artifacts/screenshots/`
- npm script to run snapshot tests easily
- Screenshots that are presentation-quality (high resolution, properly framed)

## Acceptance Criteria

- [ ] Playwright is installed as a dev dependency with Chromium browser
- [ ] A Playwright config file exists (`playwright.config.ts`) configured for the project
- [ ] Running `npm run test:screenshots` captures at least 3 screenshots: default view, zoomed-in view, and rotated view showing different ports
- [ ] Screenshots are saved to `test-artifacts/screenshots/` with descriptive filenames (e.g., `globe-default.png`, `globe-asia-zoom.png`)
- [ ] Screenshots capture the actual WebGL canvas content (not a blank/black rectangle)
- [ ] Screenshots include the UI chrome (top bar, sidebar if open) overlaid on the globe
- [ ] Screenshots are at least 1920x1080 resolution
- [ ] A test assertion verifies the screenshot is non-trivial (file size > threshold, not all-black)

## Verification Steps

- Run `npm run test:screenshots` and confirm it completes without errors
- Open the generated screenshots in `test-artifacts/screenshots/` and visually confirm:
  - The globe is visible with dark Earth texture
  - Port markers are glowing
  - Ships are visible
  - UI chrome (top bar) is overlaid
  - Post-processing effects (bloom, vignette) are captured
- Confirm screenshot files are > 100KB (a blank screenshot would be ~5KB)

## Implementation Guidance

1. **Install Playwright**
   - `npm install -D @playwright/test`
   - `npx playwright install chromium` (only need Chromium, not all browsers)
   - Add `test-artifacts/` to `.gitignore`

2. **Create Playwright config**
   ```
   playwright.config.ts
   ```
   ```typescript
   import { defineConfig } from '@playwright/test';

   export default defineConfig({
     testDir: './tests/screenshots',
     outputDir: './test-artifacts/screenshots',
     use: {
       baseURL: 'http://localhost:3000',
       viewport: { width: 1920, height: 1080 },
       // Give WebGL time to render
       actionTimeout: 10000,
     },
     webServer: {
       command: 'npm run dev',
       port: 3000,
       reuseExistingServer: true,
       timeout: 30000,
     },
     // Only use Chromium for WebGL support
     projects: [
       {
         name: 'chromium',
         use: { browserName: 'chromium' },
       },
     ],
   });
   ```

3. **Create screenshot test file**
   ```
   tests/screenshots/globe.spec.ts
   ```
   - **Key challenge**: WebGL rendering is asynchronous. After navigating to the page, you must wait for the globe to actually render. Strategies:
     - Wait for a specific element/attribute that indicates rendering is complete
     - Use `page.waitForTimeout(5000)` as a simple delay (not ideal but pragmatic)
     - Better: Add a `data-globe-ready="true"` attribute to the canvas container after the first R3F frame renders, then `await page.waitForSelector('[data-globe-ready="true"]')`

   ```typescript
   import { test, expect } from '@playwright/test';
   import path from 'path';
   import fs from 'fs';

   const SCREENSHOT_DIR = path.join(__dirname, '../../test-artifacts/screenshots');

   test.beforeAll(async () => {
     // Ensure screenshot directory exists
     fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
   });

   async function waitForGlobe(page) {
     // Wait for the WebGL canvas to be present and rendered
     await page.waitForSelector('canvas', { timeout: 15000 });
     // Give the 3D scene time to fully load textures and render
     await page.waitForTimeout(5000);
   }

   test('capture default globe view', async ({ page }) => {
     await page.goto('/');
     await waitForGlobe(page);

     const screenshot = await page.screenshot({
       path: path.join(SCREENSHOT_DIR, 'globe-default.png'),
       fullPage: false,
     });

     // Verify screenshot is non-trivial (not blank)
     expect(screenshot.byteLength).toBeGreaterThan(100 * 1024);
   });

   test('capture zoomed Asia view', async ({ page }) => {
     await page.goto('/');
     await waitForGlobe(page);

     // Zoom in with scroll events toward the center
     const canvas = page.locator('canvas');
     await canvas.scrollIntoViewIfNeeded();
     const box = await canvas.boundingBox();
     if (box) {
       // Scroll to zoom in
       await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
       await page.mouse.wheel(0, -300);
       await page.waitForTimeout(2000);
     }

     await page.screenshot({
       path: path.join(SCREENSHOT_DIR, 'globe-zoomed.png'),
     });
   });

   test('capture rotated view showing Atlantic', async ({ page }) => {
     await page.goto('/');
     await waitForGlobe(page);

     // Click and drag to rotate the globe
     const canvas = page.locator('canvas');
     const box = await canvas.boundingBox();
     if (box) {
       const centerX = box.x + box.width / 2;
       const centerY = box.y + box.height / 2;
       await page.mouse.move(centerX, centerY);
       await page.mouse.down();
       await page.mouse.move(centerX + 300, centerY, { steps: 20 });
       await page.mouse.up();
       await page.waitForTimeout(2000);
     }

     await page.screenshot({
       path: path.join(SCREENSHOT_DIR, 'globe-rotated.png'),
     });
   });
   ```

4. **Add readiness signal to GlobeScene**
   - In the R3F Canvas, use a small component that sets a `data-globe-ready` attribute after first render:
   ```typescript
   function ReadySignal() {
     const container = useThree((state) => state.gl.domElement.parentElement);
     useEffect(() => {
       if (container) {
         container.setAttribute('data-globe-ready', 'true');
       }
     }, [container]);
     return null;
   }
   ```
   - Add `<ReadySignal />` inside the Canvas
   - Update the Playwright wait to use `page.waitForSelector('[data-globe-ready="true"]')` instead of timeout

5. **Add npm script**
   ```json
   "scripts": {
     "test:screenshots": "playwright test"
   }
   ```

6. **Update .gitignore**
   - Add `test-artifacts/` (screenshots are generated, not committed)
   - Add `test-results/` (Playwright's default output)

## Edge Cases

- **WebGL not available in headless mode**: Playwright's Chromium supports WebGL in headless mode by default (uses SwiftShader for software rendering). No special flags needed, but rendering may be slower than hardware-accelerated.
- **Texture loading race condition**: The globe texture loads asynchronously. The 5-second wait should cover this, but if screenshots show an untextured sphere, increase the wait or add a texture-loaded signal.
- **Non-deterministic rendering**: 3D rendering can vary slightly between runs (anti-aliasing, floating point). This is fine for presentation screenshots. If visual regression testing is added later, use a pixel-difference threshold.
- **Port 3000 already in use**: The Playwright webServer config uses `reuseExistingServer: true`, so it works whether the dev server is already running or not.
- **Auto-rotation**: The globe auto-rotates, so screenshots taken at different times show different angles. For deterministic screenshots, either disable auto-rotation during tests or set a specific camera position programmatically.

## Files Affected

- `package.json` — Modified (add playwright dev dependency, add test:screenshots script)
- `playwright.config.ts` — Created
- `tests/screenshots/globe.spec.ts` — Created
- `src/components/scene/GlobeScene.tsx` — Modified (add ReadySignal component)
- `.gitignore` — Modified (add test-artifacts/, test-results/)

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
