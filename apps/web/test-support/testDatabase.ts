import { execSync } from "node:child_process";
import path from "node:path";

// Tests run against their own database so they never touch development data.
// It must already exist (locally: `CREATE DATABASE pcbuilder_test OWNER
// pcbuilder;` — see docs/DEVELOPMENT.md; in CI the Postgres service creates it).
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://pcbuilder:pcbuilder@localhost:5432/pcbuilder_test?schema=public";

const databasePackageDir = path.resolve(__dirname, "../../../packages/database");

function run(command: string) {
  // A command string (run through the shell) so `pnpm` resolves to pnpm.cmd on Windows.
  execSync(command, {
    cwd: databasePackageDir,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
}

// Applies every migration and (re)seeds the catalog. Both steps are
// idempotent, so it's safe to call before every test run.
export function prepareTestDatabase() {
  run("pnpm exec prisma migrate deploy");
  run("pnpm exec tsx prisma/seed.ts");
}
