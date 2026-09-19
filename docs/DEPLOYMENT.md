# Deployment

Status: **hosting is design-stage — nothing is deployed yet.** CI, however, is real and
running (see below). Full rationale for the hosting choices is in
[`project-management/ARCHITECTURE.md`](../project-management/ARCHITECTURE.md) §8 and
[`project-management/DECISIONS.md`](../project-management/DECISIONS.md) (ADR-005).

## Target architecture

- **App hosting:** Vercel (Next.js app + API routes), auto-deploy on merge to `main`,
  preview deployments per PR.
- **Database:** Neon (serverless Postgres), with a DB branch per PR preview where practical.
- **Object storage:** Cloudflare R2 (S3-compatible) for component images and GLTF/GLB
  3D models, served via Cloudflare CDN. Locally the same code talks to SeaweedFS.
- **CI:** GitHub Actions (implemented — below); merge to `main` would trigger the
  Vercel production deploy once that is set up.

## CI (implemented)

`.github/workflows/ci.yml` runs on every push to `main` and every pull request, in one
job on Ubuntu with Node from `.nvmrc`:

1. a Postgres 17 service container (which creates the `pcbuilder_test` database),
2. `pnpm install --frozen-lockfile` (the lockfile must be committed and in sync),
3. Prisma client generation,
4. `pnpm typecheck` (the web app runs `next typegen` first, since route types don't
   exist on a fresh checkout),
5. `pnpm --filter web run lint`,
6. `pnpm test` — every package's unit suite and the web API integration tests, which
   migrate and seed the test database themselves,
7. Playwright's Chromium is installed and `pnpm --filter web test:e2e` builds the app and
   runs the browser tests against the same database,
8. on failure, Playwright traces/screenshots are uploaded as an artifact.

A newer push to the same branch cancels the older run. Locally, the same steps can be
reproduced from a fresh clone before pushing; see `docs/DEVELOPMENT.md`.

## Environment variables

See [`.env.example`](../.env.example) at the repo root and `apps/web/.env.example`
for the full list:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | next-auth session signing key and the app's public URL |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_PUBLIC_URL`, `S3_FORCE_PATH_STYLE` | S3-compatible storage (R2 in production) |
| `TEST_DATABASE_URL` | Optional: the database the automated tests use (defaults to `pcbuilder_test` on localhost) |

Secrets are set in Vercel project settings and GitHub Actions secrets — never committed.
Note the browser tests set their own throwaway `NEXTAUTH_SECRET`; production must use a
real random one (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).

## Still to do for a first deployment

Create the Vercel project and Neon database, run `prisma migrate deploy` (and the seed,
if a starter catalog is wanted) against Neon, create the R2 bucket with public read
and CORS for presigned uploads, set the environment variables above, and add an admin
by promoting a registered user in the database. Exact steps will be recorded here when
that is done.
