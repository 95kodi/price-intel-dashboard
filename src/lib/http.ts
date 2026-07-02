import axios from "axios";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get(url, {
    headers: BROWSER_HEADERS,
    timeout: 15000,
    maxRedirects: 5,
    responseType: "text",
  });
  return response.data;
}

export async function fetchHtmlWithBrowser(url: string): Promise<string> {
  const { chromium } = await import("playwright-core");
  const channels = ["msedge", "chrome"] as const;
  let lastError: unknown;

  for (const channel of channels) {
    let browser;

    try {
      browser = await chromium.launch({ channel, headless: true });
      const page = await browser.newPage({
        userAgent: BROWSER_HEADERS["User-Agent"],
        locale: "en-IN",
      });

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      return await page.content();
    } catch (err) {
      lastError = err;
    } finally {
      await browser?.close().catch(() => {});
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Browser fetch failed");
}
