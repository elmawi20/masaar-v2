import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

const devUrl = process.env.DATABASE_URL || "";
const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  devUrl.replace(/\/masaar_dev(\?.*)?$/, "/masaar_test$1");

const e2ePort = process.env.CI ? 3000 : 3001;

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || `http://localhost:${e2ePort}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-1440",
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "tablet-820",
      use: {
        viewport: { width: 820, height: 1180 },
      },
    },
    {
      name: "phone-390",
      use: {
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: `npm run start -- -p ${e2ePort}`,
    url: `http://localhost:${e2ePort}`,
    reuseExistingServer: false,
    timeout: 120 * 1000,
    env: {
      PORT: String(e2ePort),
      DATABASE_URL: testDbUrl,
    },
  },
});
