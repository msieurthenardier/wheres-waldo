import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/screenshots",
  outputDir: "./test-artifacts/screenshots",
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3001",
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 10000,
  },
  webServer: {
    command: "npm run dev -- --port 3001",
    port: 3001,
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
