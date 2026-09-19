# API Reference

Status: every route the application uses is implemented and covered by an automated
test (`apps/web/tests/`, see DEVELOPMENT.md — Testing strategy): auth, the public
catalog, admin component/brand/category/inventory management, image and 3D-model
upload, CSV import/export, compatibility checking, and saved builds with sharing.

## Conventions

Every route returns `packages/shared`'s envelope: `{ data, error }`, never both
populated (`apiSuccess(data)` / `apiError(message, issues?)` from
`@pcbuilder/shared`). Query/body validation uses Zod; a validation failure returns
`400` with `error.issues` set to the Zod flattened error. Mutating routes and
role-gated routes use `apps/web/lib/requireRole.ts` — never trust a
client-supplied role. Status codes are used consistently: `401` not signed in, `403`
signed in with the wrong role, `400` invalid input, `404` not found, `409` conflict
(duplicate, or still referenced).

## Implemented

### `POST /api/auth/register`
Public. Body: `{ email: string, password: string (min 8 chars), name?: string }`.
Validates with Zod, hashes the password with `bcryptjs`, creates a `User` with role
`USER`. Returns `409` if the email is already registered, `400` on invalid input,
`201` with `{ data: { id, email }, error: null }` on success. Does not sign the user
in — the client calls `signIn("credentials", ...)` afterward (see `app/register/page.tsx`).

### `/api/auth/[...nextauth]` (GET/POST)
next-auth v4's catch-all handler: `/api/auth/session`, `/api/auth/csrf`,
`/api/auth/callback/credentials`, `/api/auth/signout`, etc. Session strategy is JWT;
the session/JWT carry `user.id` and `user.role` (see `apps/web/lib/auth.ts` and the
module augmentation in `apps/web/types/next-auth.d.ts`).

### `GET /api/components`
Public. Query params (all optional): `category` (a `ComponentCategory.key`, e.g.
`CPU`), `brand` (a `Brand.name`), `q` (case-insensitive substring match against
`model`), `minPrice`/`maxPrice`, `page` (default 1), `limit` (default 20, max 100).
Only `isAvailable: true` components are returned. Response:
`{ data: { items: Component[], total, page, limit, totalPages }, error: null }`,
each item including its `category`, `brand`, and `inventory` relations. `400` with
Zod issues on an invalid query (e.g. `minPrice=notanumber`).

### `GET /api/components/categories`
Public. Returns every `ComponentCategory` row ordered by `sortOrder`:
`{ data: ComponentCategory[], error: null }`. No separate `/api/components/search`
route — search is the `q` param on the list route above, to avoid two routes doing
the same query.

### `GET /api/components/:id`
Public. Returns one `Component` with `category`, `brand`, `inventory`, and
`threeDAssets` included. `404` (`{ data: null, error: { message: "Component not
found." } }`) if the id doesn't exist.

### `POST /api/components`
`ADMIN`/`INVENTORY_MANAGER` only. Body: `{ sku, categoryKey, brandName, model,
price, description?, images?: string[], isAvailable?, specifications: unknown }`.
`categoryKey` must match an existing `ComponentCategory.key` (`400` otherwise);
`brandName` is upserted (creates the brand if it doesn't exist yet); `sku` must be
unique (`409` otherwise). `specifications` is validated against the category's own
schema via `@pcbuilder/component-models`'s `validateSpecifications` — NOT by this
route's own Zod schema, which only covers the fields every category shares (`400`
with the category schema's own issues on failure). The `Component`'s hot columns
(socket/formFactor/ramType/etc.) are derived from the validated specifications via
`extractHotFields` — never taken from client input directly. Creates a matching
`Inventory` row (`stockQuantity: 0`) alongside the component. `201` with the created
component (relations included) on success.

### `PATCH /api/components/:id`
`ADMIN`/`INVENTORY_MANAGER` only. Body (all optional): `brandName, model, price,
description, images, isAvailable, specifications`. `categoryKey` and `sku` are
immutable — recategorizing or re-skuing a component is delete-and-recreate, not an
edit. If `specifications` is provided it's re-validated against the component's
existing category and hot columns are recomputed. `404` if the id doesn't exist.

### `DELETE /api/components/:id`
`ADMIN`/`INVENTORY_MANAGER` only. `404` if the id doesn't exist. `409` if the
component is referenced by any saved build's `BuildComponent` row (checked up front
with a count — Postgres reports that RESTRICT constraint in a way Prisma surfaces as
an unmapped error, which used to escape as a 500 until an integration test caught it).

