# API Reference

Status: auth (Phase 1, Milestone 3), read-only component/category routes (Phase 1,
Milestone 5), the inventory dashboard route (Phase 2, Milestone 2), admin CRUD +
image upload (Phase 2, Milestone 3), and stock/brand/category management (Phase 2,
Milestone 4) are all implemented; everything else is still design-stage. This
document will be filled in with real request/response shapes as each remaining
route is built.

## Conventions

Every route returns `packages/shared`'s envelope: `{ data, error }`, never both
populated (`apiSuccess(data)` / `apiError(message, issues?)` from
`@pcbuilder/shared`). Query/body validation uses Zod; a validation failure returns
`400` with `error.issues` set to the Zod flattened error. Mutating routes and
role-gated routes will use `apps/web/lib/requireRole.ts` — never trust a
client-supplied role.

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
component is referenced by a saved build's `BuildComponent` row (foreign key
constraint — no builds exist yet as of Phase 2, so this is currently unreachable in
practice, but handled rather than surfacing a raw 500).

### `POST /api/assets`
`ADMIN`/`INVENTORY_MANAGER` only. Body: `{ filename: string, contentType: string }`
— `contentType` must be one of `image/png`, `image/jpeg`, `image/webp`, `image/gif`.
Returns `{ uploadUrl, publicUrl, key }`: `uploadUrl` is a short-lived (5 min)
presigned S3 PUT URL the client uploads the file bytes to directly (this route never
sees the file itself — see ARCHITECTURE.md §9); `publicUrl` is what to store as the
component's image URL once the upload succeeds. See `apps/web/lib/storage.ts` and
`docs/DEVELOPMENT.md`'s object storage section for the local (SeaweedFS) vs.
production (Cloudflare R2) setup — same code, different env vars.

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

### Route protection
- `apps/web/proxy.ts` (Next.js 16's renamed `middleware.ts` convention) gates
  `/admin/:path*`, redirecting to `/` unless the session's JWT role is `ADMIN` or
  `INVENTORY_MANAGER`.
- `apps/web/lib/requireRole.ts` is the authoritative server-side check — use it at
  the top of any server component or API route handler that needs role enforcement;
  never trust a client-supplied role.

## Planned routes (Phase 2+)

| Route | Methods | Purpose | Auth |
|---|---|---|---|
| `/api/builds` | GET/POST | List/create user builds | USER+ |
| `/api/builds/:id` | GET/PATCH/DELETE | Load/update/delete a build | owner or ADMIN |
| `/api/compatibility/check` | POST | Run the compatibility engine against a build/component set | USER+ |

Each route will be documented here with request/response JSON examples as it's built.
