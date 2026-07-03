# Bilal Inventory

Multi-marketplace inventory management. Warehouse-first model with per-marketplace allocation, sale-price overrides, and immutable stock-movement ledger.

## Architecture

```
bilal-inventory/
├── apps/
│   ├── web/                 Next.js 15 frontend (App Router, Tailwind, shadcn, TanStack Query)
│   └── api/                 NestJS 11 backend (Prisma, Supabase Postgres, Supabase Auth)
└── packages/
    ├── shared/              Zod schemas, types, constants — single source of truth
    ├── eslint-config/       Shared lint config
    └── tsconfig/            Shared tsconfig bases
```

Layered architecture in every NestJS module: **Controller → Service → Repository → Prisma**. RBAC enforced globally via three guards: `JwtAuthGuard` → `RolesGuard` → `PermissionsGuard`.

## Prerequisites

- Node 20+ (Node 22 recommended)
- pnpm 10+
- A Supabase project (free tier is fine)

## Setup

### 1. Install

```bash
pnpm install
```

### 2. Supabase project

Create a project at https://supabase.com. From **Project Settings → Database**, copy:
- `Connection string` (Transaction pooler, port 6543) → `DATABASE_URL`
- `Connection string` (Session, direct, port 5432) → `DIRECT_URL`

From **Project Settings → API**:
- Project URL → `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
- `anon` key → `SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
- JWT Secret → `SUPABASE_JWT_SECRET`

From **Storage**, create a public bucket: `article-images`.

### 3. Env files

```bash
cp .env.example .env                       # root (used by both apps)
cp apps/web/.env.example apps/web/.env.local
```

Fill in the Supabase values.

### 4. Prisma migrate + seed

```bash
pnpm --filter @bilal/api db:migrate      # creates tables
psql "$DIRECT_URL" -f apps/api/prisma/migrations/init/migration.sql   # auth.users → public.users trigger
pnpm --filter @bilal/api db:seed         # seeds roles, permissions, settings
```

### 5. Create first admin

**Dev (recommended for local setup)** — one command, fixed credentials:

```bash
pnpm --filter @bilal/api db:dev-superuser
# → admin@dev.local / admin123456 (admin role)
```

This creates an email-confirmed Supabase Auth user, mirrors it into `public.users`, and grants the admin role. Safe to re-run — resets the password each time. Refuses to run when `NODE_ENV=production`.

Override the defaults if you want:

```bash
DEV_SUPERUSER_EMAIL=me@x.test DEV_SUPERUSER_PASSWORD=secret123 \
  pnpm --filter @bilal/api db:dev-superuser
```

**Real user (production)** — sign up in Supabase Auth Dashboard, then grant admin:

```bash
pnpm --filter @bilal/api exec tsx prisma/grant-admin.ts you@example.com
```

### 6. Run dev

```bash
pnpm dev                # runs web (3000) + api (4000) in parallel via Turborepo
```

Open http://localhost:3000.

## Project commands

```bash
pnpm dev                  # all apps in dev mode
pnpm build                # all apps
pnpm lint
pnpm typecheck
pnpm test                 # api unit tests
```

Prisma:

```bash
pnpm --filter @bilal/api db:studio       # open Prisma Studio
pnpm --filter @bilal/api db:migrate      # new migration
pnpm --filter @bilal/api db:reset        # drop and recreate (dev only)
```

## Domain model

- **Collection** groups articles
- **Article** has SKU code, image, purchase price, and per-size warehouse stock
- **Marketplace** is a sales channel (Daraz, Shopify, retail store...)
- **MarketplaceArticle** assigns an article to a marketplace with a per-marketplace sale price
- **MarketplaceArticleStock** tracks allocated and sold pieces per size at that marketplace
- **StockMovement** is the immutable audit ledger (every change is logged)

### Inventory invariants (enforced by `InventoryService` transactions)
1. Warehouse stock can never go negative — allocation rejected if insufficient.
2. Marketplace allocated stock can never go negative — sales rejected if insufficient.
3. Every state change creates a `StockMovement` row in the same transaction.

### Computed values
- Article *total* (per size) = `warehouseQuantity + Σ marketplace.allocatedQuantity`
- Marketplace *remaining* (per size) = `allocatedQuantity`
- Low-stock flag: any value above < `settings.low_stock_threshold` (default 10)

## RBAC

Roles (seeded): `admin`, `warehouse_manager`, `marketplace_manager`, `viewer`.

Permissions are strings like `article.create`, `sale.record`, `marketplace.assign_article`. Defined once in [`packages/shared/src/constants/permissions.ts`](packages/shared/src/constants/permissions.ts):
- Backend uses `@Permissions('article.create')` decorator
- Frontend uses `<Can permission="article.create">` component
- DB-seeded via `pnpm --filter @bilal/api db:seed`

