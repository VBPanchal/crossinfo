# Moving off Lovable to EC2 / your own server

Today the app is built around **Supabase** (database, auth, storage, realtime, Edge Functions) plus **Lovable**-specific pieces. “All services” means you take ownership of each layer below.

---

## 1. What you have today (inventory)

| Capability | Where it lives now | Self-host options |
|------------|-------------------|-------------------|
| **React/Vite SPA** | Lovable build/hosting | Your server (Nginx), S3+CloudFront, or any static host |
| **Supabase Postgres + RLS** | Supabase Cloud project | **Self-hosted Supabase** (Docker on EC2/ECS) **or** **RDS Postgres** + your own API (e.g. Nest) — see [BACKEND_MIGRATION_GUIDE.md](./BACKEND_MIGRATION_GUIDE.md) |
| **Supabase Auth** (email OTP, passwords, sessions) | Supabase Cloud | Part of self-hosted Supabase **or** replace with Nest auth + same DB |
| **OAuth (Google / Apple)** | **`@lovable.dev/cloud-auth-js`** → then `supabase.auth.setSession` ([`src/integrations/lovable/index.ts`](../src/integrations/lovable/index.ts)) | **Remove Lovable**: configure **Google/Apple OAuth in Supabase** (hosted or self-hosted) and use **`supabase.auth.signInWithOAuth`** from the client, **or** implement OAuth in Nest |
| **Storage** (`store-profiles` bucket) | Supabase Storage | Self-hosted Supabase Storage **or** S3 + app URLs in DB |
| **Realtime** (channels) | Supabase Realtime | Self-hosted Realtime **or** WebSockets in Nest |
| **Edge Functions** (email, PayPal, OTP, cron, …) | Supabase-hosted Deno functions | Run same Deno functions on your infra **or** port to Nest — see [`supabase/functions/`](../supabase/functions/) |
| **Cron / scheduled jobs** (e.g. `check-subscriptions`) | Supabase scheduler / platform | **cron on EC2**, **systemd timer**, or **Nest `@Cron`** hitting your API |
| **Secrets** | Lovable / Supabase dashboards | **Env files** (never commit), **SSM/Secrets Manager** on AWS, or Vault |

---

## 2. Two coherent strategies

### Strategy A — Keep Supabase-compatible stack (smallest app rewrite)

**Step-by-step Docker layout for this repo:** [DOCKER_PLAN_A_SELFHOST.md](./DOCKER_PLAN_A_SELFHOST.md).

1. Run **self-hosted Supabase** (official Docker stack) on **EC2** (or ECS/EKS for scale).
2. **Migrate** your Supabase Cloud project: DB dump, Storage objects, Auth users (Supabase documents migration paths).
3. Point the frontend `VITE_SUPABASE_*` at **your** Supabase URL (Kong gateway on EC2).
4. **Remove Lovable OAuth**: enable OAuth providers in **your** Supabase Auth settings; replace `lovable.auth.signInWithOAuth` usage with **Supabase client** OAuth only (remove `cloud-auth-js`).
5. Deploy **Edge Functions** with Supabase CLI to your self-hosted instance **or** run Deno processes + reverse proxy.
6. Host static build on **same VPC** (Nginx on EC2) or S3+CDN.

**Pros:** Less TypeScript rewrite; keeps `supabase-js` patterns.  
**Cons:** You operate Postgres + many Supabase services; upgrades and backups are on you.

### Strategy B — Leave Supabase product entirely (your Nest + Prisma plan)

1. **RDS** (or Postgres on server) + **NestJS** + **Prisma** as in [BACKEND_MIGRATION_GUIDE.md](./BACKEND_MIGRATION_GUIDE.md) and [DATABASE_AND_API_REFERENCE.md](./DATABASE_AND_API_REFERENCE.md).
2. Replace **all** `supabase` client calls with HTTP to Nest; replace Edge Functions with Nest modules.
3. **OAuth**: Passport / Auth.js / Supabase-less OAuth → your user table.
4. Frontend: static hosting + `VITE_API_URL`; remove `@supabase/supabase-js` and Lovable packages when done.

**Pros:** One app server, one DB, simpler long-term mental model.  
**Cons:** Large migration (already tasked in `backend-migration-tasks.*`).

---

## 3. Lovable-specific code to remove or replace

| Item | Action |
|------|--------|
| `@lovable.dev/cloud-auth-js` | Remove after OAuth flows use **Supabase Auth OAuth** (Strategy A) or **Nest OAuth** (Strategy B) |
| [`src/integrations/lovable/index.ts`](../src/integrations/lovable/index.ts) | Delete or replace; search imports of `lovable` in the app |
| `lovable-tagger` in Vite (dev) | Dev-only; can drop for production builds |
| Lovable-hosted preview URL | Replaced by your domain / EC2 IP |

---

## 4. EC2 “all on one box” smoke layout (Strategy A, minimal)

Suitable for **verification**, not ideal production HA:

- **One EC2** (e.g. `t3.xlarge`+ depending on load) with Docker.
- **Supabase self-hosted** via official Compose: Postgres + Kong + Auth + Realtime + Storage API + Studio (restrict Studio by firewall).
- **Nginx**: TLS (ACM on ALB optional), serve Vite `dist/`, reverse-proxy to Kong.
- **Cron**: `crontab` or systemd calling `curl` your Edge Function URLs or a small worker container.

**Do not** expose Postgres `5432` to the internet.

---

## 5. EC2 + managed DB (better ops)

- **RDS PostgreSQL** + self-hosted **only** the services you need (harder: must match Supabase’s expectations) **or** full Supabase stack with external Postgres if documented.

Most teams either: **full Supabase Compose on EC2**, or **RDS + Nest** (Strategy B).

---

## 6. Cutover checklist (high level)

1. **Freeze** Lovable deploys; work from your Git repo.
2. **Backup** Supabase: DB + list Storage objects + export auth user list if migrating.
3. **Stand up** target (self-hosted Supabase **or** Nest + RDS).
4. **Point DNS** / env vars; test auth, uploads, payments, email.
5. **Remove** Lovable project dependency; revoke old API keys when stable.

---

## 7. Related docs in this repo

- [BACKEND_MIGRATION_GUIDE.md](./BACKEND_MIGRATION_GUIDE.md) — Nest + Prisma migration tasks.
- [DATABASE_AND_API_REFERENCE.md](./DATABASE_AND_API_REFERENCE.md) — tables, RPCs, proposed REST API.

---

*Strategy A = faster exit from Lovable with fewer code changes; Strategy B = full ownership with more engineering (already estimated in migration workbook).*
