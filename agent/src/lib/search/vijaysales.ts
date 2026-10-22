import type { SearchHit } from "./types";
import { MAX_HITS, cleanMrp, getJson, toPrice } from "./util";

const ORIGIN = "https://www.vijaysales.com";

// Vijay Sales' Unbxd proxy. The site really does pack page/rows inside the
// encoded `q` value; the proxy expects that.
function apiUrl(query: string): string {
  return (
    "https://mdm.vijaysales.com/web/api/search/unbxd-search/v1" +
    `?q=${encodeURIComponent(`${query}&page=1&rows=${MAX_HITS}`)}&fq=`
  );
}

export async function search(query: string): Promise<SearchHit[]> {
  const data = await getJson(apiUrl(query), ORIGIN);
  if (!data?.response) throw new Error("Vijay Sales search: unexpected response");

  return (data.response.products ?? [])
    .filter((p: any) => p?.title && p?.productUrl)
    .slice(0, MAX_HITS)
    .map((p: any): SearchHit => {
      // `price` is the current selling (offer) price; `vsp` can be the pre-offer price.
      const price = toPrice(p.price) ?? toPrice(p.offerPrice) ?? toPrice(p.vsp);
      const status: string | undefined = p.cityId_1_status_unx_ts;
      return {
        title: p.title,
        url: new URL(p.productUrl, ORIGIN).toString(),
        price,
        mrp: cleanMrp(toPrice(p.mrp), price),
        inStock: status === "Available" ? true : status && /out of stock/i.test(status) ? false : undefined,
      };
    });
}
