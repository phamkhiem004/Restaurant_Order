# Restaurant Order

NestJS backend adapted to run directly on Cloudflare Workers with Cloudflare
D1, plus a Next.js frontend exported as static assets. It does not require a
Container, MySQL server, or Hyperdrive.

## Local development

Install dependencies and initialize the local D1 database:

```bash
npm install
npm run db:migrate:local
npm run dev:worker
```

The frontend and API are then available at `http://localhost:8787`.

Useful test endpoints:

```text
GET /health
GET /menu-items
GET /dining-tables
GET /dining-tables/map
GET /reservations
GET /orders/order
GET /orders/order-item
```

The local D1 data is stored by Wrangler under `.wrangler/state` and is
separate from the production database.

## First Cloudflare deployment

Authenticate Wrangler, then create the D1 database:

```bash
npx wrangler login
npx wrangler d1 create restaurant-db
```

Copy the returned `database_id` into `wrangler.jsonc`, replacing:

```text
00000000-0000-0000-0000-000000000000
```

Apply the schema and demo seed data to production:

```bash
npm run db:migrate:remote
```

Validate and deploy:

```bash
npm run deploy:dry-run
npm run deploy
```

When Cloudflare Builds is connected to GitHub, use `npm run deploy` as the
deploy command. The D1 binding name must remain `DB`.

## VNPAY

Store production credentials as Worker secrets rather than committing them:

```bash
npx wrangler secret put VNP_TMN_CODE
npx wrangler secret put VNP_HASH_SECRET
npx wrangler secret put VNP_RETURN_URL
```

`VNP_RETURN_URL` should use the deployed Worker URL, for example:

```text
https://restaurant-order.tula5904.workers.dev/vnpay/vnpay-return
```

`VNP_URL` is optional and defaults to the VNPAY sandbox URL.

## RealtimeKit meeting demo

The backend can create a meeting, add a host or guest participant, and return
an auth token. It also serves a small browser test page using Cloudflare's
RealtimeKit UI Kit.

Create a Cloudflare API token with `Realtime` or `Realtime Admin` permission,
then configure the Worker secret:

```bash
npx wrangler secret put REALTIMEKIT_API_TOKEN
```

Meeting endpoints require an authenticated session. `STAFF` and `ADMIN` users
can create a host meeting. `CUSTOMER` users can only join as guests, even if
they modify the requested role in the browser.

## Login, roles, and Redis sessions

Users and roles (`CUSTOMER`, `STAFF`, `ADMIN`) are stored in D1. Session tokens
are stored in Upstash Redis for seven days and sent to the browser in an
`HttpOnly`, `SameSite=Lax` cookie.

Create an Upstash Redis database, copy its REST credentials, and save them as
Worker secrets:

```bash
npx wrangler secret put UPSTASH_REDIS_REST_URL
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN
```

If Redis is temporarily unreachable, the session store falls back to the D1
`auth_sessions` table so users can still sign in. Configure a production
Upstash database to make Redis the primary session store.

The frontend source is under `frontend/`. `npm run build:frontend` creates its
static export, and `npm run deploy` builds both Next.js and the Worker before
uploading them together to the same `workers.dev` domain.

## Database migration note

`restaurant_db.sql` is the original MySQL schema and is retained only as a
reference. D1 uses SQLite, so its active schema is in `migrations/`. Existing
rows from a local MySQL server are not automatically copied to D1; export and
transform those rows separately if they are needed.
