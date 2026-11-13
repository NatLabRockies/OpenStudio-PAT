import type { PlaywrightTestConfig } from "@playwright/test";
import { getReporter } from "./playwright/config-reporter";

const config: PlaywrightTestConfig = {
  testDir: "./playwright/tests",
  testIgnore: ["serial", "**/shared.spec.ts"],
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 1 : 4,
  retries: process.env.CI ? 2 : 0,
  reporter: getReporter(false),
  use: {
    actionTimeout: 0,
    trace: "on-first-retry",
  },
  outputDir: "playwright-results/",
};

export default config;
