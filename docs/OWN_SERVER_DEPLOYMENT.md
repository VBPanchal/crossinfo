# Deploy to your own server (same stack, no technology change)

This guide is for **moving off Lovable / Supabase Cloud hosting** while keeping the **same architecture**:

- **Frontend:** Vite + React (this repo), built to static files  
- **Backend:** Self-hosted **Supabase** (PostgreSQL + Auth + Storage + Realtime + Kong API gateway)  
- **Server logic:** **Supabase Edge Functions** (Deno), same code as in `supabase/functions/`  

There is **no** migration to NestJS, Prisma, or another database product. You are only **changing where** it runs.

---

## 1. What you will run on your server

| Piece | What it is today | On your server |
|-------|------------------|----------------|
| Web UI | SPA from this repo | Nginx or Docker image from `docker/` in this repo |
| API + DB + Auth | Supabase Cloud | Official **[Supabase Docker](https://github.com/supabase/supabase/tree/master/docker)** stack |
| Background/cron | Cloud schedules | **cron** + `curl` to your function URLs, or a small timer container |
| Files | Supabase Storage | Included in self-hosted Supabase (configure S3 backend if you want) |

Minimum server: **Linux x86_64**, **Docker** + **Docker Compose**, public IP or private + VPN, **4 GB+ RAM** for a comfortable Supabase stack (more for production traffic).

---

## 2. High-level order of work

1. Install Docker on the server.  
2. Clone and start the **official Supabase** `docker/` compose (separate repo).  
3. Configure **JWT secrets**, **keys**, and **URLs** in Supabase’s `.env`.  
4. **Migrate** database + storage from Supabase Cloud into your instance (dump/restore + file copy).  
5. **Deploy Edge Functions** from this repo to your instance (Supabase CLI).  
6. **Build** this frontend with `VITE_*` pointing at **your** Supabase API URL (Kong), not `*.supabase.co`.  
7. Serve the built site with **Nginx** or **`docker/docker-compose.yml`** in this repo.  
8. Add **HTTPS** (Let’s Encrypt) and **DNS** pointing to the server.  
9. Wire **cron** for functions that must run on a schedule (e.g. subscription checks).  

More detail for steps 6–7: [DOCKER_PLAN_A_SELFHOST.md](./DOCKER_PLAN_A_SELFHOST.md) (same stack, Docker-focused).

---

## 3. Supabase on the server (official Docker)

1. On the server:

   ```bash
   git clone --depth 1 https://github.com/supabase/supabase.git
   cd supabase/docker
   cp .env.example .env
   ```

2. Edit **`supabase/docker/.env`**. You must set at least:

   - Strong **`POSTGRES_PASSWORD`**
   - **`JWT_SECRET`** and matching **`ANON_KEY`** / **`SERVICE_ROLE_KEY`** (follow [Supabase self-hosting docs](https://supabase.com/docs/guides/self-hosting) for generating JWTs)
   - **`API_EXTERNAL_URL`** — public URL users will use to reach the API (e.g. `https://api.yourdomain.com`)
   - **`SITE_URL`** / redirect URLs for auth — your app URL (e.g. `https://app.yourdomain.com`)

3. Start:

   ```bash
   docker compose up -d
   ```

4. Open **Supabase Studio** (port documented in that compose, often behind firewall or reverse proxy) only for admin; do **not** expose Postgres `5432` to the internet.

---

## 4. Move data from Supabase Cloud

- **Database:** `pg_dump` from the Cloud project (or backup export) and restore into the Postgres container used by self-hosted Supabase — **same schema** as your `supabase/migrations/` (already applied).  
- **Storage:** sync objects from Cloud buckets (e.g. `store-profiles`) into your self-hosted Storage (or S3 if you configure it).  
- **Auth users:** use Supabase migration guidance so **`auth.users`** and sessions remain valid, or plan a password reset window.

Do this during a **maintenance window** if the app is live.

---

## 5. Edge Functions (unchanged code)

- Install **[Supabase CLI](https://supabase.com/docs/guides/cli)**.  
- Link your project to the **self-hosted** URL and deploy:

  ```bash
  cd /path/to/this/repo
  supabase link --project-ref <your-ref>
  supabase functions deploy <function-name>
  ```

- Set **secrets** on the self-hosted instance (PayPal, SMS, SMTP, etc.) — same variables you use on Cloud, names may match `supabase/functions/*/index.ts` and `supabase/config.toml`.

Some functions still reference **Lovable** npm packages for email; for a fully independent server you will eventually replace those with direct SMTP or another mail path (see [DOCKER_PLAN_A_SELFHOST.md](./DOCKER_PLAN_A_SELFHOST.md) § Edge Functions).

---

## 6. Frontend (this repo)

1. Copy **`.env.example`** to **`.env`** and set:

   - `VITE_SUPABASE_URL` = your **Kong** base URL (from self-hosted Supabase), **not** `https://xxx.supabase.co`  
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your self-hosted **anon** JWT  
   - `VITE_SUPABASE_PROJECT_ID` = project ref you use with self-hosted  
   - `VITE_PUBLIC_APP_URL` = public URL of the web app (for QR codes and links)

2. Build:

   ```bash
   npm ci
   npm run build
   ```

3. Deploy **`dist/`** with Nginx (SPA: `try_files ... /index.html`) or use:

   ```bash
   cp docker/.env.example docker/.env
   # edit docker/.env with same VITE_* as above
   docker compose -f docker/docker-compose.yml --env-file docker/.env up -d --build
   ```

Rebuild whenever you change `VITE_*`.

---

## 7. HTTPS and DNS

- Point **`app.yourdomain.com`** → web server.  
- Point **`api.yourdomain.com`** (or same host with paths) → reverse proxy to **Kong**.  
- Use **Caddy** or **Nginx** + **Let’s Encrypt** for TLS.  
- In Supabase Auth settings, add these URLs to allowed **redirect** / **site** URLs.

---

## 8. Scheduled jobs

Functions like **`check-subscriptions`** must be triggered on a schedule. On your server:

```bash
# Example: every 15 minutes (adjust URL and service role key)
*/15 * * * * curl -fsS -X POST -H "Authorization: Bearer $SERVICE_ROLE_JWT" "https://api.yourdomain.com/functions/v1/check-subscriptions"
```

Store the service role key only in root’s crontab env or a protected script — never in the frontend.

---

## 9. Checklist before go-live

- [ ] Supabase Docker stack healthy (`docker compose ps`).  
- [ ] Postgres data migrated; spot-check critical tables.  
- [ ] Storage files present; profile images load.  
- [ ] Edge Functions deployed; secrets set.  
- [ ] Frontend built with correct `VITE_*`; login and main flows work.  
- [ ] HTTPS on API and app origins.  
- [ ] Cron (or equivalent) for subscription / email queue functions.  
- [ ] Backups: Postgres dumps + Storage copy on a schedule.

---

## 10. What this document does *not* cover

- **Changing** the stack (e.g. NestJS, MySQL) — see [BACKEND_MIGRATION_GUIDE.md](./BACKEND_MIGRATION_GUIDE.md) only if you choose that later.  
- **Managed** AWS RDS / Supabase Cloud — here everything runs **on machines you control** with **Docker** (and optional S3 for Storage).

---

*Same technologies, new home: your server.*
