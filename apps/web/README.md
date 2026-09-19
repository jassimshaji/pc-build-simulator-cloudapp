# apps/web

The Next.js (App Router, Turbopack) application: every page and every API route of the
PC Builder Platform. TypeScript, Tailwind CSS v4, ESLint.

Part of the pnpm workspace — run commands from the repo root (`pnpm dev`,
`pnpm build`, ...), which delegate here through Turborepo. See the root
[`README.md`](../../README.md) for setup.

> Next.js 16 has breaking changes from earlier versions; `AGENTS.md` points at the
> version-matched docs in `node_modules/next/dist/docs/`.

## Pages

| Route | Who | What |
| --- | --- | --- |
| `/` | anyone | Home |
| `/login`, `/register` | anyone | Sign in / create an account (register signs you in) |
| `/workspace` | anyone (saving needs an account) | The 3D build workspace; `?build=<id>` opens one of your saved builds |
| `/builds` | signed in | Your saved builds: open, rename, duplicate, delete |
| `/shared/[slug]` | anyone | Read-only view of a shared build (404 unless sharing is on) |
| `/admin` | admin / inventory manager | Inventory dashboard |
| `/admin/components/new`, `/[id]/edit`, `/[id]/asset` | admin / inventory manager | Component form and 3D asset manager |
| `/admin/brands`, `/admin/categories`, `/admin/import-export` | admin / inventory manager | Brand and category management, CSV |

`/admin/*` is gated in `proxy.ts` (the Next 16 name for middleware) and again in each
server component/route with `lib/requireRole.ts`.

## API

`app/api/**` — every route returns the `{ data, error }` envelope from
`@pcbuilder/shared`. Full reference: [`docs/API.md`](../../docs/API.md).

## Layout

| Path | Contents |
| --- | --- |
| `app/` | Routes. Client components sit beside their page (`build-workspace.tsx`, `build-row-actions.tsx`, ...) |
| `components/` | Shared UI: `nav.tsx`, and the workspace side panels — `build-summary.tsx`, `airflow-panel.tsx`, `estimates-panel.tsx` (used by both the editable workspace and the public shared view) |
| `lib/` | `auth.ts` (next-auth config), `requireRole.ts`, `compatibility.ts` (Prisma rows → engine input), `builds.ts` (saved build ⇄ workspace state, camera sanitizing, ownership lookup), `inventory.ts`, `csv.ts`, `storage.ts` (presigned uploads), `threeDAssets.ts`, `zod-form.ts` |
| `types/` | next-auth type augmentation |
| `tests/` | API integration tests (Vitest) |
| `e2e/` | Browser tests (Playwright) |
| `test-support/` | Prepares the test database (migrate + seed) for both |

## Tests

```bash
pnpm --filter web test        # 64 API integration tests against a real Postgres test DB
pnpm --filter web test:e2e    # 13 Playwright flows against a production build on :3100
```

The API tests call the exported route handlers directly and replace only
`requireRole` (with a stand-in that enforces the same 401/403 contract); the real one
has its own test. Setup, the `pcbuilder_test` database and CI are in
[`docs/DEVELOPMENT.md`](../../docs/DEVELOPMENT.md#testing-strategy).

`pnpm typecheck` runs `next typegen` first — the route types (`LayoutProps`, etc.) are
generated, and don't exist on a fresh checkout.
