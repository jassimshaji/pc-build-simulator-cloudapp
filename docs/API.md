# API Reference

Status: design-stage — no routes implemented yet (Phase 1+). This document will be
filled in with real request/response shapes as each route is built; for now it records
the intended surface from `project-management/ARCHITECTURE.md`.

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
