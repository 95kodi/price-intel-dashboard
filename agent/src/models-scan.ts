/**
 * Model-list price scan — runs on GitHub Actions (scheduled) or any machine.
 *
 * Products come from the PHP API, which imports them from GoFix
 * GetModelList. For every product × store:
 *   - a known URL (manual or auto) → fetch the page, parse the price;
 *   - no URL yet → search the store by model name, pick the best-matching
 *     listing, then parse its page. The API stores that URL as 'auto';
 *   - an auto URL that stops yielding a price → search again.
 * Manual URLs (typed in the dashboard) are never replaced.
 *
 * Usage:
 *   models-scan.cjs [--platform flipkart,poorvika] [--limit 50] [--dry-run]
 *                   [--sync] [--research] [--products 12,34] [--variants]
 *
 * Env:
 *   API_BASE              https://yourdomain.com/api   (required)
 *   SCRAPE_TOKEN          same as scrape_token in the API's config.php (required)
 *   MAX_MODEL_AGE_YEARS   skip searching models launched longer ago (default 3, 0 = all)
 *   SEARCH_RETRY_DAYS     wait this long before re-searching a model a store didn't have (default 3)
 *   DELAY_MS              pause between requests to the same store (default 1500)
 *   SCAN_SOURCE           label stored with each price (default "GitHub Actions")
 *   SCRAPER_GATEWAY_URL / SCRAPER_PROXY_URL   optional anti-bot escape hatches (see lib/http.ts)
 */
import * as fs from "fs";
import { fetchProductPage, BlockedError } from "./lib/http";
import { getParser } from "./lib/scrapers";
import { getSearcher, searchQueries } from "./lib/search";
import { matchingHits, pickBestHit } from "./lib/search/match";
import type { SearchHit } from "./lib/search/types";
import { parseVariant, variantKey, type VariantInfo } from "./lib/search/variant";

interface JobLink {
  ProductPlatformID: number;
  PlatformID: number;
  ProductURL: string;
  UrlSource: "manual" | "auto";
  IsActive: boolean;
}

interface JobProduct {
  ProductID: number;
  ItemName: string;
  Brand: string;
  ModelName: string;
  FromModelList: boolean;
  LaunchDate: string | null;
  links: JobLink[];
  misses: { PlatformID: number; SearchedAt: string }[];
  /** Storage + colour combinations any store has listed for this model. */
  variants?: { Storage: string; Color: string }[];
}

interface JobPlatform {
  PlatformID: number;
  PlatformCode: string;
  PlatformName: string;
  IsEnabled: boolean;
}

interface Jobs {
  platforms: JobPlatform[];
  products: JobProduct[];
}

type Result =
  | {
      ProductID: number;
      PlatformID: number;
      ProductURL: string;
      MatchedTitle?: string;
      Price: number;
      MRP: number | null;
      Discount: number | null;
      /** Set for a variant listing; the API files it under that variant of ProductID. */
      Variant?: { RAM: string | null; Storage: string; Color: string };
    }
  | { ProductID: number; PlatformID: number; miss: true; reason: string };

interface PlatformStats {
  platform: string;
  priced: number;
  newUrls: number;
  misses: number;
  failed: number;
  blocked: number;
  skippedOld: number;
  variants: number;
  aborted: string | null;
}

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const option = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const API_BASE = (process.env.API_BASE || "").replace(/\/+$/, "");
const TOKEN = process.env.SCRAPE_TOKEN || "";
const MAX_AGE_YEARS = Number(process.env.MAX_MODEL_AGE_YEARS ?? 3);
const RETRY_DAYS = Number(process.env.SEARCH_RETRY_DAYS ?? 3);
const DELAY_MS = Number(process.env.DELAY_MS ?? 1500);
const SOURCE = process.env.SCAN_SOURCE || "GitHub Actions";
const DRY_RUN = flag("dry-run");
const RESEARCH = flag("research");
// Also record every storage + colour variant each store lists, priced from
// the search results (no product-page fetch per variant).
const VARIANTS = flag("variants");
const LIMIT = Number(option("limit") ?? 0);
// Product pages that are client-rendered and need a real browser (same as
// scan.ts). Others start with plain HTTP and only escalate when blocked.
const PAGE_NEEDS_BROWSER = new Set(["croma"]);
// Consecutive blocks before giving up on a store for this run.
const MAX_CONSECUTIVE_BLOCKS = 5;
const BATCH_SIZE = 50;
// Extra "<model> <storage>" searches per model and store in variant mode.
const MAX_STORAGE_SEARCHES = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Scrape-Token": TOKEN },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

