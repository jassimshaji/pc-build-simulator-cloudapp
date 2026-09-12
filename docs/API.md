# API Reference

Status: auth routes (Phase 1, Milestone 3) and read-only component routes (Phase 1,
Milestone 5 — the last Phase 1 milestone) are implemented; everything else is still
design-stage. This document will be filled in with real request/response shapes as
each remaining route is built.

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

### `GET /api/inventory`
`ADMIN`/`INVENTORY_MANAGER` only (`401` if unauthenticated, `403` for a `USER`
session — via `requireRole`). Returns
`{ data: { totalComponents, outOfStockComponents, lowStockComponents,
recentlyUpdatedComponents }, error: null }`, each `*Components` array a flattened
row (`id, model, sku, categoryLabel, brandName, isAvailable, stockQuantity,
lowStockThreshold, updatedAt`) rather than the raw Prisma relations. Powers the
`/admin` dashboard (`apps/web/lib/inventory.ts`'s `getInventoryOverview()`, called
directly by both the page and this route to avoid duplicating the query logic).

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
| `/api/components` | POST | Create component | ADMIN, INVENTORY_MANAGER |
| `/api/components/:id` | PATCH/DELETE | Edit/delete component | ADMIN, INVENTORY_MANAGER |
| `/api/inventory/update` | POST | Update stock quantity / availability | ADMIN, INVENTORY_MANAGER |
| `/api/builds` | GET/POST | List/create user builds | USER+ |
| `/api/builds/:id` | GET/PATCH/DELETE | Load/update/delete a build | owner or ADMIN |
| `/api/compatibility/check` | POST | Run the compatibility engine against a build/component set | USER+ |
| `/api/assets` | GET/POST | List / request upload URL for 3D assets & images | ADMIN, INVENTORY_MANAGER |

Each route will be documented here with request/response JSON examples as it's built.
