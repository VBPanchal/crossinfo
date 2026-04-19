# Docker (Plan A — frontend image)

- **`docker-compose.yml`** — builds the Vite app and serves it with Nginx.
- **`frontend/Dockerfile`** — requires `VITE_*` build args (see `docker/.env.example`).

Supabase itself is **not** in this file: use the **official** [supabase/supabase `docker/` compose](https://github.com/supabase/supabase/tree/master/docker) on the same host or another VM.

Full steps: [docs/DOCKER_PLAN_A_SELFHOST.md](../docs/DOCKER_PLAN_A_SELFHOST.md).

```bash
cp docker/.env.example docker/.env
# edit docker/.env
docker compose -f docker/docker-compose.yml --env-file docker/.env up -d --build
```
