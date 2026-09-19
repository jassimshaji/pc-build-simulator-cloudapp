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
| `app/` | Routes. `workspace/build-workspace.tsx` is a thin composition root; `theme.css` holds the light palette |
| `components/ui/` | Primitives: `Button` (variants), `TextInput`, `Section` / `Hint`, `SeverityBadge` |
| `components/workspace/` | One component per workspace panel: `SaveBar`, `ComponentPicker`, `ComponentDetails`, `BuildList`, `CompatibilityPanel`, `BuildSidebar`, `ViewportControls`, `StatusFooter` |
| `components/` (top level) | Reused across the workspace and the public shared view: `scene-canvas.tsx` (client-only 3D scene, themed), `compatibility-results.tsx`, `build-summary.tsx`, `airflow-panel.tsx`, `estimates-panel.tsx`; plus `nav.tsx` and `theme-toggle.tsx` |
| `hooks/` | `useTheme`, `useComponentCatalog`, `useCompatibilityReport`, `useBuildDraft`, `useBuildPersistence` — all state and data fetching live here, not in components |
| `lib/` | `auth.ts` (next-auth config), `requireRole.ts`, `compatibility.ts` (Prisma rows → engine input), `builds.ts` (saved build ⇄ workspace state, camera sanitizing, ownership lookup), `buildDraft.ts` (pure in-progress-build operations), `theme.ts`, `inventory.ts`, `csv.ts`, `storage.ts` (presigned uploads), `threeDAssets.ts`, `zod-form.ts` |
| `types/` | `workspace.ts` (shared UI types) and the next-auth type augmentation |
| `tests/` | API integration tests (Vitest) |
| `e2e/` | Browser tests (Playwright) |
| `test-support/` | Prepares the test database (migrate + seed) for both |

## Tests

```bash
pnpm --filter web test        # 76 Vitest tests: API integration (real Postgres test DB) + pure UI logic
pnpm --filter web test:e2e    # 16 Playwright flows (incl. the theme toggle) against a production build on :3100
```

The API tests call the exported route handlers directly and replace only
`requireRole` (with a stand-in that enforces the same 401/403 contract); the real one
has its own test. Setup, the `pcbuilder_test` database and CI are in
[`docs/DEVELOPMENT.md`](../../docs/DEVELOPMENT.md#testing-strategy).

`pnpm typecheck` runs `next typegen` first — the route types (`LayoutProps`, etc.) are
generated, and don't exist on a fresh checkout.

## Theming

Dark is the default; the nav toggle switches to light and the choice is saved in
`localStorage` (`pcbuilder-theme`). The mechanism has three small parts:

1. An inline script in the root layout's `<head>` (`themeInitScript` in `lib/theme.ts`)
   sets `<html data-theme="...">` before first paint, so there's no flash. It is
   try/catch-wrapped, and anything unrecognised falls back to dark.
2. `hooks/useTheme.ts` is a tiny external store over that attribute
   (`useSyncExternalStore`) — any component can call `useTheme()`, and there is no
   provider. It also syncs across tabs.
3. `app/theme.css` holds the light palette. The UI is written against Tailwind's zinc
   scale, and Tailwind v4 compiles every colour class to a CSS variable, so light mode
   is a second set of values for those variables under `[data-theme="light"]` (the zinc
   scale flipped, status hues darkened). **Components never check the theme** — new UI
   just uses the normal zinc/red/emerald/amber classes and works in both. The 3D scene,
   which can't read CSS, receives the theme as a prop (`SceneCanvas` →
   `WorkspaceCanvas theme=`; colours in `packages/three-d-engine/src/sceneTheme.ts`).

If you introduce a new colour family for status/decoration, add its light values to
`theme.css` (the dark ones are Tailwind's defaults).
