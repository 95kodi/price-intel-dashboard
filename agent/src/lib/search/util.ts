import axios, { AxiosError } from "axios";
import { BlockedError, detectBlockedPage, fetchHtmlWithBrowser } from "../http";

export const MAX_HITS = 20;

const COMMON_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  // axios' default "gzip, compress, deflate, br" is not what browsers send;
  // Amazon answers it with its 503 bot page.
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Ch-Ua": '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
};

const PAGE_HEADERS: Record<string, string> = {
  ...COMMON_HEADERS,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

// Akamai (Croma) rejects API calls that lack the client-hint and
// fetch-metadata headers a real browser sends with an XHR.
function apiHeaders(origin: string, extra?: Record<string, string>): Record<string, string> {
  return {
    ...COMMON_HEADERS,
    Accept: "application/json, text/plain, */*",
    Origin: origin,
    Referer: origin + "/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    ...extra,
  };
}

/** Skip plain HTTP for stores that have a browser path (to test that path from a residential IP). */
const FORCE_BROWSER = !!process.env.SEARCH_FORCE_BROWSER;

/** Normalise the ways sites say "go away" into BlockedError so callers check one type. */
export function asBlocked(err: unknown): unknown {
  if (err instanceof BlockedError) return err;
  const status = err instanceof AxiosError ? err.response?.status : undefined;
  // 529 is Flipkart's "site overloaded" bot response.
  if (status === 403 || status === 429 || status === 503 || status === 529) {
    return new BlockedError(`HTTP ${status}`);
  }
  return err;
}

function ensureNotBlocked(html: string): string {
  const marker = detectBlockedPage(html);
  if (marker) throw new BlockedError(marker);
  return html;
}

/** Like http.fetchHtml, but with headers Amazon accepts (see COMMON_HEADERS). */
export async function fetchPage(url: string): Promise<string> {
  const res = await axios.get(url, { headers: PAGE_HEADERS, timeout: 15000, maxRedirects: 5, responseType: "text" });
  return res.data;
}

/** GET an HTML page; if plain HTTP is blocked and `browserFallback`, retry in headless Chrome/Edge. */
export async function getHtml(url: string, browserFallback = false): Promise<string> {
  if (!(FORCE_BROWSER && browserFallback)) {
    try {
      return ensureNotBlocked(await fetchPage(url));
    } catch (err) {
      const e = asBlocked(err);
      if (!(e instanceof BlockedError) || !browserFallback) throw e;
    }
  }
  return ensureNotBlocked(await fetchHtmlWithBrowser(url));
}

function parseJsonBody<T>(data: unknown): T {
  if (typeof data !== "string") return data as T;
  // A 200 with an HTML challenge page instead of JSON.
  ensureNotBlocked(data);
  try {
    return JSON.parse(data) as T;
  } catch {
    throw new Error(`Expected JSON, got: ${data.slice(0, 80).replace(/\s+/g, " ")}`);
  }
}

export async function getJson<T = any>(url: string, origin: string, headers?: Record<string, string>): Promise<T> {
  try {
    const res = await axios.get(url, { headers: apiHeaders(origin, headers), timeout: 15000 });
    return parseJsonBody<T>(res.data);
  } catch (err) {
    throw asBlocked(err);
  }
}

export async function postJson<T = any>(
  url: string,
  body: unknown,
  origin: string,
  headers?: Record<string, string>
): Promise<T> {
  try {
    const res = await axios.post(url, body, {
      headers: apiHeaders(origin, { "Content-Type": "application/json", ...headers }),
      timeout: 15000,
    });
    return parseJsonBody<T>(res.data);
  } catch (err) {
    throw asBlocked(err);
  }
}

/**
 * GET a JSON API; if blocked, open the same URL in the browser (Chrome
 * renders JSON inside a <pre>) — a real TLS/JS fingerprint gets past Akamai.
 */
export async function getJsonWithBrowserFallback<T = any>(url: string, origin: string): Promise<T> {
  if (!FORCE_BROWSER) {
    try {
      return await getJson<T>(url, origin);
    } catch (err) {
      if (!(err instanceof BlockedError)) throw err;
    }
  }
  const html = ensureNotBlocked(await fetchHtmlWithBrowser(url));
  const pre = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  return parseJsonBody<T>(decodeEntities(pre ? pre[1] : html));
}

/**
 * Parse the JSON object literal that follows `marker` in a page
 * (e.g. `window.__INITIAL_STATE__ = {...};`). Brace-matches instead of
 * regexing because the object is followed by arbitrary script.
 */
export function extractJsonAfter(html: string, marker: string): any | null {
  const at = html.indexOf(marker);
  if (at < 0) return null;
  const start = html.indexOf("{", at + marker.length);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED_ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function cleanText(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** "₹1,39,999.00" / 139999 / "139999.00" → 139999; junk or <= 0 → null. */
export function toPrice(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Stores sometimes report an "MRP" below the selling price; that's not an MRP. */
export function cleanMrp(mrp: number | null, price: number | null): number | null {
  if (mrp === null) return null;
  return price === null || mrp >= price ? mrp : null;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
