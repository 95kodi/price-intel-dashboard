import { BlockedError } from "../http";
import type { SearchHit } from "./types";
import { MAX_HITS, cleanMrp, cleanText, decodeEntities, getHtml, toPrice } from "./util";

const BASE = "https://www.amazon.in";

// n:1389432031 = "Smartphones & Basic Mobiles"; keeps cases off page one.
function searchUrl(query: string): string {
  return `${BASE}/s?k=${encodeURIComponent(query).replace(/%20/g, "+")}&rh=n%3A1389432031`;
}

export function parse(html: string): SearchHit[] {
  const starts = [...html.matchAll(/<div\b[^>]*data-component-type="s-search-result"[^>]*>/g)];
  const hits: SearchHit[] = [];
  const seen = new Set<string>();

  starts.forEach((m, i) => {
    const tag = m[0];
    const asin = tag.match(/data-asin="([A-Z0-9]{10})"/)?.[1];
    if (!asin || seen.has(asin)) return;
    const block = html.slice(m.index!, starts[i + 1]?.index ?? m.index! + 40_000);
    // Sponsored cards repeat organic ones or are unrelated upsells.
    if (/\bAdHolder\b/.test(tag) || block.includes("puis-sponsored-label")) return;

    // Newer layout: brand in its own <h2>, product title in <h2 aria-label>.
    const h2s = [...block.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/g)];
    const labelled = h2s.find((h) => /aria-label="/.test(h[1]));
    let title = labelled
      ? decodeEntities(labelled[1].match(/aria-label="([^"]*)"/)![1])
      : cleanText(h2s.sort((a, b) => b[2].length - a[2].length)[0]?.[2] ?? "");
    if (!title) return;
    const brand = labelled ? cleanText(h2s.find((h) => h !== labelled)?.[2] ?? "") : "";
    if (brand && brand.length < 30 && !title.toLowerCase().startsWith(brand.toLowerCase())) {
      title = `${brand} ${title}`;
    }

    const price = toPrice(block.match(/<span class="a-price"[^>]*>\s*<span class="a-offscreen">([^<]*)/)?.[1]);
    const mrp = toPrice(
      block.match(/<span class="a-price a-text-price"[^>]*data-a-strike="true"[^>]*>\s*<span class="a-offscreen">([^<]*)/)?.[1]
    );
    seen.add(asin);
    hits.push({ title, url: `${BASE}/dp/${asin}`, price, mrp: cleanMrp(mrp, price) });
  });

  return hits.slice(0, MAX_HITS);
}

export async function search(query: string): Promise<SearchHit[]> {
  const html = await getHtml(searchUrl(query));
  // When Amazon throttles, it serves a normal-looking page with no result cards.
  // A genuinely empty search says "No results for"; anything else is a block
  // and must not be recorded as "store doesn't carry it".
  if (!html.includes('data-component-type="s-search-result"') && !/No results for/i.test(html)) {
    throw new BlockedError("search page without results (throttled)");
  }
  return parse(html);
}
