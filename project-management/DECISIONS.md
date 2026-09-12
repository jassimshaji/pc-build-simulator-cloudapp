# Architecture Decision Records (ADR)

Lightweight ADR log. Each entry: context, decision, consequences. Update when a
decision is revisited — don't rewrite history, append a new entry that supersedes it.

---

## ADR-001: Next.js API routes instead of a separate backend service (for MVP)

**Context:** The brief allows "Next.js API routes or a dedicated backend service."
Standing up a separate Node/Express/Nest service adds deployment surface, CORS
config, and a second CI/CD pipeline before there's any functional requirement (like a
long-running job or a language boundary) that needs it.

**Decision:** Use Next.js App Router route handlers as thin adapters. Put all real
logic in framework-agnostic `packages/*` (compatibility-engine, database via Prisma,
component-models). This keeps the option open to extract a standalone service later
by moving the route-handler bodies into new HTTP handlers with minimal rewrite.

**Consequences:** Faster MVP delivery, one deploy target (Vercel), one repo to reason
about. Revisit if/when a feature needs a persistent process (e.g., an async 3D model
generation queue) that doesn't fit serverless function timeouts.

---

## ADR-002: Hybrid relational + JSONB component schema

**Context:** 13+ component categories each have 10-20 category-specific spec fields.
A fully relational per-category table (or a giant sparse `Component` table) would mean
a migration for every new field/category; a pure JSON-document schema would make
compatibility-critical numeric/range queries (GPU length vs. case max length, PSU
wattage vs. required wattage) awkward and slow.

**Decision:** `Component.specifications` is a validated JSONB blob (schema enforced at
the application layer via Zod, not the DB layer) holding the full category spec.
A small, deliberately curated set of fields that are (a) used by the compatibility
engine's numeric/range comparisons or (b) heavily filtered/sorted on in the UI are
*also* promoted to real indexed columns on `Component` (socket, formFactor, ramType,
pcieGeneration, lengthMm/widthMm/heightMm, tdpWatts/powerDrawWatts, wattage). A GIN
index on `specifications` covers ad-hoc filtering on the long tail.

**Consequences:** New categories or new spec fields within a category never require a
migration unless that specific field needs to become a compatibility/filter hot-path
field. The "promoted fields" list is expected to grow slowly and deliberately — adding
one is a small, reviewable migration, not a redesign.

---

## ADR-003: Click-to-place instead of native HTML5 drag-and-drop into the 3D canvas

**Context:** The brief explicitly anticipates that native HTML5 DnD may not compose
well with a WebGL canvas doing its own raycasting/hit-testing, and pre-approves an
alternative interaction model.

**Decision:** Primary interaction is: select a component in the inventory panel → the
3D scene highlights zones where it could be validly installed (compatibility-checked)
→ click a highlighted zone to place it. True pointer-drag (grab an already-placed or
newly-selected component and drag it in 3D space) is a later enhancement built on the
same zone/snap primitives, not a replacement for them.

**Consequences:** Simpler, more robust interaction to build and test first; works
identically on touch devices later if needed. Revisit only if user testing shows the
click-to-place flow feels unintuitive once the MVP is in front of real users.

---

## ADR-004: Procedural generic 3D models are first-class, not a stopgap

**Context:** Accurate, licensed manufacturer 3D models will not exist for most
components at launch, and the brief explicitly forbids assuming commercial rights to
third-party models.

**Decision:** `packages/three-d-engine` treats parameterized procedural geometry
(`createGenericGPU`, `createGenericMotherboard`, etc., driven by each component's own
spec dimensions) as the default rendering path. A `ThreeDAsset` row per component
records whether it uses a real uploaded GLTF/GLB, a named procedural generator, or a
plain placeholder, plus source/license/attribution metadata. Swapping a component from
procedural to a real model later is a data change (upload + update the `ThreeDAsset`
row), never a code change.

**Consequences:** MVP can visually represent every category correctly (dimensions,
orientation, mounting) with zero licensed assets. Slightly less visually impressive
than photorealistic models, which is an accepted, explicit trade-off for the MVP.

---

