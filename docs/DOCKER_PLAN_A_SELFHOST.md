# Plan A: All-Docker, self-hosted (minimal app changes)

Goal: **No Supabase Cloud, no Lovable, no other SaaS backends** — run **Supabase’s official Docker stack** on your machine/EC2, plus this repo’s **web** image. Keep using **`@supabase/supabase-js`** in the frontend (minimal TypeScript changes).

This document complements [SELF_HOSTING_FROM_LOVABLE.md](./SELF_HOSTING_FROM_LOVABLE.md).

---

## 1. What runs in Docker

| Stack | Image / source | Role |
|--------|----------------|------|
| **Supabase** | Official [supabase/docker](https://github.com/supabase/supabase/tree/master/docker) `docker-compose.yml` | Postgres, Kong (API gateway), GoTrue, PostgREST, Realtime, Storage, Meta, Studio, etc. |
| **This app (Vite SPA)** | `docker/frontend/Dockerfile` in **this repo** | Static UI; talks to Kong via `VITE_SUPABASE_*` baked at **build** time |

Optional: put **Caddy** or **Nginx** on the host in front of both (TLS, single hostname).

---

## 2. One-time: get the Supabase stack

1. On the server (EC2 or any Linux with Docker):

   ```bash
   git clone --depth 1 https://github.com/supabase/supabase.git
   cd supabase/docker
   cp .env.example .env
   ```

2. Edit **`docker/.env`** (Supabase’s file):

   - Set strong **`POSTGRES_PASSWORD`**, **`JWT_SECRET`**, **`ANON_KEY`**, **`SERVICE_ROLE_KEY`** (generate JWTs that match your `JWT_SECRET`; Supabase docs explain the format, or use their helper scripts in the repo).
   - Set **`API_EXTERNAL_URL`**, **`SITE_URL`**, **`ADDITIONAL_REDIRECT_URLS`** to the URLs users will use (your app + auth redirects).

3. Start:

   ```bash
   docker compose up -d
   ```

4. Note the **Kong** port (default often **8000** for HTTP API). Your browser will call **`http://<host>:8000`** or **`https://api.yourdomain.com`** behind a reverse proxy.

5. **Migrate data** from Supabase Cloud into this Postgres (dump/restore or logical replication) — same DB schema as your `supabase/migrations`.

---

## 3. Build and run this frontend (Docker)

From the **project root** of this app:

1. Copy env for the **web** compose file:

   ```bash
   cp docker/.env.example docker/.env
   # Edit docker/.env — set VITE_* to match YOUR self-hosted Kong URL and anon key
   ```

2. Build and run:

   ```bash
   docker compose -f docker/docker-compose.yml --env-file docker/.env up -d --build
   ```

3. Open **`http://<server>:8080`** (or `WEB_PORT` from `docker/.env`).

**Important:** `VITE_*` variables are embedded at **build** time. If you change Supabase URL or keys, **rebuild** the `web` image.

---

## 4. Environment variables (frontend)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Kong base URL (what was `https://xxx.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **anon** `JWT` (must match self-hosted `ANON_KEY`) |
| `VITE_SUPABASE_PROJECT_ID` | Still used in a few places (e.g. PayPal function URL construction) — set to your **project ref** string you configure for self-hosted (often a short id in Studio) |
| `VITE_PUBLIC_APP_URL` | Public **web** URL (e.g. `https://app.example.com`) for QR codes and consistent links; optional (defaults to current origin) |

See root [`.env.example`](../.env.example).

---

## 5. Edge Functions (Deno) on self-hosted Supabase

Deploy the functions from this repo to **your** instance using **Supabase CLI** against the self-hosted URL:

```bash
supabase link --project-ref <your-ref>
supabase functions deploy <name>
```

Configure **secrets** in the self-hosted environment (same vars you used on Cloud: PayPal, SMTP, etc.).

### Remove Lovable-only npm usage in functions (required for “no third party”)

These Edge Functions currently depend on **`@lovable.dev/*`** packages:

- `process-email-queue` — `sendLovableEmail` / Lovable email API  
- `auth-email-hook`, `handle-email-suppression` — Lovable webhooks  

**Plan A “minimal” for the React app does not remove this** — you must either:

- Replace those calls with **direct SMTP** (or another self-hosted mail relay) inside the Deno code, **or**
- Point hooks to a small **internal** HTTP service you control.

Until then, those functions cannot be considered fully off third-party code.

Email **templates** under `supabase/functions/_shared/transactional-email-templates/` still contain **`cossinfo.lovable.app`** links — search/replace with `VITE_PUBLIC_APP_URL` or your real domain when you templating.

---

## 6. Cron / scheduled jobs

Functions like **`check-subscriptions`** were triggered on a schedule in the cloud. On self-hosted:

- **cron** on the host: `curl -fsS -H "Authorization: Bearer $SERVICE_ROLE_JWT" https://your-kong/functions/v1/check-subscriptions`
- or a small **sidecar** container with `cron` + `curl`.

Use the **service role** key only on the server, never in the browser.

---

## 7. TLS and one public hostname (recommended)

For production:

- Terminate HTTPS on **Caddy** or **Nginx** on the host (Let’s Encrypt).
- Proxy `/` → `web` container, and route API paths to **Kong** as per Supabase docs, **or** expose Kong on `api.` subdomain and CORS allow your app origin in GoTrue.

---

## 8. Code changes already done in this repo (Plan A)

- Removed unused **`@lovable.dev/cloud-auth-js`** and deleted **`src/integrations/lovable/index.ts`** (nothing imported it).
- QR / help text no longer hardcode **lovable.app**; use **`VITE_PUBLIC_APP_URL`** where needed.
- Added **`docker/`** frontend image and **`.dockerignore`**.

**Dev-only:** `lovable-tagger` remains in `vite.config.ts` for local dev; it is **not** applied in production `npm run build`.

---

## 9. Quick verification checklist

- [ ] Supabase Docker stack healthy (`docker compose ps` in `supabase/docker`).
- [ ] Studio loads; Postgres has migrated schema + data.
- [ ] `web` container built with correct `VITE_*`.
- [ ] Login, registration, storage upload, realtime flows work against self-hosted URL.
- [ ] Edge Functions deployed; Lovable-specific code removed or replaced.
- [ ] Cron for subscription check and email queue wired.

---

*Self-hosting Supabase is operationally heavy; for a smaller ops surface long term, see Strategy B (Nest + Postgres) in [BACKEND_MIGRATION_GUIDE.md](./BACKEND_MIGRATION_GUIDE.md).*
