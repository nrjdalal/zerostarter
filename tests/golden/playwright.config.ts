import { defineConfig, devices } from "@playwright/test"

import { API_URL, WEB_URL } from "./src/urls"

// Golden suite: black-box tests against the running dev stack (web :3000, api :4000). No framework internals, so the suite survives a frontend rewrite unchanged.
export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /setup\/.*\.setup\.ts/ },
    { name: "api", testMatch: /api\/.*\.spec\.ts/, dependencies: ["setup"] },
    { name: "web", testMatch: /web\/.*\.spec\.ts/, dependencies: ["setup"] },
    {
      name: "e2e",
      testMatch: /e2e\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], baseURL: WEB_URL },
    },
  ],
  webServer: {
    command: "bash scripts/start-stack.sh",
    url: `${API_URL}/api/health`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
