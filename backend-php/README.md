# Price Intel — PHP API (Hostinger)

Plain PHP 8.1+ and MySQL/MariaDB, with no Composer and no framework. It replaces the old
`api.gogizmo.co` backend with the same routes, so the dashboard and the desktop
agent work unchanged. It adds routes for the GoFix model import and the
GitHub Actions scraper.

## Layout on Hostinger

```
public_html/            ← static dashboard (Next.js export, `out/`)
public_html/api/        ← this folder
public_html/api/config.php   ← created on the server, never committed
```

The dashboard calls `/api/...` on its own domain, so no CORS setup is needed.

## Deploy

1. **Database**: hPanel → Databases → MySQL Databases → create a database and user.
   Open phpMyAdmin, select the database, and import `schema.sql`.
2. **Build the upload bundle** (on your PC):
   ```bash
   npm install
   npm run build:hostinger
   ```
   This writes `hostinger/public_html/` with the dashboard plus `api/`.
3. **Upload**: hPanel → File Manager → `public_html` → upload the *contents* of
   `hostinger/public_html/`, including the hidden `.htaccess` files. You can also zip the
   folder, upload the zip, and extract it in File Manager.
4. **Config**: copy `api/config.sample.php` to `api/config.php` and fill in the
   DB credentials and a long random `scrape_token`.
5. **Check**: open `https://yourdomain.com/api/health`. It should return `{"success":true,"db":"ok",...}`.
6. **Import phones**: either wait for the first GitHub Actions run, or run it now:
   ```bash
   curl -X POST -H "X-Scrape-Token: <scrape_token>" https://yourdomain.com/api/models/sync
   ```

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
