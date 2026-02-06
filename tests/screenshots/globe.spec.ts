import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.join(
  __dirname,
  "../../test-artifacts/screenshots"
);

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

async function waitForGlobe(page: import("@playwright/test").Page) {
  // Wait for WebGL canvas
  await page.waitForSelector("canvas", { timeout: 15000 });
  // Wait for the R3F ready signal
  try {
    await page.waitForSelector("[data-globe-ready=true]", { timeout: 10000 });
  } catch {
    // Fallback: just wait for render
  }
  // Give textures time to load and scene to stabilize
  await page.waitForTimeout(5000);
}

test("capture default globe view", async ({ page }) => {
  await page.goto("/");
  await waitForGlobe(page);

  const screenshot = await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "globe-default.png"),
    fullPage: false,
  });

  // Verify screenshot is non-trivial (not blank/all-black)
  expect(screenshot.byteLength).toBeGreaterThan(50 * 1024);
});

test("capture zoomed view", async ({ page }) => {
  await page.goto("/");
  await waitForGlobe(page);

  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(2000);
  }

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "globe-zoomed.png"),
  });
});

test("capture rotated view", async ({ page }) => {
  await page.goto("/");
  await waitForGlobe(page);

  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 300, cy, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(2000);
  }

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "globe-rotated.png"),
  });
});
