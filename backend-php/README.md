# Price Intel — PHP API (Hostinger)

Plain PHP 8.1+ and MySQL/MariaDB, with no Composer and no framework. It replaces the old
`api.gogizmo.co` backend with the same routes, so the dashboard and the desktop
agent work unchanged. It adds routes for the GoFix model import and the
GitHub Actions scraper.

## Layout on Hostinger

```
domains/<domain>/price-intel-config.php   ← DB password + token; outside the web root
domains/<domain>/public_html/             ← static dashboard (Next.js export)
domains/<domain>/public_html/api/         ← this folder
```

The dashboard calls `/api/...` on its own domain, so no CORS setup is needed.
It's a normal **PHP website**, not a Hostinger "Node.js app" (those can't serve
a Next.js static export and don't run PHP).

## Deploy with Git (recommended)

GitHub Actions (`.github/workflows/deploy-hostinger.yml`) builds the site on
every push to `main` and commits the finished files to the **`hostinger`**
branch. Hostinger pulls that branch, so neither Hostinger nor your PC needs Node.js.

1. **Database**: hPanel → Databases → MySQL Databases → create a database and user.
   In phpMyAdmin, select it and import `schema.sql`.
2. **First build**: merge the pull request into `main`. The build runs by
   itself and a `hostinger` branch appears. Later you can re-run it any time
   from Actions → *Deploy to Hostinger* → Run workflow.
3. **Empty `public_html`**: hPanel → File Manager → delete Hostinger's default
   `default.php` / `index.php`. Git deploy needs an empty folder.
4. **Connect Git**: hPanel → Advanced → **Git** → repository
   `https://github.com/95kodi/price-intel-dashboard.git`, branch **`hostinger`**,
   install path empty (that means `public_html`) → Create → **Deploy**.
   - If the repo is private, use the SSH URL (`git@github.com:95kodi/price-intel-dashboard.git`)
     and add the SSH key hPanel shows under GitHub → repo → Settings → Deploy keys.
5. **Auto-deploy**: in the same Git screen, enable auto deployment and copy the
   webhook URL into the GitHub secret `HOSTINGER_DEPLOY_WEBHOOK`. Every build
   then triggers a pull. Without it, click **Deploy** in hPanel after a build.
6. **Config**: File Manager → go one level *above* `public_html` (the
   `domains/<domain>/` folder) → upload `config.sample.php` as
   **`price-intel-config.php`** and fill in the DB credentials and a long
   random `scrape_token`. Deploys never touch it, and it isn't reachable from the web.
7. **Check**: `https://yourdomain.com/api/health` should return `{"success":true,"db":"ok",...}`.
8. **Import phones**: wait for the first scheduled scrape, or run it now:
   ```bash
   curl -X POST -H "X-Scrape-Token: <scrape_token>" https://yourdomain.com/api/models/sync
   ```

## Deploy by upload (no Git)

`npm run build:hostinger` on your PC writes `hostinger/public_html/` (dashboard
+ `api/`). Zip its *contents*, including the hidden `.htaccess` files, upload
the zip to `public_html` and extract it. Then do steps 1, 6, 7 and 8 above.

### Bringing over data from the old backend (optional, do this before step 6)

From hPanel → Advanced → SSH (or any machine with PHP that can reach the DB):

```bash
php public_html/api/tools/import-from-old-api.php https://api.gogizmo.co
```

It copies products (same IDs), mapped URLs (as manual), and price history. It
refuses to run once models have been synced, because old IDs would collide with them.

## Routes

| Method | Path | Notes |
|---|---|---|
| GET | `/products/?page=&page_size=` | page_size ≤ 100 |
| GET | `/products/{id}` | |
| POST | `/products/save` | `ProductID: 0` creates, `IsActive: false` deactivates |
| GET | `/platforms/` · `/platforms/{id}` | |
| POST | `/platforms/save` | |
| GET | `/product-platform-url/product/{id}` | active URLs, with `UrlSource` (`manual`/`auto`) |
| POST | `/product-platform-url/save` · `/urlmap/update-url` | saves as `manual` |
| GET | `/price-comparison/` | one row per active product with ≥1 URL; `<Store>Price` / `<Store>URL` columns |
| GET | `/platform-price-history/product/{id}` | latest price per store |
| POST | `/platform-price-history/save` | used by the desktop agent |
| GET | `/price-history/product/{id}?days=180` | history grouped by store |
| POST | `/models/sync` 🔑 | imports GoFix `GetModelList` (device ids from config, default phones) |
| GET | `/scrape/jobs` 🔑 | products + URLs + recent search misses, for the scraper |
| POST | `/scrape/results` 🔑 | batch of prices / misses from the scraper (≤ 500) |

🔑 = needs the `X-Scrape-Token` header (or `Authorization: Bearer …`) equal to `scrape_token`.

## How URLs and prices behave

- **Manual URLs** (entered in the dashboard) always win. The scraper prices
  them but never replaces them.
- **Auto URLs** are found by the scraper's store search. If one stops giving a
  price, the scraper searches again and the API re-links it.
- If a store has no listing for a model, that is recorded in `search_misses` and the
  scraper waits `SEARCH_RETRY_DAYS` (default 3) before searching that store
  again.
- The latest price is always stored on the listing. A `price_history` row is only added when
  the price or MRP changes, or once per day, so frequent scans don't flood the table.

## Model sync

`POST /models/sync` (or the cron script `cron/sync-models.php`) reads
`GetDeviceList`, `GetBrandList` and `GetModelList`. The GoFix API ignores the
`deviceId` filter, so the sync filters by `device_ids` itself. Models are
keyed on `ExternalModelID`. A re-sync updates brand, model name and launch date,
but keeps your edits to `ItemName`, `IsActive` and `CurrentPrice`. Model names
repeated under two GoFix ids are imported once.

## Security notes

- The dashboard routes (products, platforms, URLs, prices) have no login, just as on
  the old backend. Anyone who finds the URL can read and edit them. Only the scraper
  routes need the token. Adding a dashboard login is a separate change.
- Error details only go to the PHP error log, never to the client.

## Local development

```bash
# MySQL/MariaDB running locally, schema.sql imported, config.php filled in
php -S 127.0.0.1:8099 backend-php/index.php
# then in another terminal, with NEXT_PUBLIC_API_URL=http://127.0.0.1:8099 in .env.local
npm run dev
```
