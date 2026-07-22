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
  apiBase: "https://api.gogizmo.co",
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

/** One row of /price-comparison/ — a product plus its per-platform URLs. */
interface ComparisonRow {
  ProductID: number;
  ItemName: string;
  [field: string]: unknown;
}

/**
 * ProductIDs that already have at least one competitor URL mapped, according
 * to the backend's price-comparison view. This replaces probing every product
 * in the catalog: the catalog holds thousands of rows but only a handful have
 * URLs, and price-comparison already knows which ones.
 */
async function getMappedProductIds(apiBase: string): Promise<number[]> {
  const res = await getJson<{ data?: ComparisonRow[] | null }>(
    `${apiBase}/price-comparison/`
  );
  return (res.data ?? [])
    .filter((row) =>
      Object.entries(row).some(
        ([key, value]) => key.endsWith("URL") && typeof value === "string" && value
      )
    )
    .map((row) => row.ProductID);
}

async function savePrice(
  apiBase: string,
  productPlatformId: number,
  price: number,
  mrp: number | null,
  discount: number | null
): Promise<boolean> {
  const res = await fetch(`${apiBase}/platform-price-history/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      PriceID: 0,
      ProductPlatformID: productPlatformId,
      Price: price,
      MRP: mrp ?? price,
      Discount: discount ?? 0,
      Source: "Desktop Agent",
      IsActive: 1,
    }),
  });
  return res.ok;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runs `worker` over `items` with at most `concurrency` in flight. */
async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i]);
      }
    })
  );
  return results;
}

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

  // Discovery: price-comparison tells us up front which products have URLs
  // mapped, so we only look up those instead of probing the whole catalog.
  const mappedIds = await getMappedProductIds(config.apiBase);

  let checked = 0;
  const discovered = await mapConcurrent(mappedIds, 8, async (productId) => {
    if (isCancelled()) return null;
    try {
      const [urls, product] = await Promise.all([
        getJson<{ ItemName?: string; Platforms?: PlatformUrlItem[] | null }>(
          `${config.apiBase}/product-platform-url/product/${productId}`
        ),
        getJson<Product>(`${config.apiBase}/products/${productId}`),
      ]);
      if (!product.IsActive) return null;

      const platforms = (urls.Platforms ?? []).filter((p) => p.ProductURL);
      return platforms.length > 0 ? { product, platforms } : null;
    } catch (err) {
      totals.failed++;
      const failure = {
        product: `Product ${productId}`,
        platform: "—",
        error: (err as Error).message,
      };
      totals.failures.push(failure);
      cb.onResult?.({ ...failure, ok: false });
      return null;
    } finally {
      cb.onDiscovery?.(++checked, mappedIds.length);
    }
  });

  let scannable = discovered.filter(
    (d): d is { product: Product; platforms: PlatformUrlItem[] } => d !== null
  );
  if (opts.limit && opts.limit > 0) scannable = scannable.slice(0, opts.limit);
  cb.onStart?.(scannable.length);

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
          const saved = await savePrice(
            config.apiBase,
            p.ProductPlatformID,
            result.price,
            result.mrp,
            result.discount
          );
          if (!saved) throw new Error("Backend rejected the price save");
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

      // Small pause between requests so we don't hammer the sites.
      await sleep(1500);
    }
  }

  return totals;
}
