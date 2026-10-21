import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testIgnore: "**/navigation-preview.spec.ts",
  workers: 1,
  use: {
    browserName: process.env.TOKENPLAN_TEST_ENGINE === "webkit" ? "webkit" : "chromium",
    baseURL: "http://127.0.0.1:1420",
    locale: "zh-CN",
    launchOptions: process.env.TOKENPLAN_TEST_BROWSER ? { executablePath: process.env.TOKENPLAN_TEST_BROWSER } : {},
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:1420",
    reuseExistingServer: !process.env.CI,
  },
});
