import type { SearchHit } from "./types";
import { MAX_HITS, cleanMrp, postJson, slugify, toPrice } from "./util";

// sangeethamobiles.com now redirects here.
const ORIGIN = "https://www.sangeetha.com";
const API = `${ORIGIN}/b/customer/api/search/products/view`;

export async function search(query: string): Promise<SearchHit[]> {
  // Mirrors the site's /search-result page request; no auth needed for search.
  const body = {
    type: "desktop",
    offset: "0",
    limit: String(MAX_HITS),
    user_id: "",
    product_id: [],
    group_id: [],
    category_id: [],
    family_id: [],
    keyword: query,
    pinCode: "600001",
    selected_attributes: "",
    // The default ("") ordering buries exact matches; "relevance" doesn't.
    sort_by: "relevance",
  };
  const data = await postJson(API, body, ORIGIN);
  if (data?.http_code !== 200) throw new Error(`Sangeetha search failed: ${data?.message ?? "bad response"}`);

  return (data.data?.products ?? [])
    .filter((p: any) => p?.item_fullname && p?.product_id)
    .slice(0, MAX_HITS)
    .map((p: any): SearchHit => {
      const price = toPrice(p.sale_price);
      // Their "mrp" is sometimes below sale_price; mop (list price) is the fallback.
      const mrp = Math.max(toPrice(p.mrp) ?? 0, toPrice(p.mop) ?? 0) || null;
      return {
        title: p.item_fullname,
        // Same URL scheme the site builds: /product-details/<name>-<item code>/<id>
        url: `${ORIGIN}/product-details/${slugify(p.item_fullname)}-${slugify(p.item_code ?? "")}/${p.product_id}`,
        price,
        mrp: cleanMrp(mrp, price),
      };
    });
}
