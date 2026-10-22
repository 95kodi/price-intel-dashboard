import type { SearchHit } from "./types";
import { MAX_HITS, cleanMrp, cleanText, extractJsonAfter, getHtml, toPrice } from "./util";

const BASE = "https://www.flipkart.com";

// sid=tyy,4io scopes the search to Mobiles; an unscoped search for a model
// name returns mostly cases and spare parts.
function searchUrl(query: string): string {
  return `${BASE}/search?q=${encodeURIComponent(query)}&sid=tyy%2C4io`;
}

/** Keep only `pid` — it selects the variant; lid/marketplace/q are tracking. */
function canonicalUrl(baseUrl: string): string {
  const u = new URL(baseUrl, BASE);
  const pid = u.searchParams.get("pid");
  return `${BASE}${u.pathname}${pid ? `?pid=${pid}` : ""}`;
}

/**
 * Browser-rendered page: the state script is gone after hydration, so read
 * the product cards. Each card is one <a href=".../p/itm…"> whose text runs
 * "Add to Compare | <title> | ratings | specs… | ₹price | ₹mrp | x% off".
 */
function parseRendered(html: string): SearchHit[] {
  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*href="(\/[^"]*\/p\/itm[^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const parts = m[2]
      .split(/<[^>]+>/)
      .map((s) => cleanText(s))
      .filter(Boolean);
    if (parts.includes("Sponsored")) continue;
    const unavailable = parts.some((s) => /^(currently unavailable|out of stock|sold out|coming soon)$/i.test(s));
    const title = parts.find((s) => /[a-z]/i.test(s) && !CARD_LABELS.test(s));
    const url = canonicalUrl(cleanText(m[1]));
    if (!title || seen.has(url)) continue;
    const at = parts.findIndex((s) => /^₹[\d,]+$/.test(s));
    if (at < 0) continue; // image-only anchor; the text anchor follows
    seen.add(url);
    const price = toPrice(parts[at]);
    // Only an adjacent second ₹ is the MRP; later ones are exchange offers.
    const mrp = /^₹[\d,]+$/.test(parts[at + 1] ?? "") ? toPrice(parts[at + 1]) : null;
    hits.push({ title, url, price, mrp: cleanMrp(mrp, price), inStock: unavailable ? false : undefined });
  }
  return hits.slice(0, MAX_HITS);
}

/** Badges that precede the title inside a rendered card. */
const CARD_LABELS = /^(add to compare|currently unavailable|out of stock|sold out|coming soon|bestseller|new launch|only \d+ left)$/i;

export function parse(html: string): SearchHit[] {
  // The SSR page embeds the same product cards it renders.
  const state = extractJsonAfter(html, "window.__INITIAL_STATE__");
  if (!state) {
    const rendered = parseRendered(html);
    if (rendered.length > 0 || /did not match any products|no results found/i.test(html)) return rendered;
    throw new Error("Flipkart: search page has no __INITIAL_STATE__ or product cards");
  }

  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  const slots: Record<string, any[]> = state?.pageDataV4?.page?.data ?? {};
  // Slot keys are numeric strings, so Object.keys keeps page order.
  for (const key of Object.keys(slots)) {
    for (const slot of slots[key] ?? []) {
      for (const p of slot?.widget?.data?.products ?? []) {
        if (p?.adInfo) continue; // sponsored card
        const v = p?.productInfo?.value;
        const title: string | undefined = v?.titles?.title;
        if (!title || !v.baseUrl) continue;

        const url = canonicalUrl(v.baseUrl);
        if (seen.has(url)) continue;
        seen.add(url);

        const prices: { strikeOff: boolean; value: number }[] = v.pricing?.prices ?? [];
        const price = toPrice(prices.find((x) => !x.strikeOff)?.value);
        const mrp = toPrice(prices.find((x) => x.strikeOff)?.value);
        const stock = v.availability?.displayState;
        hits.push({
          title,
          url,
          price,
          mrp: cleanMrp(mrp, price),
          inStock: stock ? stock === "IN_STOCK" : undefined,
        });
      }
    }
  }
  return hits.slice(0, MAX_HITS);
}

export async function search(query: string): Promise<SearchHit[]> {
  return parse(await getHtml(searchUrl(query), true));
}
