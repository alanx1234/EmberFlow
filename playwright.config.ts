import { defineConfig } from "@playwright/test";

/** End-to-end smoke tests. Requires the full local stack (web + Python
 * bridge), which `npm run dev` starts; the first API request warms the model.
 * Run `npx playwright install chromium` once before the first use. */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
