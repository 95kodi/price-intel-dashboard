import { BlockedError } from "../http";
import type { SearchHit } from "./types";
import { MAX_HITS, cleanMrp, fetchPage, getJson, toPrice } from "./util";

const ORIGIN = "https://www.thechennaimobiles.com";
const API = "https://api.thechennaimobiles.com/api/search-products";

// Public client token the site's JS sends on every API call. If they rotate
// it the API answers 403 and we re-read it from the site's JS bundles.
let clientKey =
  "0a3a69b5a673415f029f14a0295b48355fcf942b66e980c9aee48e6332c26b08a23dba2ed4712e606d34aeb70cf2f983a2d563f40e066245463b16a8a007aee7";

async function discoverClientKey(): Promise<string | null> {
  const home = await fetchPage(ORIGIN + "/");
  const chunks = [...new Set(home.match(/\/_next\/static\/chunks\/[^"']+\.js/g) ?? [])];
  for (const chunk of chunks) {
    const js = await fetchPage(ORIGIN + chunk).catch(() => "");
    const m = js.match(/["']x-authorization-client["']\]?\s*[:=]\s*["']([0-9a-f]{32,})["']/i);
    if (m) return m[1];
  }
  return null;
}

async function query(q: string): Promise<any> {
  return getJson(`${API}?q=${encodeURIComponent(q)}`, ORIGIN, { "x-authorization-client": clientKey });
}

export async function search(q: string): Promise<SearchHit[]> {
  let data: any;
  try {
    data = await query(q);
  } catch (err) {
    if (!(err instanceof BlockedError)) throw err;
    const key = await discoverClientKey();
    if (!key || key === clientKey) throw err;
    clientKey = key;
    data = await query(q);
  }
  if (data?.error) throw new Error(`Chennai Mobiles search failed: ${data.message ?? data.status}`);

  return (data?.appData ?? [])
    .filter((p: any) => p?.product_name && p?.SEO_title)
    .slice(0, MAX_HITS)
    .map((p: any): SearchHit => {
      const price = toPrice(p.discount_price);
      return {
        title: p.product_name,
        // Some slugs carry spaces or other raw characters; keep the URL valid.
        url: `${ORIGIN}/${encodeURI(String(p.SEO_title).trim())}`,
        price,
        mrp: cleanMrp(toPrice(p.product_price), price),
      };
    });
}