### `GET /api/inventory`
`ADMIN`/`INVENTORY_MANAGER` only (`401` if unauthenticated, `403` for a `USER`
session — via `requireRole`). Returns
`{ data: { totalComponents, outOfStockComponents, lowStockComponents,
recentlyUpdatedComponents }, error: null }`, each `*Components` array a flattened
row (`id, model, sku, categoryLabel, brandName, isAvailable, stockQuantity,
lowStockThreshold, updatedAt`) rather than the raw Prisma relations. Powers the
`/admin` dashboard (`apps/web/lib/inventory.ts`'s `getInventoryOverview()`, called
directly by both the page and this route to avoid duplicating the query logic).

### `POST /api/inventory/update`
`ADMIN`/`INVENTORY_MANAGER` only. Body: `{ componentId, stockQuantity?, lowStockThreshold? }`
(at least one of the two numeric fields expected, both optional so either can be
adjusted independently). `404` if the component doesn't exist. Upserts the
`Inventory` row (in practice it always already exists — every component gets one on
creation — but upsert is defensive). Setting `stockQuantity` also stamps
`lastRestockedAt = now()`. This is the fast path for routine stock adjustments,
distinct from `PATCH /api/components/:id` which edits the component itself (model,
price, `isAvailable`, specifications, ...).

### `GET /api/brands` / `POST /api/brands`
`GET` is public: every `Brand` with a `_count.components`. `POST` is
`ADMIN`/`INVENTORY_MANAGER` only: `{ name, logoUrl? }`, `409` on a duplicate name.
(Brands are also upserted implicitly by `POST /api/components`'s `brandName` field —
this route is for managing them directly, e.g. renaming, without touching any
component.)

### `PATCH /api/brands/:id` / `DELETE /api/brands/:id`
`ADMIN`/`INVENTORY_MANAGER` only. `PATCH`: `{ name?, logoUrl? }`, `409` on a
duplicate name, `404` if missing. `DELETE`: `409` if any `Component` still
references the brand (with a count in the message), `404` if missing — brands are
never deleted out from under components that use them.

### `POST /api/components/categories`
`ADMIN`/`INVENTORY_MANAGER` only. Body: `{ key (UPPER_SNAKE_CASE), label, sortOrder? }`.
`409` on a duplicate key. Per ARCHITECTURE.md §4.3, a new category is purely a data
row — a `key` with no matching schema in `@pcbuilder/component-models` just falls
back to the permissive generic schema (see `packages/component-models/src/categories/generic.ts`)
until a developer adds a real one; nothing else needs to change for the category to
exist and accept components.

### `PATCH /api/components/categories/:id` / `DELETE /api/components/categories/:id`
`ADMIN`/`INVENTORY_MANAGER` only. `PATCH`: `{ label?, sortOrder? }` — `key` is
immutable (component-models' registry and every existing `Component` row key off of
it; renaming it would silently break their category lookup). `DELETE`: `409` if any
`Component` still uses the category, `404` if missing.

### `GET /api/components/export`
`ADMIN`/`INVENTORY_MANAGER` only. Streams every component (available or not) as a
CSV file (`Content-Disposition: attachment`). Columns:
`sku, categoryKey, brandName, model, price, description, images, isAvailable,
stockQuantity, lowStockThreshold, specifications`. `images` and `specifications`
are JSON-encoded into their single cell — arrays/objects vary per category, so
rather than a bespoke per-field CSV schema, both use the same JSON representation
the API already accepts (see `apps/web/lib/csv.ts`). Uses `Papa.unparse`, which
defaults to CRLF line endings between rows — worth knowing if you ever hand-edit
an exported file and re-append rows with a different line ending, since mixed
line endings can confuse `papaparse`'s parser on re-import (discovered while
testing this route).

