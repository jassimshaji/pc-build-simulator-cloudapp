import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    // Many tests sign up / sign in from the same "address"; rate-limit tests
    // switch this back on for themselves.
    env: { RATE_LIMIT_DISABLED: "true" },
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/globalSetup.ts"],
    setupFiles: ["tests/setup.ts"],
    // Tests share one database and each cleans up after itself, but files are
    // run one at a time so a fixture in one can never collide with another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
