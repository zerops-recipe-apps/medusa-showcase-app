# Medusa Showcase

<!-- #ZEROPS_EXTRACT_START:intro# -->
Medusa v2.19 commerce backend, admin, and Next.js 16 App Router storefront in one monorepo for [Zerops](https://zerops.io). PostgreSQL, Valkey, Meilisearch, and MinIO ship with the project; first deploy migrates, seeds B2C + B2B channels, and writes a publishable key the storefront reads at runtime.
<!-- #ZEROPS_EXTRACT_END:intro# -->

⬇️ **Deploy on Zerops**

[![Deploy on Zerops](https://github.com/zeropsio/recipe-shared-assets/blob/main/deploy-button/light/deploy-button.svg)](https://app.zerops.io/recipes/medusa-showcase?environment=small-production)

Import YAMLs and environment docs live in the [Medusa recipe catalog](https://github.com/zeropsio/recipes/tree/main/medusa-showcase) (`zeropsio/recipes`) — not in this app repo.

## Repository layout

| Path | Service | Port | Package manager |
| --- | --- | --- | --- |
| [`backend/`](backend/) | Medusa API + admin (`zeropsSetup: medusa`) | `9000` | Yarn 1 |
| [`nextstore/`](nextstore/) | Next.js SSR storefront (`zeropsSetup: nextstore`) | `8000` | Yarn 3 (Berry) |

Root [`zerops.yml`](zerops.yml) defines both setups. Each Zerops service clones this repo and runs the matching setup (`buildCommands` use `cd backend` / `cd nextstore`).

## Requirements

- Node.js **24+** on Zerops (`nodejs@24`)
- **Backend:** Node `^20.19.0 || >=22.12.0`, Yarn 1.22, PostgreSQL, Valkey
- **Storefront:** Node `>=24.0.0`, Yarn 3.2.3 via Corepack

## Local development

### Backend

```bash
cd backend
cp .env.template .env
yarn
yarn dev
```

Admin: [http://localhost:9000/app](http://localhost:9000/app) — default `admin@example.com` / `supersecret` from `.env.template`.

### Storefront

```bash
cd nextstore
cp .env.template .env.local
yarn
yarn dev
```

Set `NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000` and a publishable key from Admin → Settings → API Key Management.

Storefront: [http://localhost:8000](http://localhost:8000)

## Admin login (Zerops)

| Where | URL |
| --- | --- |
| Admin UI | `{API_URL}/app` on the **medusa** service (port 9000); `{API_URL}/` redirects there |
| Storefront | `{APP_URL}` on **nextstore** (port 8000) |

Credentials: **medusa** service secrets `SUPERADMIN_EMAIL` (default `admin@example.com`) and `SUPERADMIN_PASSWORD` (generated on import).

## Publishable key boot order

Deploy **medusa** before **nextstore** on first import (medusa has higher `priority`). Medusa init writes `CHANNEL_PUBLISHABLE_KEY`, then POSTs nextstore `/api/internal/reload-env` using project `RELOAD_SECRET` so the storefront process respawns with a resolved `pk_` key.

## Optional integrations

SMTP, Stripe, Google/GitHub auth, PostHog, and Meilisearch search — see [`backend/.env.template`](backend/.env.template). Empty SMTP host logs email locally; empty Meilisearch host skips indexing.

Need help? Join the [Zerops Discord](https://discord.gg/zeropsio).

<!-- #ZEROPS_EXTRACT_START:integration-guide# -->
## Integration Guide

### 1. Monorepo `zerops.yml`

[`zerops.yml`](zerops.yml) at the repo root defines two setups:

- **`medusa`** — builds in `backend/`, deploys `.medusa/server`, port 9000, init migrate/seed/publishable key/reload nextstore
- **`nextstore`** — builds in `nextstore/` with Corepack + Yarn Berry, port 8000, readiness `/api/health`

Both services use the same `buildFromGit: https://github.com/zerops-recipe-apps/medusa-showcase` URL; Zerops selects the setup via `zeropsSetup` in [import.yaml](https://github.com/zeropsio/recipes/tree/main/medusa-showcase).

Map project value store keys in each setup (`APP_URL`, `API_URL`, `SEARCH_URL`) — never put framework keys on import **service** blocks.

### 2. Key configuration points

- Medusa: Redis Caching Module (`MEDUSA_FF_CACHING=true`), MinIO file module, in-repo Meilisearch module
- Nextstore: `NEXT_PUBLIC_*` baked at build time; instrumentation respawns until publishable key is `pk_*`
- Do not switch nextstore to `type: static` / `output: 'export'`
<!-- #ZEROPS_EXTRACT_END:integration-guide# -->
