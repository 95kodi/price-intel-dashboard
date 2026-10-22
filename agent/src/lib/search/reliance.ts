import type { SearchHit } from "./types";
import { MAX_HITS, cleanMrp, extractJsonAfter, getHtml, toPrice } from "./util";

const ORIGIN = "https://www.reliancedigital.in";

export function parse(html: string): SearchHit[] {
  // The Fynd storefront server-renders the listing into __INITIAL_STATE__.
  // (The script deletes itself after boot, so a browser-rendered DOM won't have it.)
  const state = extractJsonAfter(html, "window.__INITIAL_STATE__");
  if (!state) throw new Error("Reliance Digital: search page has no __INITIAL_STATE__");

  return (state.productListingPage?.productlists?.items ?? [])
    .filter((it: any) => it?.name && it?.slug)
    .slice(0, MAX_HITS)
    .map((it: any): SearchHit => {
      const price = toPrice(it.price?.effective?.min);
      return {
        title: it.name,
        url: `${ORIGIN}/product/${it.slug}`,
        price,
        mrp: cleanMrp(toPrice(it.price?.marked?.min), price),
        inStock: typeof it.sellable === "boolean" ? it.sellable : undefined,
      };
    });
}

export async function search(query: string): Promise<SearchHit[]> {
  return parse(await getHtml(`${ORIGIN}/products?q=${encodeURIComponent(query)}`));
}