function tooOld(p: JobProduct): boolean {
  if (!p.FromModelList || MAX_AGE_YEARS <= 0 || !p.LaunchDate) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - MAX_AGE_YEARS);
  return new Date(p.LaunchDate) < cutoff;
}

function recentlyMissed(p: JobProduct, platformId: number): boolean {
  const miss = p.misses.find((m) => m.PlatformID === platformId);
  if (!miss || RESEARCH) return false;
  return Date.now() - new Date(miss.SearchedAt).getTime() < RETRY_DAYS * 86_400_000;
}

async function scrapePrice(platform: string, url: string) {
  const parser = getParser(platform);
  if (!parser) throw new Error(`No price parser for ${platform}`);
  const html = await fetchProductPage(url, PAGE_NEEDS_BROWSER.has(platform.toLowerCase()));
  const parsed = parser.parse(html);
  if (parsed.price === null || parsed.price <= 0) throw new Error("Price not found in page");
  return parsed;
}

/** Search the store and price the best match. Returns null when nothing matches. */
async function discover(platform: string, p: JobProduct): Promise<Result | { miss: string } | null> {
  const searcher = getSearcher(platform);
  if (!searcher) return null;

  // Bare model first, then brand + model: "Xiaomi Redmi Note 15 Pro" finds
  // nothing on some stores where "Redmi Note 15 Pro" does, and vice versa
  // for names like "Nord CE 4 Lite".
  const model = p.ModelName || p.ItemName;
  let best: SearchHit | null = null;
  let seen = 0;
  for (const [i, query] of searchQueries(model, p.Brand).entries()) {
    if (i > 0) await sleep(DELAY_MS);
    const hits: SearchHit[] = await searcher.search(query);
    seen += hits.length;
    best = pickBestHit(model, p.Brand, hits);
    if (best) break;
  }
  if (!best) return { miss: seen ? `no match in ${seen} results` : "no search results" };

  await sleep(DELAY_MS);
  try {
    const parsed = await scrapePrice(platform, best.url);
    return { ProductID: p.ProductID, PlatformID: 0, ProductURL: best.url, MatchedTitle: best.title, Price: parsed.price!, MRP: parsed.mrp, Discount: parsed.discount };
  } catch (err) {
    // The product page can fail (layout change, block) while the search
    // result already showed a price; that is still a usable reading.
    if (err instanceof BlockedError && best.price === null) throw err;
    if (best.price !== null && best.price > 0) {
      return { ProductID: p.ProductID, PlatformID: 0, ProductURL: best.url, MatchedTitle: best.title, Price: best.price, MRP: best.mrp, Discount: null };
    }
    return { miss: `matched "${best.title}" but no price: ${(err as Error).message}` };
  }
}

/**
 * Variant mode: one search per wording (both merged, since each shows ~20
 * listings and the second often surfaces other colours), plus one per
 * storage that other stores list but these results didn't show. Then
 *   - the model row gets the cheapest listing (its base variant), unless
 *     the dashboard has a manual URL for this store;
 *   - each storage + colour gets its cheapest listing, in-stock first.
 */