### `POST /api/components/import`
`ADMIN`/`INVENTORY_MANAGER` only. Body: `multipart/form-data` with a `file` field
(a CSV in the shape above). Upserts by `sku` — an existing SKU updates that
component (re-validating `specifications` against its category and recomputing hot
columns), a new SKU creates one (plus its `Inventory` row). Rows are processed
independently, NOT in one all-or-nothing transaction: a bad row (unknown category,
invalid specifications, unparseable JSON, non-numeric price, ...) is skipped and
reported rather than aborting the whole file. Returns
`{ data: { total, created, updated, failed: [{ row, sku?, error }] }, error: null }`
(`row` is 1-indexed counting the header as row 1, matching what a human opening the
CSV in a spreadsheet would see). `400` only if the CSV itself fails to parse at all
(malformed quoting, etc.) — per-row data problems are reported in `failed`, not as
an HTTP error.

### `PUT /api/components/:id/asset`
`ADMIN`/`INVENTORY_MANAGER` only. Body: `{ kind: "GLTF_MODEL" | "PROCEDURAL_FALLBACK"
| "PLACEHOLDER", url?, proceduralGeneratorKey?, source?, licenseInfo?, attribution?,
usageRights? }`. `url` is required (and only stored) when `kind` is `GLTF_MODEL`;
`proceduralGeneratorKey` is required (and only stored) when `kind` is
`PROCEDURAL_FALLBACK` (`400` if the required field for the chosen `kind` is
missing). Upserts the component's `ThreeDAsset` — full replace semantics (`PUT`,
not `PATCH`): fields omitted from the body are cleared, not left alone. Only one
managed asset "slot" per component for this admin UI (the schema allows several via
`ThreeDAsset.componentId`, but nothing here creates a second one — the existing row
for the component, if any, is always the one updated). `404` if the component
doesn't exist. To actually get a `url` for `kind: "GLTF_MODEL"`, request an upload
URL first via `POST /api/assets` with `purpose: "model"` (see below), PUT the file
there, then pass the returned `publicUrl` here.

### `POST /api/assets`
`ADMIN`/`INVENTORY_MANAGER` only. Body: `{ filename, contentType, purpose?: "image"
| "model" }` (`purpose` defaults to `"image"`). `contentType` is checked against an
allowlist for the given `purpose` — images: `image/png`, `image/jpeg`,
`image/webp`, `image/gif`; models: `model/gltf-binary`, `model/gltf+json`,
`application/octet-stream` (browsers almost never report a real MIME type for
`.glb`, so `application/octet-stream` is accepted rather than rejecting real GLB
uploads on a technicality) — `400` on an unsupported type. Returns `{ uploadUrl,
publicUrl, key }`: `uploadUrl` is a short-lived (5 min) presigned S3 PUT URL the
client uploads the file bytes to directly (this route never sees the file itself —
see ARCHITECTURE.md §9); `publicUrl` is what to store (as a component's image URL,
or as a `ThreeDAsset.url`) once the upload succeeds. See `apps/web/lib/storage.ts`
and `docs/DEVELOPMENT.md`'s object storage section for the local (SeaweedFS) vs.
production (Cloudflare R2) setup — same code, different env vars.

### `POST /api/compatibility/check`
Public — read-only and computed entirely from public catalog data, so no
different in trust level from browsing `/api/components`. Body:
`{ selections: [{ componentId, quantity? }] }` (`quantity` defaults to `1`).
Looks up each `componentId` (via `apps/web/lib/compatibility.ts`), silently
skips unknown/deleted ids and components in categories the compatibility
engine doesn't model yet (e.g. `MONITOR`, `CASE_LCD`) rather than failing the
whole check, and calls `@pcbuilder/compatibility-engine`'s
`runCompatibilityCheck()`. Returns a `CompatibilityReport`: `{ overallStatus:
"OK"|"WARNING"|"ERROR", results: [{ ruleKey, compatible, severity, message,
affectedComponents }], estimatedPowerWatts, recommendedPsuWattage }`. `400` on
malformed input (missing `componentId`, etc.). This is the same
`runCompatibilityCheck()` the `/workspace` build flow UI calls, per
ARCHITECTURE.md §6's single-source-of-truth requirement — no compatibility
logic is duplicated between this route and the UI.

