import type { SearchHit } from "./types";
import { MAX_HITS, cleanMrp, postJson, toPrice } from "./util";

const ORIGIN = "https://www.poorvika.com";
// Poorvika's own search page queries this public Typesense proxy (no key).
const API = "https://proxy.poorvika.com/typesense";

export async function search(query: string): Promise<SearchHit[]> {
  // Same parameters the site's search page sends, so ranking matches the site.
  const body = {
    searches: [
      {
        collection: "productsnew",
        q: query,
        query_by: "name,categories,item_code,sku,ram",
        query_by_weights: "4,3,2,1,1",
        sort_by: "_text_match:desc",
        num_typos: 1,
        page: 1,
        per_page: MAX_HITS,
        filter_by: "sellable:=1 && variant_status:=1 && special_price:=[1..1000000]",
      },
    ],
  };
  const data = await postJson(API, body, ORIGIN);
  const result = data?.results?.[0];
  if (!result || result.error) throw new Error(`Poorvika search failed: ${result?.error ?? "no results block"}`);

  return (result.hits ?? [])
    .map((h: any) => h.document)
    .filter((d: any) => d?.name && d?.slug)
    .map((d: any): SearchHit => {
      const price = toPrice(d.special_price);
      return {
        title: d.name,
        url: `${ORIGIN}/${d.slug}/p`,
        price,
        // `price` is the list price; `special_price` is what the site charges.
        mrp: cleanMrp(toPrice(d.price), price),
        inStock: d.stock_status ? d.stock_status === "In Stock" : undefined,
      };
    });
}
