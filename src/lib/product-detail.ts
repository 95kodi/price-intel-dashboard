import { MARKETPLACES, positionOf, priceOf, urlOf, type Position } from "./metrics";
import type { MergedProduct } from "@/types";

/**
 * Everything the product page shows is derived here, once, from the same
 * marketplace rows — so the KPI strip, the table, the cards, the insights panel
 * and the recommendations can never disagree about who is cheapest.
 */

export type ListingStatus = "cheapest" | "below" | "above" | "missing";

export interface MarketRow {
  label: string;
  price: number | null;
  url: string | null;
  /** Their price − our price. Negative = they undercut us. */
  gap: number | null;
  status: ListingStatus;
  /** Present once the marketplace exists in the platform master. */
  platformId: number | null;
  /** Present once a URL has been mapped, which is what makes it editable. */
  productPlatformId: number | null;
}

export interface ProductInsights {
  ourPrice: number | null;
  position: Position;
  rows: MarketRow[];
  listed: MarketRow[];
  missing: MarketRow[];
  lowest: MarketRow | null;
  highest: MarketRow | null;
  avg: number | null;
  median: number | null;
  /** Highest − lowest across competitors carrying a price. */
  spread: number | null;
  /** Our standing among every seller, ourselves included. */
  rank: { rank: number; of: number } | null;
  /** Our price − cheapest competitor. Positive = we are pricier. */
  gapToCheapest: number | null;
  /** Price that would put us inside the three cheapest sellers, if we aren't. */
  topThreeTarget: number | null;
}

/** Platform names differ by source ("Sangeetha" vs "Sangeetha Mobiles"). */
function nameKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

export interface PlatformRef {
  platformId: number;
  name: string;
}

export interface MappedUrlRef {
  productPlatformId: number;
  platformId: number;
  name: string;
  url: string;
}

function matchByName<T extends { name: string }>(refs: T[], label: string): T | undefined {
  const key = nameKey(label);
  return refs.find((r) => {
    const rk = nameKey(r.name);
    return rk === key || rk.startsWith(key) || key.startsWith(rk);
  });
}

export function buildInsights(
  product: MergedProduct | null,
  platforms: PlatformRef[],
  mapped: MappedUrlRef[]
): ProductInsights {
  const ourPrice = product?.CurrentPrice ?? null;

  const rows: MarketRow[] = MARKETPLACES.map((m) => {
    const price = product ? priceOf(product, m) : null;
    const platform = matchByName(platforms, m.label);
    const mapping = matchByName(mapped, m.label);
    return {
      label: m.label,
      price,
      url: (product ? urlOf(product, m) : null) ?? mapping?.url ?? null,
      gap: price !== null && ourPrice !== null ? price - ourPrice : null,
      status: "missing" as ListingStatus,
      platformId: platform?.platformId ?? mapping?.platformId ?? null,
      productPlatformId: mapping?.productPlatformId ?? null,
    };
  });

  const listed = rows.filter((r) => r.price !== null);
  const prices = listed.map((r) => r.price as number).sort((a, b) => a - b);
  const min = prices[0] ?? null;
  const max = prices[prices.length - 1] ?? null;

  for (const r of rows) {
    if (r.price === null) r.status = "missing";
    else if (r.price === min) r.status = "cheapest";
    else if (ourPrice !== null && r.price < ourPrice) r.status = "below";
    else r.status = "above";
  }

  // Cheapest first, unlisted marketplaces last — the worklist order.
  const sorted = [...rows].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

  const avg =
    prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
  const median =
    prices.length > 0
      ? prices.length % 2 === 1
        ? prices[(prices.length - 1) / 2]
        : Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
      : null;

  let rank: ProductInsights["rank"] = null;
  let topThreeTarget: number | null = null;
  if (ourPrice !== null && prices.length > 0) {
    const all = [...prices, ourPrice].sort((a, b) => a - b);
    rank = { rank: all.indexOf(ourPrice) + 1, of: all.length };
    // Undercutting the third-cheapest competitor is what lands us in the top 3.
    if (rank.rank > 3 && prices.length >= 3) topThreeTarget = prices[2];
  }

  return {
    ourPrice,
    position: product ? positionOf(product) : "unlisted",
    rows: sorted,
    listed: sorted.filter((r) => r.price !== null),
    missing: sorted.filter((r) => r.price === null),
    lowest: sorted.find((r) => r.price === min && min !== null) ?? null,
    highest: max !== null ? [...sorted].reverse().find((r) => r.price === max) ?? null : null,
    avg,
    median,
    spread: min !== null && max !== null ? max - min : null,
    rank,
    gapToCheapest: ourPrice !== null && min !== null ? ourPrice - min : null,
    topThreeTarget,
  };
}

