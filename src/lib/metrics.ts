import type { MergedProduct } from "@/types";

/**
 * Every dashboard number is derived here, once, from the same product list —
 * so a KPI tile, a chart and the table can never disagree about how many
 * products are "above market".
 */

export interface Marketplace {
  key: keyof MergedProduct;
  urlKey: keyof MergedProduct;
  label: string;
}

export const MARKETPLACES: Marketplace[] = [
  { key: "AmazonPrice", urlKey: "AmazonURL", label: "Amazon" },
  { key: "FlipkartPrice", urlKey: "FlipkartURL", label: "Flipkart" },
  { key: "PoorvikaPrice", urlKey: "PoorvikaURL", label: "Poorvika" },
  { key: "CromaPrice", urlKey: "CromaURL", label: "Croma" },
  { key: "RelianceDigitalPrice", urlKey: "RelianceDigitalURL", label: "Reliance Digital" },
  { key: "SangeethaMobilesPrice", urlKey: "SangeethaMobilesURL", label: "Sangeetha" },
  { key: "TheChennaiMobilesPrice", urlKey: "TheChennaiMobilesURL", label: "The Chennai Mobiles" },
  { key: "sathyaPrice", urlKey: "sathyaURL", label: "Sathya" },
];

/** Gap above the cheapest competitor at which a product is worth a manager's time. */
export const ACTION_THRESHOLD = 2000;
const HIGH_PRIORITY_GAP = 5000;

export type Priority = "high" | "medium" | "low";

/**
 * Where our price sits against the market. Distinct from MergedProduct["status"]
 * so the dashboard vocabulary ("above market", "not listed") is stated once.
 */
export type Position = "cheapest" | "matching" | "above" | "unlisted";

export function priceOf(p: MergedProduct, m: Marketplace): number | null {
  const v = p[m.key];
  return typeof v === "number" && v > 0 ? v : null;
}

