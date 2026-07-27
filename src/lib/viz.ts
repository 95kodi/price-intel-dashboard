import type { Position, Priority } from "./metrics";
import type { ListingStatus } from "./product-detail";

/**
 * Chart mark colours, validated with the dataviz palette validator against the
 * white card surface. Do not swap these by eye — re-run the validator.
 *
 *   Categorical pair (dumbbell): #4f46e5 + #eb6834
 *     ALL PASS — CVD ΔE 31.4 (protan) / 34.6 (tritan), normal ΔE 39.2.
 *
 *   Status pair (cheapest vs above): #10b981 + #ef4444
 *     PASS — CVD ΔE 8.1 (deutan), clearing the ≥8 target. The earlier
 *     #059669/#e11d48 pair measured 5.8 and was rejected.
 *     #10b981 sits at 2.54:1 on white, so the contrast WARN applies: every
 *     status mark ships an icon + text label and never carries meaning by
 *     colour alone.
 */
export const SERIES_OURS = "#4f46e5";
export const SERIES_MARKET = "#eb6834";

export const STATUS_MARK: Record<Position, string> = {
  cheapest: "#10b981",
  matching: "#94a3b8",
  above: "#ef4444",
  unlisted: "#e2e8f0",
};

/** Recessive chrome: hairline, solid, one step off the surface. */
export const GRID_STROKE = "#f1f5f9";
export const AXIS_TICK = { fontSize: 11, fill: "#6b7280" } as const;

export const POSITION_COPY: Record<Position, { label: string; short: string; glyph: string }> = {
  cheapest: { label: "Cheapest in market", short: "Cheapest", glyph: "▼" },
  matching: { label: "Matching cheapest", short: "Match", glyph: "=" },
  above: { label: "Above market", short: "Higher", glyph: "▲" },
  unlisted: { label: "No competitor price", short: "No data", glyph: "–" },
};

/** Tailwind classes for pills. Text uses darker steps so it clears contrast. */
export const POSITION_PILL: Record<Position, string> = {
  cheapest: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  matching: "bg-slate-50 text-slate-600 ring-slate-200",
  above: "bg-red-50 text-red-700 ring-red-200",
  unlisted: "bg-gray-50 text-gray-500 ring-gray-200",
};

/**
 * Badge vocabulary for product cards. Stated in market terms ("above market")
 * rather than competitor terms ("cheaper on Flipkart") — the card is about our
 * price, and the competitor is only the evidence.
 */
export const POSITION_BADGE: Record<Position, string> = {
  cheapest: "Cheapest",
  matching: "Competitive",
  above: "Above market",
  unlisted: "Missing",
};

/** Paired with the badge text, never carrying the meaning on its own. */
export const POSITION_DOT: Record<Position, string> = {
  cheapest: "bg-emerald-500",
  matching: "bg-amber-500",
  above: "bg-red-500",
  unlisted: "bg-gray-400",
};

/**
 * One marketplace listing, described from our seat: "below us" and "above us"
 * are statements about our price, not theirs. Green marks the market benchmark
 * (the cheapest listing) — the gap column carries the good/bad reading.
 */
export const LISTING_COPY: Record<ListingStatus, string> = {
  cheapest: "Cheapest",
  below: "Below us",
  above: "Above us",
  missing: "Not listed",
};

export const LISTING_PILL: Record<ListingStatus, string> = {
  cheapest: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  below: "bg-amber-50 text-amber-700 ring-amber-200",
  above: "bg-slate-50 text-slate-600 ring-slate-200",
  missing: "bg-gray-50 text-gray-500 ring-gray-200",
};

export const LISTING_DOT: Record<ListingStatus, string> = {
  cheapest: "bg-emerald-500",
  below: "bg-amber-500",
  above: "bg-slate-400",
  missing: "bg-gray-300",
};

export const PRIORITY_COPY: Record<Priority, string> = {
  high: "High priority",
  medium: "Medium",
  low: "Low",
};

export const PRIORITY_PILL: Record<Priority, string> = {
  high: "bg-red-50 text-red-700 ring-red-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-slate-50 text-slate-600 ring-slate-200",
};

export const rupees = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
export const rupeesShort = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (a >= 1000) return `₹${Math.round(v / 1000)}k`;
  return `₹${Math.round(v)}`;
};
export const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
