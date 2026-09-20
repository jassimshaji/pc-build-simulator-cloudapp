import { defineConfig } from "@playwright/test";
import { TEST_DATABASE_URL } from "./test-support/testDatabase";

// Workers load this file too, so anything they need (the test database, for
// promoting a user to ADMIN in a test) is set here once.
process.env.DATABASE_URL = TEST_DATABASE_URL;

const PORT = 3100; // not 3000, so a running `pnpm dev` doesn't collide
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/globalSetup.ts",
  fullyParallel: false,
  workers: 1, // one shared database; flows are independent but not concurrency-safe
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    // PW_CHANNEL=msedge uses an installed Edge (no browser download needed);
    // unset uses Playwright's own Chromium (`pnpm exec playwright install chromium`).
    channel: process.env.PW_CHANNEL || undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Production build + start: reproducible and closest to what ships. It gets
  // the test database and a throwaway auth secret.
  webServer: {
    command: `pnpm build && pnpm exec next start -p ${PORT}`,
    url: BASE_URL,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NEXTAUTH_SECRET: "e2e-only-secret-not-for-production",
      NEXTAUTH_URL: BASE_URL,
      RATE_LIMIT_DISABLED: "true", // flows register and sign in many users from one address
      S3_ENDPOINT: "http://127.0.0.1:8333",
      S3_ACCESS_KEY_ID: "test",
      S3_SECRET_ACCESS_KEY: "test",
      S3_BUCKET_NAME: "pc-builder-assets",
      S3_PUBLIC_URL: "http://127.0.0.1:8333/pc-builder-assets",
    },
  },
});