To customize role permissions, edit `ROLE_PERMISSIONS` and re-run seed.

## Adding a new feature

1. Add Zod schema + types in `packages/shared/src/schemas/`
2. Add Prisma model in `apps/api/prisma/schema.prisma`, then `pnpm --filter @bilal/api db:migrate`
3. Add backend module: controller (Zod pipe + `@Permissions`), service (business rules + transactions), repository (Prisma calls)
4. Add frontend feature folder: `api.ts` (TanStack Query hooks) + components
5. Add page under `apps/web/app/`

## API surface (v1, prefix `/api/v1`)

```
GET    /auth/me

GET    /collections                                     COLLECTION_READ
POST   /collections                                     COLLECTION_CREATE
PATCH  /collections/:id                                 COLLECTION_UPDATE
DELETE /collections/:id                                 COLLECTION_DELETE (cascades its articles)
DELETE /collections                                     COLLECTION_DELETE + ARTICLE_DELETE (clear all)

POST   /import/warehouse                                COLLECTION_CREATE + ARTICLE_CREATE (bulk CSV import)

GET    /collections/:collectionId/articles              ARTICLE_READ
GET    /articles/:id                                    ARTICLE_READ
POST   /articles                                        ARTICLE_CREATE
PATCH  /articles/:id                                    ARTICLE_UPDATE
DELETE /articles/:id                                    ARTICLE_DELETE
POST   /articles/:id/image                              ARTICLE_UPDATE (multipart)

GET    /marketplaces                                    MARKETPLACE_READ
GET    /marketplaces/:id/articles                       MARKETPLACE_READ
POST   /marketplaces                                    MARKETPLACE_CREATE
PATCH  /marketplaces/:id                                MARKETPLACE_UPDATE
DELETE /marketplaces/:id                                MARKETPLACE_DELETE

POST   /inventory/assign                                MARKETPLACE_ASSIGN_ARTICLE + INVENTORY_ALLOCATE
POST   /inventory/allocate                              INVENTORY_ALLOCATE
PATCH  /inventory/sale-price                            MARKETPLACE_SET_PRICE
POST   /inventory/sales                                 SALE_RECORD
POST   /inventory/sales-report/preview                  SALE_RECORD (diff upload vs stock, read-only)
POST   /inventory/sales-report/commit                   SALE_RECORD (apply confirmed deductions)
POST   /inventory/return                                INVENTORY_RETURN
GET    /inventory/stock/article/:articleId              INVENTORY_READ
GET    /inventory/low-stock                             INVENTORY_READ
GET    /inventory/movements/article/:articleId          INVENTORY_READ

GET    /users                                           USER_READ
POST   /users/:id/roles                                 USER_ASSIGN_ROLE
PATCH  /users/:id/active                                USER_UPDATE
GET    /roles                                           USER_READ

GET    /settings                                        SETTINGS_READ
PATCH  /settings/low-stock-threshold                    SETTINGS_UPDATE

GET    /audit-log                                       AUDIT_LOG_READ
```

## Deployment

Both apps run on the **Vercel free tier** as two separate projects built from this one monorepo:

| App | Vercel project | Root dir | URL |
|-----|----------------|----------|-----|
| Web (Next.js) | `bilal-inventory-web` | `apps/web` | https://bilal-inventory-web.vercel.app |
| API (NestJS)  | `bilal-inventory-api` | `apps/api` | https://bilal-inventory-api.vercel.app |

The API runs as a Vercel **serverless function**: `apps/api/api/index.ts` re-exports the compiled `apps/api/src/vercel-handler.ts` (Nest bootstrapped over its own Express instance, `app.init()` instead of `listen()`). Build/route config is in `apps/api/vercel.json`. Prisma's `binaryTargets` includes `rhel-openssl-3.0.x` for Vercel's Lambda runtime.

**Auto-deploy:** both projects are connected to this GitHub repo, and **every push to `main` deploys both** (each project's *Ignored Build Step* is `exit 1`, i.e. always build — needed so a `packages/shared` change never gets one app skipped).

**Manual deploy** (from the repo root — the `.vercel` link is shared, so re-link before each):

```bash
vercel link --yes --project bilal-inventory-web && vercel deploy --prod   # frontend
vercel link --yes --project bilal-inventory-api && vercel deploy --prod   # backend
```

Env vars are configured per-project in Vercel (never committed): the backend needs the Supabase keys + `DATABASE_URL`/`DIRECT_URL` + `CORS_ORIGIN`; the frontend needs the `NEXT_PUBLIC_*` values. Node is pinned to 22.x on both.

