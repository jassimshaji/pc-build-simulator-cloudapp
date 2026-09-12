# API Reference

Status: auth routes implemented (Phase 1, Milestone 3); everything else is still
design-stage. This document will be filled in with real request/response shapes as
each remaining route is built; for now it records the intended surface from
`project-management/ARCHITECTURE.md`.

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

### Route protection
- `apps/web/proxy.ts` (Next.js 16's renamed `middleware.ts` convention) gates
  `/admin/:path*`, redirecting to `/` unless the session's JWT role is `ADMIN` or
  `INVENTORY_MANAGER`.
- `apps/web/lib/requireRole.ts` is the authoritative server-side check — use it at
  the top of any server component or API route handler that needs role enforcement;
  never trust a client-supplied role.

## Conventions (once implemented)
- All responses use a consistent envelope: `{ data, error }` (never both populated).
- Mutating routes validate input with a Zod schema before touching the database.
- Protected routes read the Auth.js session; role checks go through a shared
  `requireRole()` helper — never trust a client-supplied role.

## Planned routes

| Route | Methods | Purpose | Auth |
|---|---|---|---|
| `/api/auth/*` | — | Auth.js handlers (register/login/session) | public |
| `/api/components` | GET | List/search/filter components | public |
| `/api/components/categories` | GET | List component categories | public |
| `/api/components/search` | GET | Full-text/spec search | public |
| `/api/components/:id` | GET | Component detail | public |
| `/api/components` | POST | Create component | ADMIN, INVENTORY_MANAGER |
| `/api/components/:id` | PATCH/DELETE | Edit/delete component | ADMIN, INVENTORY_MANAGER |
| `/api/inventory` | GET | Stock overview (low/out-of-stock, recent) | ADMIN, INVENTORY_MANAGER |
| `/api/inventory/update` | POST | Update stock quantity / availability | ADMIN, INVENTORY_MANAGER |
| `/api/builds` | GET/POST | List/create user builds | USER+ |
| `/api/builds/:id` | GET/PATCH/DELETE | Load/update/delete a build | owner or ADMIN |
| `/api/compatibility/check` | POST | Run the compatibility engine against a build/component set | USER+ |
| `/api/assets` | GET/POST | List / request upload URL for 3D assets & images | ADMIN, INVENTORY_MANAGER |

Each route will be documented here with request/response JSON examples as it's built.
