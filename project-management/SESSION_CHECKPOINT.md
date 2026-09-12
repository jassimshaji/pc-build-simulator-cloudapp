SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 1 — Core Cloud Application Foundation (Milestone 1 of 5 complete)

CURRENT TASK: None in progress — awaiting user instruction for Milestone 2 (database schema).

LAST COMPLETED STEP: Phase 1, Milestone 1 (monorepo scaffold), fully verified:
- Installed Node.js 24 LTS via winget (`OpenJS.NodeJS.LTS`) and pnpm 12.4.1 via
  `npm install -g pnpm` — neither existed on this machine beforehand. Note: `corepack
  enable` failed with EPERM (needs admin elevation this session didn't have); the
  global npm install path was used instead and works fine.
- Created root `pnpm-workspace.yaml` (packages: apps/*, packages/*), root
  `package.json` (workspace scripts: dev/build/lint/typecheck/test, all delegating to
  `turbo run <script>`), `turbo.json`, `tsconfig.base.json`, `.prettierrc.json`, `.nvmrc`.
- Scaffolded `apps/web` via `pnpm dlx create-next-app@latest` (TypeScript, Tailwind
  CSS v4, ESLint, App Router, no src dir, `@/*` import alias, pnpm). It resolved to
  Next.js 16.3.4 / React 19.2.8 (the architecture doc originally said "Next.js 14" as
  a planning-time placeholder; docs have been updated to say "Next.js (App Router)"
  without pinning a stale major version). Removed the nested `pnpm-workspace.yaml`/
  `pnpm-lock.yaml`/`node_modules` that create-next-app generated inside apps/web
  (those belong at the monorepo root only).
- Note: Next.js 16 auto-generates `apps/web/AGENTS.md` (and a `CLAUDE.md` pointer to
  it) via `next dev`/`next build` — this is an official Next.js mechanism warning
  that v16 may differ from an LLM's training data; it says it's fine to commit and
  will be re-added if removed. Left in place deliberately, not an accident.
- Created `packages/database`, `packages/compatibility-engine`,
  `packages/component-models`, `packages/three-d-engine`, `packages/shared`: each got
  a `package.json` (scoped as `@pcbuilder/<name>`), a `tsconfig.json` extending the
  root `tsconfig.base.json`, and a placeholder `src/index.ts` (`export {}`).
  `component-models` includes `zod` as a real dependency already since Phase 2 will
  need it immediately.
- Ran `pnpm install` from the root (had to approve the `unrs-resolver` native build
  script via `pnpm-workspace.yaml`'s `allowBuilds` — a legitimate eslint-tooling
  dependency, approved).
- Verified: `pnpm run typecheck` → 6/6 packages pass. `pnpm run build` → 6/6 packages
  pass, `web:build` produces a working Next.js production build. `pnpm run dev` →
  started the dev server in the background, confirmed `http://localhost:3000`
  returns HTTP 200 with the (default, unmodified) Next.js starter page, then stopped
  the process and cleaned up log files.
- Updated forward-looking docs (`ARCHITECTURE.md`, `docs/ARCHITECTURE.md`, `README.md`,
  `DEVELOPMENT_ROADMAP.md`) to stop pinning "Next.js 14" and instead say "Next.js
  (App Router)"; filled in real `pnpm install` / `pnpm dev` instructions in `README.md`
  and `docs/DEVELOPMENT.md`.

FILES CREATED:
- pnpm-workspace.yaml, package.json (root), turbo.json, tsconfig.base.json,
  .prettierrc.json, .nvmrc
- apps/web/** (full create-next-app output: app/layout.tsx, app/page.tsx,
  app/globals.css, app/favicon.ico, next.config.ts, tsconfig.json, eslint.config.mjs,
  postcss.config.mjs, package.json, public/, AGENTS.md, CLAUDE.md, .gitignore) plus a
  rewritten apps/web/README.md
- packages/database/{package.json,tsconfig.json,src/index.ts}
- packages/compatibility-engine/{package.json,tsconfig.json,src/index.ts}
- packages/component-models/{package.json,tsconfig.json,src/index.ts}
- packages/three-d-engine/{package.json,tsconfig.json,src/index.ts}
- packages/shared/{package.json,tsconfig.json,src/index.ts}
- pnpm-lock.yaml (root, generated)

FILES MODIFIED:
- project-management/ARCHITECTURE.md, project-management/DEVELOPMENT_ROADMAP.md,
  docs/ARCHITECTURE.md, README.md (Next.js version wording + real run instructions),
  docs/DEVELOPMENT.md (real local setup commands), packages/*/README.md (status
  updated from "not yet scaffolded" to "package stub"), project-management/TODO.md,
  project-management/CURRENT_PHASE.md, project-management/PROJECT_STATUS.md (this
  checkpoint's sibling docs).

DATABASE CHANGES: none yet — still Phase 1, Milestone 2 (not started). No Prisma
schema, no docker-compose for local Postgres yet.

API CHANGES: none yet.

FRONTEND CHANGES: `apps/web` is a real, running Next.js app but still shows the
default `create-next-app` starter page — no custom UI/layout yet (that's Milestone 4,
"base app shell UI").

3D ENGINE CHANGES: none — `packages/three-d-engine` is an empty stub.

KNOWN ISSUES:
- `corepack enable` fails with EPERM on this machine without admin elevation — a
  non-issue since global `npm install -g pnpm` works fine as the alternative; just
  don't rely on `corepack` here without elevation.
- No automated tests exist yet anywhere (expected at this stage — each package's
  `test` script is currently a no-op placeholder `echo "no tests yet"`).

TEST STATUS: No real tests yet. `pnpm test` runs but every package's test script is a
placeholder no-op. Real test coverage starts in Phase 3 (compatibility engine rules
are required to have full Vitest coverage).

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md +
CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes, then
implement Phase 1, Milestone 2 (database schema): add Prisma to `packages/database`,
write the schema from `ARCHITECTURE.md` §4 (User, Brand, ComponentCategory,
Component, Inventory, ThreeDAsset, CompatibilityRule, PCBuild, BuildComponent), add a
`docker/docker-compose.yml` for local Postgres, run an initial migration, and write a
small seed script with a few real components across 2-3 categories. Stop at that
checkpoint rather than also starting auth in the same session.

EXACT COMMANDS TO RUN THE PROJECT LOCALLY:
  pnpm install
  pnpm dev
  (then open http://localhost:3000 — shows the default Next.js starter page)

Other root scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (all via
Turborepo across every workspace package).

Note: on this machine, `node`/`pnpm` are installed but may not be on PATH in a fresh
shell/process depending on how the terminal was launched (PATH was refreshed
mid-session, not via a system restart). If a command reports `node`/`pnpm`/`npm` not
found, prepend the install dirs to PATH for that shell, e.g. in PowerShell:
  $env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm"
