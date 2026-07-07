import axios, { AxiosError } from "axios";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Ch-Ua": '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

// Vercel / AWS Lambda have no system browser; use @sparticuz/chromium there.
const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * Anti-bot escape hatches for hosts whose IPs the marketplaces block:
 *
 * SCRAPER_GATEWAY_URL — a scraping-API endpoint. `{url}` is replaced with the
 *   encoded target (appended if no placeholder). The gateway must return the
 *   rendered page HTML, e.g.
 *   https://api.scraperapi.com/?api_key=KEY&render=true&url={url}
 *
 * SCRAPER_PROXY_URL — a standard proxy (http://user:pass@host:port) used by
 *   the headless browser.
 */
const GATEWAY_TEMPLATE = process.env.SCRAPER_GATEWAY_URL || "";
const PROXY_URL = process.env.SCRAPER_PROXY_URL || "";

export class BlockedError extends Error {
  constructor(marker: string) {
    super(`Blocked by site bot protection (${marker})`);
    this.name = "BlockedError";
  }
}

const BLOCK_MARKERS = [
  "access denied",
  "pardon our interruption",
  "robot check",
  "are you a human",
  "unusual traffic",
  "request blocked",
  "captcha",
  "reference #", // Akamai denial pages
];

/** Returns the matched marker when the HTML is a bot-challenge/denial page. */
export function detectBlockedPage(html: string): string | null {
  // Real product pages are large; challenge pages are tiny.
  if (html.length > 100_000) return null;
  const haystack = html.slice(0, 20_000).toLowerCase();
  return BLOCK_MARKERS.find((m) => haystack.includes(m)) ?? null;
}

export function isBlockedError(err: unknown): boolean {
  return err instanceof AxiosError && (err.response?.status === 403 || err.response?.status === 503);
}

export function hasGateway(): boolean {
  return GATEWAY_TEMPLATE.length > 0;
}

function gatewayUrlFor(target: string): string {
  return GATEWAY_TEMPLATE.includes("{url}")
    ? GATEWAY_TEMPLATE.replace("{url}", encodeURIComponent(target))
    : GATEWAY_TEMPLATE + encodeURIComponent(target);
}

export async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get(url, {
    headers: BROWSER_HEADERS,
    timeout: 15000,
    maxRedirects: 5,
    responseType: "text",
  });
  return response.data;
}

async function fetchHtmlViaGateway(url: string): Promise<string> {
  const response = await axios.get(gatewayUrlFor(url), {
    timeout: 55000, // gateways render pages; give them time
    responseType: "text",
  });
  return response.data;
}

function playwrightProxy() {
  if (!PROXY_URL) return undefined;
  const u = new URL(PROXY_URL);
  return {
    server: `${u.protocol}//${u.host}`,
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
  };
}

async function launchBrowser() {
  const { chromium } = await import("playwright-core");
  const proxy = playwrightProxy();

  if (IS_SERVERLESS) {
    const sparticuz = (await import("@sparticuz/chromium")).default;
    return chromium.launch({
      args: sparticuz.args,
      executablePath: await sparticuz.executablePath(),
      headless: true,
      proxy,
    });
  }

  // Local development: reuse an installed Edge/Chrome.
  const channels = ["msedge", "chrome"] as const;
  let lastError: unknown;
  for (const channel of channels) {
    try {
      return await chromium.launch({ channel, headless: true, proxy });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No local browser available");
}

export async function fetchHtmlWithBrowser(url: string): Promise<string> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({
      userAgent: BROWSER_HEADERS["User-Agent"],
      locale: "en-IN",
      timezoneId: "Asia/Kolkata",
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: {
        "Accept-Language": "en-IN,en;q=0.9",
      },
    });

    // Basic anti-headless hardening; bot checks look for these first.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      Object.defineProperty(navigator, "languages", { get: () => ["en-IN", "en"] });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Client-rendered pages: wait until a rupee price shows up in the DOM.
    await page
      .waitForFunction(() => /₹\s*[\d,]{4,}/.test(document.body?.innerText ?? ""), { timeout: 15000 })
      .catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    return await page.content();
  } finally {
    await browser.close().catch(() => {});
  }
}

function ensureNotBlocked(html: string): string {
  const marker = detectBlockedPage(html);
  if (marker) throw new BlockedError(marker);
  return html;
}

/**
 * Fetch a product page, escalating when the site blocks us:
 * plain HTTP → headless browser → configured gateway.
 * Platforms that need JS rendering skip the plain-HTTP tier.
 */
export async function fetchProductPage(url: string, needsBrowser: boolean): Promise<string> {
  if (!needsBrowser) {
    try {
      return ensureNotBlocked(await fetchHtml(url));
    } catch (err) {
      if (!(isBlockedError(err) || err instanceof BlockedError)) throw err;
      console.log("Plain fetch blocked, escalating...");
    }
  }

  // On serverless a datacenter-launched browser is usually blocked too;
  // when a gateway exists, go straight to it and save the cold start.
  if (!(IS_SERVERLESS && hasGateway())) {
    try {
      return ensureNotBlocked(await fetchHtmlWithBrowser(url));
    } catch (err) {
      if (!(err instanceof BlockedError) || !hasGateway()) throw err;
      console.log("Browser fetch blocked, retrying via gateway...");
    }
  }

  return ensureNotBlocked(await fetchHtmlViaGateway(url));
}
