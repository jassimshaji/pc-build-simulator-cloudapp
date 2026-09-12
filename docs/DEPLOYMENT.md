# Deployment

Status: design-stage — no deployment configured yet. Full rationale in
[`project-management/ARCHITECTURE.md`](../project-management/ARCHITECTURE.md) §8 and
[`project-management/DECISIONS.md`](../project-management/DECISIONS.md) (ADR-005).

## Target architecture

- **App hosting:** Vercel (Next.js app + API routes), auto-deploy on merge to `main`,
  preview deployments per PR.
- **Database:** Neon (serverless Postgres), with a DB branch per PR preview where practical.
- **Object storage:** Cloudflare R2 (S3-compatible) for component images and GLTF/GLB
  3D models, served via Cloudflare CDN.
- **CI:** GitHub Actions runs lint/typecheck/test on every PR; merge to `main` triggers
  the Vercel production deploy.

## Environment variables

See [`.env.example`](../.env.example) at the repo root for the full list (database
URL, Auth.js secret, R2 credentials, app URL). Secrets are set in Vercel project
settings and GitHub Actions secrets — never committed.

This document will gain exact setup steps (Vercel project config, Neon project setup,
R2 bucket/CORS config, GitHub Actions workflow file) once Phase 1 infra is stood up.
