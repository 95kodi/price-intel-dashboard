import type { StoreSearcher } from "./types";
import * as flipkart from "./flipkart";
import * as amazon from "./amazon";
import * as poorvika from "./poorvika";
import * as sangeetha from "./sangeetha";
import * as croma from "./croma";
import * as reliance from "./reliance";
import * as chennaimobiles from "./chennaimobiles";
import * as sathya from "./sathya";
import * as vijaysales from "./vijaysales";

export type { SearchHit, StoreSearcher } from "./types";
export { pickBestHit } from "./match";

const searchers: Record<string, StoreSearcher> = {
  flipkart,
  amazon,
  poorvika,
  sangeetha,
  croma,
  reliance,
  chennaimobiles,
  sathya,
  vijaysales,
};

/** Keys of the implemented searchers. */
export const SEARCH_PLATFORMS: string[] = Object.keys(searchers);

// Searchers that escalate to headless Chrome/Edge when plain HTTP is blocked
// (bot protection on datacenter IPs). The host must have a browser installed.
// Not Amazon: it serves headless Chrome its 503 page even on residential IPs.
const BROWSER_FALLBACK = new Set(["flipkart", "croma", "sathya"]);

/** Same platform-name normalisation as scrapers/getParser. */
function searcherKey(platform: string): string | null {
  switch (platform.toLowerCase().trim()) {
    case "flipkart":
      return "flipkart";
    case "amazon":
      return "amazon";
    case "poorvika":
      return "poorvika";
    case "croma":
      return "croma";
    case "sangeetha mobiles":
    case "sangeetha":
      return "sangeetha";
    case "reliance":
    case "reliance digital":
      return "reliance";
    case "vijay sales":
    case "vijaysales":
      return "vijaysales";
    case "the chennai mobiles":
    case "chennai mobiles":
    case "chennaimobiles":
      return "chennaimobiles";
    case "sathya":
      return "sathya";
    default:
      return null;
  }
}

export function getSearcher(platform: string): StoreSearcher | null {
  const key = searcherKey(platform);
  return key ? searchers[key] : null;
}

/**
 * Queries to try in order until pickBestHit finds something. The bare model
 * name goes first: sub-brands are listed without the parent brand ("Redmi
 * Note 15 Pro", not "Xiaomi Redmi …"), and on Poorvika and Croma
 * "Xiaomi Redmi Note 15 Pro 5G" doesn't surface the phone at all.
 * The brand-prefixed form covers model names like "Nord 6".
 */
export function searchQueries(modelName: string, brand: string): string[] {
  const model = modelName.trim().replace(/\s+/g, " ");
  const b = brand.trim();
  if (!b || model.toLowerCase().split(" ").includes(b.toLowerCase())) return [model];
  return [model, `${b} ${model}`];
}

/** True when this store's search may launch a headless browser (blocked plain HTTP). */
export function needsBrowser(platform: string): boolean {
  const key = searcherKey(platform);
  return key !== null && BROWSER_FALLBACK.has(key);
}
