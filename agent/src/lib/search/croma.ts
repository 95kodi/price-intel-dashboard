import type { SearchHit } from "./types";
import { MAX_HITS, cleanMrp, getJsonWithBrowserFallback, toPrice } from "./util";

const ORIGIN = "https://www.croma.com";

// The JSON API behind croma.com/searchB. channelCode is a pincode the site
// defaults to (Mumbai); listed prices are national.
function apiUrl(query: string): string {
  return (
    "https://api.croma.com/searchservices/v1/search?currentPage=0" +
    `&query=${encodeURIComponent(`${query}:relevance`)}` +
    "&fields=FULL&channel=WEB&channelCode=400049&spellOpt=DEFAULT"
  );
}

export async function search(query: string): Promise<SearchHit[]> {
  // Akamai-protected: plain HTTP works with browser-like headers from a
  // residential IP; otherwise the browser opens the API URL directly.
  const data = await getJsonWithBrowserFallback(apiUrl(query), ORIGIN);
  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  for (const p of data?.products ?? []) {
    if (!p?.name || !p?.url) continue;
    const url = new URL(p.url, ORIGIN).toString();
    if (seen.has(url)) continue;
    seen.add(url);
    const price = toPrice(p.price?.value);
    hits.push({ title: p.name, url, price, mrp: cleanMrp(toPrice(p.mrp?.value), price) });
  }
  return hits.slice(0, MAX_HITS);
}
