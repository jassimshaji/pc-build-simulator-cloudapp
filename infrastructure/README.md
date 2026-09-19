# infrastructure

Provider setup notes and (later) any infrastructure-as-code needed for Vercel/Neon/
Cloudflare R2 configuration. See `../docs/DEPLOYMENT.md` and
`../project-management/ARCHITECTURE.md` §8 for the target deployment architecture.

## seaweedfs/s3-config.json

The IAM identity config for the local-dev object storage server (SeaweedFS, standing
in for Cloudflare R2 — see `../docs/DEVELOPMENT.md` for full setup steps and
`../project-management/DECISIONS.md` ADR-008 for why). Defines the `pcbuilder`
read/write credential the app uses and an `anonymous` read-only identity so uploaded
images are publicly viewable without a signed URL, matching how a real R2 bucket
would typically be configured for public assets. Local-dev-only credentials — not
used in production.

If the local server starts but every presigned upload is rejected with `403
InvalidAccessKeyId`, this file was never loaded — usually because a path with a space
made the SeaweedFS flag parser ignore the rest of its command line. The fix (short
8.3 paths, `Start-Process -ArgumentList`, alternative ports) is documented in
`../docs/DEVELOPMENT.md`.
