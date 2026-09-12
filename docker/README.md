# docker

`docker-compose.yml` for a local PostgreSQL instance (dev convenience only — the
deployed database is Neon, not this container).

```
docker compose -f docker/docker-compose.yml up -d
```

Starts Postgres 17 on `localhost:5432` (user/password/db: `pcbuilder`). Not required
if you already have a local Postgres server (e.g. installed directly via winget/apt) —
just point `DATABASE_URL` at that instead.

