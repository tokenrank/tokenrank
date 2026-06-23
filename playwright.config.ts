import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:3010",
  },
  webServer: {
    command: "pnpm exec next dev -p 3010",
    url: "http://localhost:3010",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 15"],
        browserName: "chromium",
      },
    },
  ],
});
