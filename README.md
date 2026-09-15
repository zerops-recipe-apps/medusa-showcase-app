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

Credentials: **medusa** service secrets `SUPERADMIN_EMAIL` (default `admin@example.com`) and `SUPERADMIN_PASSWORD` (generated on import). Use those only on `{API_URL}/app` — they are not storefront customer logins.

## Publishable key boot order

Deploy **medusa** before **nextstore** on first import (medusa has higher `priority`). Medusa init writes `CHANNEL_PUBLISHABLE_KEY`, then POSTs nextstore `/api/internal/reload-env` using project `RELOAD_SECRET` so the storefront process respawns with a resolved `pk_` key.

## Optional integrations

SMTP, Stripe, Google/GitHub auth, PostHog, and Meilisearch search — see [`backend/.env.template`](backend/.env.template). Empty SMTP host logs email locally; empty Meilisearch host skips indexing.

Need help? Join the [Zerops Discord](https://discord.gg/zeropsio).

<!-- #ZEROPS_EXTRACT_START:integration-guide# -->
## Integration Guide

### 1. Monorepo `zerops.yml`

[`zerops.yml`](zerops.yml) at the repo root defines two setups:

```yaml
# yaml-language-server: $schema=https://api.app-prg1.zerops.io/api/rest/public/settings/zerops-yaml-json-schema.json
#
# Monorepo: backend/ (Medusa v2.19 + admin) and nextstore/ (Next.js 16 SSR).
# Setup names `medusa` and `nextstore` must match import.yaml zeropsSetup.
# Project value store: APP_URL / API_URL (aliases NEXT_STORE_URL / MEDUSA_INSTANCE_URL).

zerops:
  - setup: medusa
    build:
      envVariables:
        BACKEND_URL: ${API_URL}
      base: nodejs@24
      buildCommands:
        - cd backend && yarn
        - cd backend && yarn build
        # Overlay recipe scripts + seed assets into the compiled tree (same
        # /var/www layout as zeropsio/recipe-medusa; this repo is a monorepo).
        - cd backend && cp -f package.json tsconfig.json .medusa/server/ && if [ -d src/scripts/seed-files ]; then mkdir -p .medusa/server/src/scripts && cp -a src/scripts/seed-files .medusa/server/src/scripts/; fi
      deployFiles:
        - backend/.medusa/server/~
        - backend/~node_modules
      cache:
        - backend/node_modules
    deploy:
      readinessCheck:
        httpGet:
          port: 9000
          path: /health
    run:
      base: nodejs@24
      envVariables:
        DATABASE_TYPE: postgres
        NODE_ENV: production
        MEDUSA_DISABLE_TELEMETRY: "true"
        MEDUSA_FF_CACHING: "true"
        BACKEND_URL: ${API_URL}
        STOREFRONT_URL: ${APP_URL}
        STORE_CORS: ${APP_URL},${ANALOG_STORE_URL},http://localhost:8000,http://localhost:5173,http://localhost:3000
        ADMIN_CORS: ${API_URL},http://localhost:5173,http://localhost:9000
        AUTH_CORS: ${APP_URL},${API_URL},http://localhost:8000,http://localhost:5173,http://localhost:9000
        DATABASE_URL: postgresql://${db_user}:${db_password}@${db_hostname}:5432/${db_hostname}?sslmode=disable
        MINIO_BUCKET: ${storage_bucketName}
        MINIO_ENDPOINT: ${storage_apiUrl}
        MINIO_SECRET_KEY: ${storage_secretAccessKey}
        MINIO_ACCESS_KEY: ${storage_accessKeyId}
        REDIS_URL: ${redis_connectionString}
        CACHE_REDIS_URL: ${redis_connectionString}
        EVENTS_REDIS_URL: ${redis_connectionString}
        WE_REDIS_URL: ${redis_connectionString}
        LOCKING_REDIS_URL: ${redis_connectionString}
        MEILISEARCH_HOST: http://${search_hostname}:${search_port}
        MEILISEARCH_API_KEY: ${search_masterKey}
        MEILISEARCH_PRODUCT_INDEX_NAME: products
        JWT_SECRET: ${JWT_SECRET}
        COOKIE_SECRET: ${COOKIE_SECRET}
        SMTP_HOST: ${SMTP_HOST}
        SMTP_PORT: ${SMTP_PORT}
        SMTP_USER: ${SMTP_USER}
        SMTP_PASS: ${SMTP_PASS}
        SMTP_FROM: ${SMTP_FROM}
        SMTP_SECURE: ${SMTP_SECURE}
        STRIPE_API_KEY: ${STRIPE_API_KEY}
        STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
        GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
        GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
        GOOGLE_CALLBACK_URL: ${APP_URL}/auth/google/callback
        GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}
        GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET}
        GITHUB_CALLBACK_URL: ${APP_URL}/auth/github/callback
        POSTHOG_EVENTS_API_KEY: ${POSTHOG_EVENTS_API_KEY}
        POSTHOG_HOST: ${POSTHOG_HOST}
        NEXTSTORE_RELOAD_SECRET: ${RELOAD_SECRET}
      initCommands:
        - zsc execOnce ${appVersionId}_migration -- yarn migrate
        - zsc execOnce ${appVersionId}_links -- yarn syncLinks
        # v2: idempotent emailpass bind. The first key could mark success
        # after `medusa user` hit "already exists" with no working password.
        - zsc execOnce createInitialSuperadmin_v2 -- yarn createInitialSuperadmin
        - zsc execOnce seedInitialData -- yarn seedInitialData
        - yarn setInitialPublishableKey
        - yarn reloadNextstoreEnv
        - zsc execOnce addInitialSearchDocuments -- yarn addInitialSearchDocuments
      ports:
        - port: 9000
          httpSupport: true
      start: yarn start
      healthCheck:
        httpGet:
          port: 9000
          path: /health

  - setup: nextstore
    build:
      base: nodejs@24
      envVariables:
        MEDUSA_BACKEND_URL: ${API_URL}
        MEDUSA_PUBLISHABLE_KEY: ${medusa_CHANNEL_PUBLISHABLE_KEY}
        NEXT_PUBLIC_MEDUSA_BACKEND_URL: ${API_URL}
        NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: ${medusa_CHANNEL_PUBLISHABLE_KEY}
        NEXT_PUBLIC_BASE_URL: ${APP_URL}
        NEXT_PUBLIC_DEFAULT_REGION: de
        NEXT_PUBLIC_SEARCH_ENDPOINT: ${SEARCH_URL}
        NEXT_PUBLIC_SEARCH_API_KEY: ${RUNTIME_NEXT_PUBLIC_SEARCH_API_KEY}
        NEXT_PUBLIC_FEATURE_SEARCH_ENABLED: ${RUNTIME_NEXT_PUBLIC_FEATURE_SEARCH_ENABLED}
        NEXT_PUBLIC_INDEX_NAME: ${RUNTIME_NEXT_PUBLIC_INDEX_NAME}
        OBJECT_STORAGE_API_URL: ${RUNTIME_OBJECT_STORAGE_API_URL}
        NEXT_PUBLIC_STRIPE_KEY: ${STRIPE_PUBLISHABLE_KEY}
      prepareCommands:
        - corepack enable
      buildCommands:
        - cd nextstore && yarn
        - cd nextstore && yarn build
      deployFiles:
        - nextstore/.next
        - nextstore/package.json
        - nextstore/next.config.js
        - nextstore/yarn.lock
        - nextstore/.yarnrc.yml
        - nextstore/node_modules
        - nextstore/public
        - nextstore/check-env-variables.js
      cache:
        - nextstore/node_modules
    deploy:
      readinessCheck:
        httpGet:
          port: 8000
          path: /api/health
    run:
      base: nodejs@24
      start: sh -c 'cd nextstore && ./node_modules/.bin/next start -p 8000'
      healthCheck:
        httpGet:
          port: 8000
          path: /api/health
      ports:
        - port: 8000
          httpSupport: true
      envVariables:
        MEDUSA_BACKEND_URL: http://${medusa_hostname}:9000
        MEDUSA_PUBLISHABLE_KEY: ${medusa_CHANNEL_PUBLISHABLE_KEY}
        NEXT_PUBLIC_MEDUSA_BACKEND_URL: ${API_URL}
        NEXT_PUBLIC_BASE_URL: ${APP_URL}
        NEXT_PUBLIC_DEFAULT_REGION: de
        NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: ${medusa_CHANNEL_PUBLISHABLE_KEY}
        NEXT_PUBLIC_SEARCH_ENDPOINT: ${SEARCH_URL}
        NEXT_PUBLIC_FEATURE_SEARCH_ENABLED: "true"
        NEXT_PUBLIC_INDEX_NAME: products
        NEXT_PUBLIC_SEARCH_API_KEY: ${search_defaultSearchKey}
        OBJECT_STORAGE_API_URL: ${storage_apiUrl}
        NEXT_PUBLIC_STRIPE_KEY: ${STRIPE_PUBLISHABLE_KEY}
```

- **`medusa`** — builds in `backend/`, deploys `.medusa/server`, port 9000, init migrate/seed/publishable key/reload nextstore
- **`nextstore`** — builds in `nextstore/` with Corepack + Yarn Berry, port 8000, readiness `/api/health`

Both services use the same `buildFromGit: https://github.com/zerops-recipe-apps/medusa-showcase` URL; Zerops selects the setup via `zeropsSetup` in [import.yaml](https://github.com/zeropsio/recipes/tree/main/medusa-showcase).

Map project value store keys in each setup (`APP_URL`, `API_URL`, `SEARCH_URL`) — never put framework keys on import **service** blocks.

### 2. Key configuration points

- Medusa: Redis Caching Module (`MEDUSA_FF_CACHING=true`), MinIO file module, in-repo Meilisearch module
- Nextstore: `NEXT_PUBLIC_*` baked at build time; instrumentation respawns until publishable key is `pk_*`
- Do not switch nextstore to `type: static` / `output: 'export'`
<!-- #ZEROPS_EXTRACT_END:integration-guide# -->
