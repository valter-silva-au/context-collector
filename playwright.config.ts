import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  timeout: 30000,
  use: {
    headless: true,
    screenshot: "only-on-failure",
    baseURL: "http://localhost:4173",
  },
  webServer: {
    command: "python3 -m http.server 4173 -d dist",
    port: 4173,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