### Route protection
- `apps/web/proxy.ts` (Next.js 16's renamed `middleware.ts` convention) gates
  `/admin/:path*`, redirecting to `/` unless the session's JWT role is `ADMIN` or
  `INVENTORY_MANAGER`.
- `apps/web/lib/requireRole.ts` is the authoritative server-side check — use it at
  the top of any server component or API route handler that needs role enforcement;
  never trust a client-supplied role.

## Builds (signed-in users)

Every builds route requires a session (any role: `USER`, `ADMIN` or
`INVENTORY_MANAGER`) and is scoped to the caller: a build owned by someone else —
even by an admin looking at a user's — is reported as `404`, never `403`, so build ids
can't be probed. Logic shared by the routes is in `apps/web/lib/builds.ts`.

A build's components are sent as **`rows`**: `[{ componentId, installedZoneKey }]`,
**one row per physical unit** (two identical RAM kits = two rows). `installedZoneKey`
is a 3D installation zone (`MOBO_TRAY`, `RAM_SLOT_1`, `FAN_MOUNT_2`, ...) or
`"UNPLACED"` for a unit that is in the build but not placed (the case is always
`UNPLACED`). The client converts to/from its in-memory shape with
`serializeBuild` / `deserializeBuild` from `@pcbuilder/three-d-engine`.

### `GET /api/builds`
The caller's builds, newest-updated first, as
`{ id, name, estimatedPowerWatts, compatibilityStatus, createdAt, updatedAt,
_count: { components } }`.

### `POST /api/builds`
Body: `{ name (1-100 chars, trimmed), rows?: Row[] (default []), workspaceState? }`.
Creates the build, and stores a server-computed snapshot of the compatibility report
(`compatibilityStatus`) and `estimatedPowerWatts` — the client never supplies those.
`400` for invalid input or if any `componentId` no longer exists. `201` with the build.

`workspaceState` is **not stored as sent**: only `{ camera: { position: [x,y,z],
target: [x,y,z] } }` is understood, each coordinate must be a finite number within
±100, and the position must differ from the target. Anything else is dropped (the
existing value is left unchanged), so the column can never hold arbitrary client JSON.

### `GET /api/builds/:id`
The build with its `components`, each including `component` with `category`, `brand`
and `threeDAssets`. `404` if it doesn't exist or isn't yours.

### `PATCH /api/builds/:id`
Body (all optional): `{ name?, rows?, workspaceState? }`. `rows`, when present,
**replaces the entire component set** (the workspace saves full state, not diffs) and
recomputes the compatibility/power snapshot; if a `componentId` is unknown the whole
request fails with `400` and the build is unchanged. `404` if not found/not yours.

### `DELETE /api/builds/:id`
Deletes the build and, by cascade, its `BuildComponent` rows. `404` if not found/not yours.

### `POST /api/builds/:id/duplicate`
Creates a copy named `"<name> (copy)"` (truncated to 100 chars) with the same
components, camera and snapshot. The copy is always **private** — sharing state is
never copied. `201` with the new build.

### `POST /api/builds/:id/share`
Body: `{ enabled: boolean }`. Owner only.
- `enabled: true` — makes the build publicly viewable and returns
  `{ isShared: true, shareSlug }`. The slug is a random 12-character URL-safe token
  (72 bits of entropy). Calling it again while shared returns the *same* slug (so the
  link doesn't change on repeated clicks).
- `enabled: false` — returns `{ isShared: false, shareSlug: null }` and **deletes the
  slug**, so the old link is dead for good; re-enabling mints a new, different slug.

## Public shared view

### `GET /shared/:slug` (page, not a JSON route)
No authentication. Renders a read-only view of a build — the 3D scene, component list,
build summary, airflow, estimates, and the compatibility report as of the owner's last
save — with no picker and no save/share controls. It resolves only when the build has
`isShared = true` **and** the slug matches; anything else (unknown slug, sharing turned
off) is a `404`. The saved camera viewpoint is restored if the build has one.
