# PriceIntel — Market Price Intelligence Dashboard

A production-ready retail pricing intelligence dashboard built with Next.js 15 (App Router), TypeScript, Tailwind CSS, TanStack Query, TanStack Table, and Recharts. Monitor your prices against Amazon, Flipkart, Poorvika, Reliance Digital, and other marketplaces.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it redirects to `/dashboard`.

## Pages

- `/dashboard` — KPI cards, price comparison table (search/filter/sort/paginate), win/loss pie chart, brand gap bar chart, competitor coverage chart, and a simulated price scan flow.
- `/competitors` — manage tracked competitor websites (add/edit/delete/enable-disable).
- `/products` — product catalog with CRUD, search, and pagination.
- `/winners-losers` — side-by-side lists of products beating vs. losing to the market, with recommended actions.
- `/notifications` — scan-generated alerts with read/unread state and severity styling.
- `/settings` — general, scanning, and notification preferences.

## Architecture

```
src/
  app/                  # Next.js App Router pages (one folder per route)
  components/
    ui/                 # Reusable primitives: Button, Input, Select, Modal, Badge, Skeleton, States
    layout/              # Sidebar, PageHeader
    dashboard/           # KPI cards, price table, scan button
    charts/              # Recharts wrappers
    products/            # Product table, winners/losers lists
    competitors/         # Competitor table
    notifications/       # Notifications list
    settings/            # Settings form
  hooks/useQueries.ts    # All TanStack Query hooks (queries + mutations)
  services/api.ts        # Mock service layer — swap internals for real HTTP calls later
  lib/
    mock-data.ts         # Seed data + derived calculations (status, gaps, coverage)
    utils.ts              # Formatters, status colors, cn() helper
  types/index.ts          # Shared TypeScript interfaces matching the data model
```

## Status logic

- **Winning**: our price < lowest competitor price (green)
- **Matching**: our price == lowest competitor price (blue)
- **Losing**: our price > lowest competitor price (red)

## Connecting a real backend

All data currently flows through `src/services/api.ts`, which simulates network latency and mutates in-memory arrays seeded from `src/lib/mock-data.ts`. To connect a real PostgreSQL + scraping engine backend:

1. Replace the function bodies in `services/api.ts` with `fetch()` calls to your REST endpoints (the route shapes already match the spec: `GET /api/dashboard/summary`, `GET/POST/PUT/DELETE /api/products`, `GET/POST/PUT/DELETE /api/competitors`, `GET/POST /api/product-urls`, `POST /api/scan/run`).
2. Leave `hooks/useQueries.ts` untouched — React Query hooks call the service layer, not the mock data, so the rest of the app needs no changes.
3. Add environment-based API base URL config as needed.

## Tech stack

Next.js 15 (App Router), TypeScript, Tailwind CSS v4, TanStack Query v5, TanStack Table v8, Recharts, Lucide Icons.

## Scraping configuration (production)

Marketplaces with bot protection (Amazon, Croma, Reliance Digital) block requests from
datacenter IPs, so scrapes that work on localhost fail on Vercel. Configure one of these
environment variables in your deployment to route around the block:

- `SCRAPER_GATEWAY_URL` — a scraping-API endpoint that returns rendered HTML. Use `{url}`
  as the placeholder for the encoded target, e.g.
  `https://api.scraperapi.com/?api_key=YOUR_KEY&render=true&url={url}`
- `SCRAPER_PROXY_URL` — a standard residential/rotating proxy (`http://user:pass@host:port`)
  used by the headless browser.

Fetch order per scrape: plain HTTP → headless browser → gateway. On serverless, when a
gateway is configured, blocked platforms go straight to the gateway. Without either
variable, blocked scrapes fail with an explicit "Blocked by site bot protection" error
instead of "Price not found".
