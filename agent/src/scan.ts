/**
 * Core scan logic shared by the CLI (src/index.ts) and the Electron UI
 * (electron/main.ts). Fetches products from the backend, scrapes every
 * platform URL with the dashboard's scrapers, and saves prices back.
 */
import * as fs from "fs";
import * as path from "path";

export interface AgentConfig {
  apiBase: string;
  /** 0 = run once and exit; otherwise rescan every N minutes (CLI only). */
  intervalMinutes: number;
  gatewayUrl?: string;
  proxyUrl?: string;
}

export const DEFAULT_CONFIG: AgentConfig = {
  // The PHP API on Hostinger; agent-config.json can point elsewhere.
  apiBase: "https://smartphonescrape.dotsmart.in/api",
  intervalMinutes: 0,
};

// Platforms whose pages are client-rendered and need a real browser.
const BROWSER_FETCH_PLATFORMS = new Set(["croma"]);

export function loadConfig(baseDir: string): AgentConfig {
  const file = path.join(baseDir, "agent-config.json");
  if (!fs.existsSync(file)) return { ...DEFAULT_CONFIG };
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return { ...DEFAULT_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export interface Product {
  ProductID: number;
  ItemName: string;
  IsActive: boolean | number;
}

export interface PlatformUrlItem {
  ProductPlatformID: number;
  PlatformName: string;
  ProductURL: string;
}

export interface ScanResult {
  product: string;
  platform: string;
  ok: boolean;
  price?: number;
  error?: string;
}

export interface ScanTotals {
  scanned: number;
  succeeded: number;
  failed: number;
  failures: { product: string; platform: string; error: string }[];
}

export interface ScanOptions {
  dryRun?: boolean;
  limit?: number;
}

export interface ScanCallbacks {
  /** Fired while checking which products have platform URLs mapped. */
  onDiscovery?(checked: number, total: number): void;
  /** Fired when discovery is done; total = products that have URLs. */
  onStart?(totalProducts: number): void;
  /** Fired when a product's scan begins. */
  onProduct?(index: number, total: number, name: string): void;
  /** Fired when a platform is about to be scraped. */
  onPlatform?(product: string, platform: string): void;
  /** Fired after each platform URL finishes (success or failure). */
  onResult?(result: ScanResult): void;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * Every active product with its mapped URLs, in one request. Shared hosting
 * (Hostinger) caps database connections per account, and the old discovery
 * (price-comparison, then two requests per product with 8 in flight) made
 * ~1,600 requests in a burst and got HTTP 500s back.
 */
async function getScannableProducts(
  apiBase: string
): Promise<{ product: Product; platforms: PlatformUrlItem[] }[]> {
  const res = await getJson<{
    data?: { ProductID: number; ItemName: string; Platforms?: PlatformUrlItem[] | null }[] | null;
  }>(`${apiBase}/product-platform-url/all`);
  return (res.data ?? [])
    .map((row) => ({
      product: { ProductID: row.ProductID, ItemName: row.ItemName, IsActive: true },
      platforms: (row.Platforms ?? []).filter((p) => p.ProductURL),
    }))
    .filter((row) => row.platforms.length > 0);
}

interface PendingPrice {
  ProductPlatformID: number;
  Price: number;
  MRP: number;
  Discount: number;
  product: string;
  platform: string;
}

/** Saves up to 200 prices in one request (one DB connection on the server). */
async function savePrices(apiBase: string, prices: PendingPrice[]): Promise<void> {
  const res = await fetch(`${apiBase}/platform-price-history/save-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Source: "Desktop Agent",
      Prices: prices.map(({ ProductPlatformID, Price, MRP, Discount }) => ({ ProductPlatformID, Price, MRP, Discount })),
    }),
  });
  if (!res.ok) throw new Error(`Saving ${prices.length} prices failed: HTTP ${res.status}`);
}

// Flush saved prices every N results, so a crash or Stop loses little.
const SAVE_BATCH = 25;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runScan(
  config: AgentConfig,
  opts: ScanOptions,
  cb: ScanCallbacks = {},
  isCancelled: () => boolean = () => false
): Promise<ScanTotals> {
  // http.ts reads gateway/proxy env vars at import time, so set them first.
  if (config.gatewayUrl) process.env.SCRAPER_GATEWAY_URL = config.gatewayUrl;
  if (config.proxyUrl) process.env.SCRAPER_PROXY_URL = config.proxyUrl;
  const { fetchProductPage } = await import("./lib/http");
  const { getParser } = await import("./lib/scrapers");

  const totals: ScanTotals = { scanned: 0, succeeded: 0, failed: 0, failures: [] };

  // Discovery: one request returns every active product with mapped URLs.
  let scannable = await getScannableProducts(config.apiBase);
  cb.onDiscovery?.(scannable.length, scannable.length);
  if (opts.limit && opts.limit > 0) scannable = scannable.slice(0, opts.limit);
  cb.onStart?.(scannable.length);

  // Prices go to the API in batches; a failed batch turns its results into failures.
  let pending: PendingPrice[] = [];
  const flush = async () => {
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];
    try {
      await savePrices(config.apiBase, batch);
    } catch (err) {
      for (const p of batch) {
        totals.succeeded--;
        totals.failed++;
        const failure = { product: p.product, platform: p.platform, error: (err as Error).message };
        totals.failures.push(failure);
        cb.onResult?.({ ...failure, ok: false });
      }
    }
  };

  for (const [i, { product, platforms }] of scannable.entries()) {
    if (isCancelled()) break;
    cb.onProduct?.(i, scannable.length, product.ItemName);

    for (const p of platforms) {
      if (isCancelled()) break;
      cb.onPlatform?.(product.ItemName, p.PlatformName);
      totals.scanned++;
      try {
        const needsBrowser = BROWSER_FETCH_PLATFORMS.has(p.PlatformName.toLowerCase());
        const html = await fetchProductPage(p.ProductURL, needsBrowser);

        const parser = getParser(p.PlatformName);
        if (!parser) throw new Error(`Unknown platform: ${p.PlatformName}`);

        const result = parser.parse(html);
        if (result.price === null || result.price <= 0) {
          throw new Error("Price not found in page");
        }

        if (!opts.dryRun) {
          pending.push({
            ProductPlatformID: p.ProductPlatformID,
            Price: result.price,
            MRP: result.mrp ?? result.price,
            Discount: result.discount ?? 0,
            product: product.ItemName,
            platform: p.PlatformName,
          });
        }
        totals.succeeded++;
        cb.onResult?.({
          product: product.ItemName,
          platform: p.PlatformName,
          ok: true,
          price: result.price,
        });
      } catch (err) {
        totals.failed++;
        const failure = {
          product: product.ItemName,
          platform: p.PlatformName,
          error: (err as Error).message,
        };
        totals.failures.push(failure);
        cb.onResult?.({ ...failure, ok: false });
      }

      if (pending.length >= SAVE_BATCH) await flush();
      // Small pause between requests so we don't hammer the sites.
      await sleep(1500);
    }
  }

  // Also runs after Stop, so prices already scraped are kept.
  await flush();
  return totals;
}
