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

export function isBlockedError(err: unknown): boolean {
  return err instanceof AxiosError && (err.response?.status === 403 || err.response?.status === 503);
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

async function launchBrowser() {
  const { chromium } = await import("playwright-core");

  if (IS_SERVERLESS) {
    const sparticuz = (await import("@sparticuz/chromium")).default;
    return chromium.launch({
      args: sparticuz.args,
      executablePath: await sparticuz.executablePath(),
      headless: true,
    });
  }

  // Local development: reuse an installed Edge/Chrome.
  const channels = ["msedge", "chrome"] as const;
  let lastError: unknown;
  for (const channel of channels) {
    try {
      return await chromium.launch({ channel, headless: true });
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