## ADR-005: Vercel + Neon Postgres + Cloudflare R2 for hosting

**Context:** Brief asks to optimize for low initial cost, scalability, dev
productivity, reliable DB, object storage for 3D assets, easy CI/CD, and lists several
provider options.

**Decision:** Vercel (web/API hosting, zero-config Next.js, preview deploys), Neon
(serverless Postgres with per-branch DB previews, standard Postgres so no lock-in),
Cloudflare R2 (S3-compatible object storage with no egress fees, important because
GLB/GLTF assets are large and repeatedly fetched).

**Consequences:** All three have workable free/cheap starter tiers. Standard Postgres
(Neon) and S3-compatible API (R2) mean migrating off either provider later is a
config/connection-string change, not a rewrite.

---

## ADR-006: Local dev database — native PostgreSQL install, not Docker (this machine)

**Context:** The dev machine had no Docker and no Postgres. Installing Docker Desktop
on Windows typically needs WSL2/Hyper-V setup and often a reboot — disruptive for an
unattended session. `winget install PostgreSQL.PostgreSQL.17` installs the server as a
native Windows service with no reboot required.

**Decision:** PostgreSQL 17 is installed natively as a Windows service on this
machine for local development. `docker/docker-compose.yml` is still maintained and
documented for anyone (or any CI environment) that does have Docker — the two are not
mutually exclusive, `DATABASE_URL` is the only thing that needs to point at whichever
is running.

**Environment notes for future sessions on this machine:**
- The `postgres` superuser password after the silent winget install turned out to be
  literally `postgres` (not blank, not random) — this is worth checking first before
  assuming a fresh reset is needed.
- A dedicated `pcbuilder` role/database was created (`CREATE ROLE pcbuilder LOGIN
  PASSWORD 'pcbuilder' CREATEDB; CREATE DATABASE pcbuilder OWNER pcbuilder;`). The
  `CREATEDB` privilege is required because `prisma migrate dev` creates a temporary
  shadow database to diff against.
- This is a local dev convenience only — production still targets Neon per ADR-005.

---

## ADR-007: next-auth v4 (not v5), and no Prisma adapter for Credentials + JWT auth

**Context:** The original plan (ARCHITECTURE.md, written in Phase 0) said "Auth.js
(NextAuth v5) — Credentials provider + JWT session, Prisma adapter." When it came time
to actually install it, `pnpm add next-auth` resolved to `next-auth@4.24.15` — v5
either isn't tagged `latest` yet or doesn't exist as a stable release at
implementation time. Separately: a database adapter (`@auth/prisma-adapter`) exists to
persist OAuth accounts and/or database-backed sessions (it manages `Account`,
`Session`, `VerificationToken` tables). This app only uses the Credentials provider
with JWT sessions — no OAuth, no database sessions — so the adapter has nothing to do;
adding it now would mean adding three unused tables to the schema for no behavior.

**Decision:** Use `next-auth@4` as installed. Its Credentials provider's `authorize()`
callback queries the existing `User` model directly via the `@pcbuilder/database`
Prisma client (no adapter). Role-based access uses `next-auth/middleware`'s
`withAuth()` (file named `proxy.ts`, not `middleware.ts` — Next.js 16 renamed the
convention, see below) for route-level gating plus a shared `requireRole()` helper
(`apps/web/lib/requireRole.ts`) for server-side/API-route enforcement that always
re-reads the session server-side rather than trusting any client-supplied role.

**Also noted:** Next.js 16 deprecated the `middleware.ts` file convention in favor of
`proxy.ts` (same `withAuth()`-wrapped function, just renamed — "the functionality
remains the same" per Next's own docs). The file was named `proxy.ts` from the start
here to avoid the deprecation warning.

**Consequences:** If/when OAuth providers (Google, GitHub, etc.) are added later,
that's the point to add `@auth/prisma-adapter` and its tables — a schema migration at
that time, not now. If next-auth v5 becomes the clearly-current stable release before
that point, upgrading is a reasonably contained change (the Credentials + JWT pattern
maps fairly directly onto v5's API) but is not being chased proactively.
