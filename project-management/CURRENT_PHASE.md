# Current Phase

**Phase 1 — Core Cloud Application Foundation: IN PROGRESS**

Milestone 1 (monorepo scaffold) and Milestone 2 (database schema) are complete and
verified. See `DEVELOPMENT_ROADMAP.md` → Phase 1 for the full milestone list.

## Next up: Phase 1, Milestone 3 — Auth
Auth.js (NextAuth) Credentials provider + Prisma adapter in `apps/web`, register/login
pages, JWT session with a `role` claim (`USER` / `ADMIN` / `INVENTORY_MANAGER` — the
`Role` enum already exists on `User` in the Prisma schema), a shared `requireRole()`
server helper, and middleware-protected routes. See `ARCHITECTURE.md` §9 (security)
and `DEVELOPMENT_ROADMAP.md` → Phase 1 → Milestone 3.

Waiting for explicit user instruction ("Continue" / "Resume development") before
starting Milestone 3. See `SESSION_CHECKPOINT.md` for exact resume state.