async function collectVariants(
  platform: string,
  platformId: number,
  p: JobProduct,
  link: JobLink | undefined
): Promise<{ results: Result[]; variants: number; seen: number }> {
  const searcher = getSearcher(platform)!;
  const model = p.ModelName || p.ItemName;
  const byUrl = new Map<string, SearchHit>();
  const add = (hits: SearchHit[]) => {
    for (const h of hits) if (!byUrl.has(h.url)) byUrl.set(h.url, h);
  };
  const matched = () => matchingHits(model, p.Brand, [...byUrl.values()]);
  for (const [i, query] of searchQueries(model, p.Brand).entries()) {
    if (i > 0) await sleep(DELAY_MS);
    add(await searcher.search(query));
  }

  // ~20 listings per search leave out bigger storages (Amazon and Reliance
  // don't show the 1TB iPhone 17 Pro for "iPhone 17 Pro"), and some stores
  // rank cases first. "iPhone 17 Pro 1TB" finds them.
  const shown = new Set(matched().map((h) => variantKey(parseVariant(h.title, model, p.Brand))));
  const storages = [
    ...new Set(
      (p.variants ?? [])
        .filter((v) => !shown.has(variantKey({ ram: null, storage: v.Storage, color: v.Color })))
        .map((v) => v.Storage)
    ),
  ];
  for (const [i, storage] of storages.slice(0, MAX_STORAGE_SEARCHES).entries()) {
    // A store that shows no listing of the model gets one try, not one per storage.
    if (i === 1 && matched().length === 0) break;
    await sleep(DELAY_MS);
    try {
      add(await searcher.search(`${model} ${storage}`));
    } catch (err) {
      // Keep what the earlier searches found.
      if (err instanceof BlockedError) break;
      throw err;
    }
  }

  const matches = matched().filter((h) => h.price !== null);
  const results: Result[] = [];

  const best = pickBestHit(model, p.Brand, matches);
  if (best && link?.UrlSource !== "manual") {
    results.push({ ProductID: p.ProductID, PlatformID: platformId, ProductURL: best.url, MatchedTitle: best.title, Price: best.price!, MRP: best.mrp, Discount: null });
  }

  const groups = new Map<string, { hit: SearchHit; v: VariantInfo }>();
  const inStock = (h: SearchHit) => h.inStock !== false;
  for (const h of matches) {
    const v = parseVariant(h.title, model, p.Brand);
    const key = variantKey(v);
    if (!key) continue;
    const cur = groups.get(key);
    const better =
      !cur || (inStock(h) && !inStock(cur.hit)) || (inStock(h) === inStock(cur.hit) && h.price! < cur.hit.price!);
    // Keep RAM from whichever listing of this variant states it.
    if (better) groups.set(key, { hit: h, v: { ...v, ram: v.ram ?? cur?.v.ram ?? null } });
    else if (!cur.v.ram && v.ram) cur.v.ram = v.ram;
  }
  for (const { hit, v } of groups.values()) {
    results.push({
      ProductID: p.ProductID, PlatformID: platformId, ProductURL: hit.url, MatchedTitle: hit.title,
      Price: hit.price!, MRP: hit.mrp, Discount: null,
      Variant: { RAM: v.ram, Storage: v.storage!, Color: v.color! },
    });
  }
  return { results, variants: groups.size, seen: byUrl.size };
}

async function scanPlatform(platform: JobPlatform, products: JobProduct[], flush: (r: Result) => Promise<void>): Promise<PlatformStats> {
  const name = platform.PlatformName;
  const stats: PlatformStats = { platform: name, priced: 0, newUrls: 0, misses: 0, failed: 0, blocked: 0, skippedOld: 0, variants: 0, aborted: null };
  const canSearch = getSearcher(name) !== null;
  let consecutiveBlocks = 0;

  for (const p of products) {
    const link = p.links.find((l) => l.PlatformID === platform.PlatformID);
    if (link && !link.IsActive) continue; // switched off in the dashboard

    // Nothing to do without a URL unless this store can be searched.
    if (!link && (!canSearch || recentlyMissed(p, platform.PlatformID))) continue;
    if (!link && tooOld(p)) {
      stats.skippedOld++;
      continue;
    }

    const label = `[${name}] ${p.ItemName}`;
    try {
      let result: Result | { miss: string } | null = null;

      if (VARIANTS && canSearch) {
        const found = await collectVariants(name, platform.PlatformID, p, link);
        consecutiveBlocks = 0;
        if (found.results.length === 0) {
          if (!link) {
            stats.misses++;
            const reason = found.seen ? `no match in ${found.seen} results` : "no search results";
            console.log(`${label}: not found — ${reason}`);
            await flush({ ProductID: p.ProductID, PlatformID: platform.PlatformID, miss: true, reason });
          }
        } else {
          stats.priced++;
          stats.variants += found.variants;
          const prices = found.results.map((r) => ("Price" in r ? r.Price : 0)).filter(Boolean);
          console.log(`${label}: ${found.variants} variant(s), ₹${Math.min(...prices)}–₹${Math.max(...prices)}`);
          for (const r of found.results) await flush(r);
        }
      } else if (link) {
        try {
          const parsed = await scrapePrice(name, link.ProductURL);
          result = { ProductID: p.ProductID, PlatformID: platform.PlatformID, ProductURL: link.ProductURL, Price: parsed.price!, MRP: parsed.mrp, Discount: parsed.discount };
        } catch (err) {
          // Manual URLs are the user's call; only auto ones get re-searched.
          if (err instanceof BlockedError || link.UrlSource === "manual" || !canSearch) throw err;
          console.log(`${label}: saved URL failed (${(err as Error).message}), searching again`);
          await sleep(DELAY_MS);
        }
      }

      if (!result && !(VARIANTS && canSearch)) {
        result = await discover(name, p);
        if (result && "ProductURL" in result) {
          result.PlatformID = platform.PlatformID;
          stats.newUrls++;
        }
      }

      consecutiveBlocks = 0;
      if (result && "miss" in result && typeof result.miss === "string") {
        stats.misses++;
        console.log(`${label}: not found — ${result.miss}`);
        await flush({ ProductID: p.ProductID, PlatformID: platform.PlatformID, miss: true, reason: result.miss.slice(0, 250) });
      } else if (result && "Price" in result) {
        stats.priced++;
        console.log(`${label}: ₹${result.Price}${"MatchedTitle" in result && result.MatchedTitle ? `  ← "${result.MatchedTitle}"` : ""}`);
        await flush(result);
      }
    } catch (err) {
      if (err instanceof BlockedError) {
        stats.blocked++;
        consecutiveBlocks++;
        console.log(`${label}: BLOCKED — ${err.message}`);
        if (consecutiveBlocks >= MAX_CONSECUTIVE_BLOCKS) {
          stats.aborted = `${MAX_CONSECUTIVE_BLOCKS} blocks in a row — ${name} is blocking this IP`;
          console.log(`::warning::${stats.aborted}`);
          break;
        }
      } else {
        stats.failed++;
        console.log(`${label}: FAILED — ${(err as Error).message}`);
      }
    }
    await sleep(DELAY_MS);
  }
  return stats;
}