export function urlOf(p: MergedProduct, m: Marketplace): string | null {
  const v = p[m.urlKey];
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function competitorPrices(p: MergedProduct): number[] {
  return MARKETPLACES.map((m) => priceOf(p, m)).filter((v): v is number => v !== null);
}

export function positionOf(p: MergedProduct): Position {
  if (p.lowestPrice === null || p.CurrentPrice === null) return "unlisted";
  if (p.priceGap === null) return "unlisted";
  if (p.priceGap > 0) return "above";
  if (p.priceGap < 0) return "cheapest";
  return "matching";
}

/**
 * Our price's rank among every seller of this product, ourselves included —
 * "3 of 5" answers "how many sellers undercut us" directly, which a raw gap
 * figure does not.
 */
export function ourRank(p: MergedProduct): { rank: number; of: number } | null {
  if (p.CurrentPrice === null) return null;
  const prices = competitorPrices(p);
  if (prices.length === 0) return null;
  const all = [...prices, p.CurrentPrice].sort((a, b) => a - b);
  return { rank: all.indexOf(p.CurrentPrice) + 1, of: all.length };
}

export function priorityOf(gap: number): Priority {
  if (gap >= HIGH_PRIORITY_GAP) return "high";
  if (gap >= ACTION_THRESHOLD) return "medium";
  return "low";
}

/** Marketplaces this product has no price on — the missing-listing worklist. */
export function missingOn(p: MergedProduct): string[] {
  return MARKETPLACES.filter((m) => priceOf(p, m) === null).map((m) => m.label);
}

export interface PositionBucket {
  position: Position;
  label: string;
  count: number;
  pct: number;
}

export interface CoverageRow {
  label: string;
  count: number;
  pct: number;
}

export interface GapRow {
  product: MergedProduct;
  gap: number;
  priority: Priority;
  cheapestAt: string;
}

export interface CompetitorWin {
  label: string;
  wins: number;
  listed: number;
}

export interface DashboardMetrics {
  total: number;
  /** Products where we undercut every competitor. */
  cheapest: number;
  matching: number;
  above: number;
  unlisted: number;
  cheapestPct: number;
  abovePct: number;
  /** Products absent from at least one marketplace. */
  missingCount: number;
  worstMissing: { label: string; count: number } | null;
  /** Listings actually tracked vs. every product × marketplace slot. */
  coverage: { tracked: number; possible: number; pct: number; rows: CoverageRow[] };
  /** Mean signed gap vs the cheapest competitor. Positive = we are pricier. */
  avgGap: number;
  needsAction: number;
  positionSplit: PositionBucket[];
  competitorWins: CompetitorWin[];
  biggestGaps: GapRow[];
}

const POSITION_LABELS: Record<Position, string> = {
  cheapest: "Cheapest in market",
  matching: "Matching cheapest",
  above: "Above market",
  unlisted: "No competitor price",
};

export function computeMetrics(products: MergedProduct[]): DashboardMetrics {
  const total = products.length;
  const counts: Record<Position, number> = { cheapest: 0, matching: 0, above: 0, unlisted: 0 };

  const missingPerMarketplace = new Map<string, number>();
  const listedPerMarketplace = new Map<string, number>();
  const winsPerMarketplace = new Map<string, number>();
  for (const m of MARKETPLACES) {
    missingPerMarketplace.set(m.label, 0);
    listedPerMarketplace.set(m.label, 0);
    winsPerMarketplace.set(m.label, 0);
  }

  let missingCount = 0;
  let tracked = 0;
  let needsAction = 0;
  const signedGaps: number[] = [];
  const gapRows: GapRow[] = [];

  for (const p of products) {
    counts[positionOf(p)] += 1;

    let missingHere = false;
    for (const m of MARKETPLACES) {
      if (priceOf(p, m) === null) {
        missingPerMarketplace.set(m.label, (missingPerMarketplace.get(m.label) ?? 0) + 1);
        missingHere = true;
      } else {
        listedPerMarketplace.set(m.label, (listedPerMarketplace.get(m.label) ?? 0) + 1);
        tracked += 1;
      }
    }
    if (missingHere) missingCount += 1;

    if (p.lowestPlatform) {
      winsPerMarketplace.set(p.lowestPlatform, (winsPerMarketplace.get(p.lowestPlatform) ?? 0) + 1);
    }

    if (p.priceGap !== null) {
      signedGaps.push(p.priceGap);
      if (p.priceGap > 0) {
        gapRows.push({
          product: p,
          gap: p.priceGap,
          priority: priorityOf(p.priceGap),
          cheapestAt: p.lowestPlatform ?? "—",
        });
        if (p.priceGap > ACTION_THRESHOLD) needsAction += 1;
      }
    }
  }

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const possible = total * MARKETPLACES.length;

  const worstMissing = [...missingPerMarketplace.entries()]
    .map(([label, count]) => ({ label, count }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)[0] ?? null;

  return {
    total,
    cheapest: counts.cheapest,
    matching: counts.matching,
    above: counts.above,
    unlisted: counts.unlisted,
    cheapestPct: pct(counts.cheapest),
    abovePct: pct(counts.above),
    missingCount,
    worstMissing,
    coverage: {
      tracked,
      possible,
      pct: possible > 0 ? Math.round((tracked / possible) * 100) : 0,
      rows: MARKETPLACES.map((m) => {
        const count = listedPerMarketplace.get(m.label) ?? 0;
        return { label: m.label, count, pct: pct(count) };
      }).sort((a, b) => b.count - a.count),
    },
    avgGap:
      signedGaps.length > 0
        ? Math.round(signedGaps.reduce((a, b) => a + b, 0) / signedGaps.length)
        : 0,
    needsAction,
    positionSplit: (["cheapest", "matching", "above", "unlisted"] as Position[]).map((position) => ({
      position,
      label: POSITION_LABELS[position],
      count: counts[position],
      pct: pct(counts[position]),
    })),
    competitorWins: MARKETPLACES.map((m) => ({
      label: m.label,
      wins: winsPerMarketplace.get(m.label) ?? 0,
      listed: listedPerMarketplace.get(m.label) ?? 0,
    })).sort((a, b) => b.wins - a.wins || b.listed - a.listed),
    biggestGaps: gapRows.sort((a, b) => b.gap - a.gap),
  };
}
