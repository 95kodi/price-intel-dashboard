import type { SearchHit } from "./types";
import { MAX_HITS, cleanMrp, decodeEntities, getHtml, toPrice } from "./util";

// Sathya's online store is sathya.store (sathya.in is an older, much smaller
// catalogue that misses most current phones).
const ORIGIN = "https://www.sathya.store";

export function parse(html: string): SearchHit[] {
  // Server-rendered grid: one <div class="product-box"> per product.
  const cards = html.split(/<div class="product-box">/).slice(1);
  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  for (const card of cards) {
    const detail = card.slice(card.indexOf('class="product-detail"'));
    const href = detail.match(/<a\s+href="([^"]+)"/)?.[1];
    const title = detail.match(/<h6\s+title="([^"]*)"/)?.[1];
    if (!href || !title) continue;
    const url = new URL(decodeEntities(href), ORIGIN).toString();
    if (seen.has(url)) continue;
    seen.add(url);
    const price = toPrice(detail.match(/<h4>\s*₹\s*([\d,]+)/)?.[1]);
    const mrp = toPrice(detail.match(/MRP:\s*₹\s*([\d,]+)/)?.[1]);
    hits.push({
      title: decodeEntities(title).replace(/\s+/g, " ").trim(),
      url,
      price,
      mrp: cleanMrp(mrp, price),
    });
  }
  return hits.slice(0, MAX_HITS);
}

export async function search(query: string): Promise<SearchHit[]> {
  // Cloudflare rejects Node's TLS fingerprint (403) but lets a real browser through.
  return parse(await getHtml(`${ORIGIN}/search?q=${encodeURIComponent(query)}`, true));
}