function writeSummary(all: PlatformStats[]) {
  const rows = all.map(
    (s) => `| ${s.platform} | ${s.priced} | ${s.variants} | ${s.newUrls} | ${s.misses} | ${s.failed} | ${s.blocked} | ${s.skippedOld} | ${s.aborted ?? ""} |`
  );
  const md = [
    `### Price scan${DRY_RUN ? " (dry run)" : ""}`,
    "",
    "| Store | Priced | Variants | New URLs | Not found | Failed | Blocked | Skipped (old) | Note |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---|",
    ...rows,
    "",
  ].join("\n");
  console.log("\n" + md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
}

async function main() {
  if (!API_BASE || !TOKEN) {
    console.error("Set API_BASE and SCRAPE_TOKEN.");
    process.exit(2);
  }

  if (flag("sync")) {
    const sync = await api<Record<string, unknown>>("POST", "/models/sync");
    console.log("Model sync:", JSON.stringify(sync));
  }

  const jobs = await api<Jobs>("GET", "/scrape/jobs");
  const wanted = (option("platform") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const platforms = jobs.platforms.filter(
    (p) =>
      p.IsEnabled &&
      (getParser(p.PlatformName) !== null || getSearcher(p.PlatformName) !== null) &&
      (wanted.length === 0 ||
        wanted.some((w) => p.PlatformName.toLowerCase().includes(w) || p.PlatformCode.toLowerCase() === w))
  );
  if (platforms.length === 0) {
    console.log(`No enabled platform with a scraper matches "${wanted.join(",")}".`);
    return;
  }

  // Newest models first: they matter most and are likeliest to be listed.
  let products = [...jobs.products].sort((a, b) => (b.LaunchDate ?? "").localeCompare(a.LaunchDate ?? ""));
  const onlyIds = new Set((option("products") ?? "").split(",").filter(Boolean).map(Number));
  if (onlyIds.size > 0) products = products.filter((p) => onlyIds.has(p.ProductID));
  if (LIMIT > 0) products = products.slice(0, LIMIT);
  console.log(`${products.length} products × ${platforms.map((p) => p.PlatformName).join(", ")}${DRY_RUN ? " (dry run)" : ""}\n`);

  let buffer: Result[] = [];
  const send = async () => {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    if (DRY_RUN) return;
    const res = await api<{ skipped?: number; errors?: string[] }>("POST", "/scrape/results", { source: SOURCE, results: batch });
    console.log(`  → saved batch: ${JSON.stringify(res)}`);
    // e.g. a store moved domain and every URL fails the API's domain check.
    if (res.errors?.length) {
      console.log(`::warning::API rejected ${res.errors.length} result(s), e.g. ${res.errors.slice(0, 3).join("; ")}`);
    }
  };
  const flush = async (r: Result) => {
    buffer.push(r);
    if (buffer.length >= BATCH_SIZE) await send();
  };

  const all: PlatformStats[] = [];
  for (const platform of platforms) {
    all.push(await scanPlatform(platform, products, flush));
    await send();
  }
  writeSummary(all);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