export type ActionTone = "act" | "watch" | "opportunity" | "good";

export interface PricingAction {
  tone: ActionTone;
  title: string;
  body: string;
}

/**
 * Rule-based, not predictive: every line here restates a number already on the
 * page. Nothing forecasts, because the API exposes no price history to forecast
 * from — a made-up trend is a business risk on a page people act from.
 */
export function pricingActions(i: ProductInsights): PricingAction[] {
  const out: PricingAction[] = [];
  const money = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

  if (i.listed.length === 0) {
    out.push({
      tone: "watch",
      title: "No competitor prices yet",
      body: "Add marketplace URLs so the next scan can collect prices for this product.",
    });
    return out;
  }

  if (i.gapToCheapest !== null && i.gapToCheapest > 0 && i.lowest) {
    out.push({
      tone: "act",
      title: `Cut ${money(i.gapToCheapest)} to match ${i.lowest.label}`,
      body: `We are ${money(i.gapToCheapest)} above the cheapest listing. Pricing at ${money(
        i.lowest.price as number
      )} would make us the cheapest seller tracked.`,
    });
  }

  if (i.topThreeTarget !== null && i.rank) {
    out.push({
      tone: "act",
      title: `Price under ${money(i.topThreeTarget)} to reach the top 3`,
      body: `We rank #${i.rank.rank} of ${i.rank.of} sellers. Undercutting the third-cheapest listing moves us into the top three.`,
    });
  }

  if (i.gapToCheapest !== null && i.gapToCheapest < 0 && i.lowest) {
    const headroom = Math.abs(i.gapToCheapest);
    out.push({
      tone: "opportunity",
      title: `${money(headroom)} of headroom above our price`,
      body: `We already undercut every tracked seller. Raising up to ${money(
        i.lowest.price as number
      )} would keep us at or below the cheapest competitor.`,
    });
  }

  if (i.ourPrice !== null && i.avg !== null && i.ourPrice > i.avg * 1.25) {
    const pct = Math.round(((i.ourPrice - i.avg) / i.avg) * 100);
    out.push({
      tone: "watch",
      title: `Priced ${pct}% above the market average`,
      body: `The average tracked price is ${money(i.avg)}; ours is ${money(
        i.ourPrice
      )}. Confirm the listing is the same variant before repricing.`,
    });
  }

  if (i.missing.length > 0) {
    out.push({
      tone: "opportunity",
      title: `Not tracked on ${i.missing.length} marketplace${i.missing.length === 1 ? "" : "s"}`,
      body: `No price is being collected from ${i.missing
        .map((r) => r.label)
        .join(", ")}. Add their product URLs to close the blind spot.`,
    });
  }

  if (i.listed.length === 1) {
    out.push({
      tone: "watch",
      title: "Only one competitor price to compare against",
      body: "Market rank and averages rest on a single listing. Treat them as indicative until more marketplaces are mapped.",
    });
  }

  if (out.length === 0) {
    out.push({
      tone: "good",
      title: "No pricing action needed",
      body: "We are level with the cheapest tracked seller and listed everywhere we track.",
    });
  }

  return out;
}
