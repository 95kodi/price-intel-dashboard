"use client";
import {
  Lightbulb,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  LineChart,
  PackageX,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AwaitingData } from "@/components/charts/ChartCard";
import { MarketplaceMark } from "./MarketplaceBreakdown";
import { pricingActions, type ActionTone, type ProductInsights } from "@/lib/product-detail";
import { rupees } from "@/lib/viz";

function Panel({
  title,
  question,
  children,
  className,
}: {
  title: string;
  question: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={`bg-card border border-line rounded-2xl p-6 shadow-card ${className ?? ""}`}
    >
      <header className="mb-5">
        <h2 className="text-sm font-semibold text-ink tracking-tight">{title}</h2>
        <p className="text-xs text-ink-muted mt-0.5">{question}</p>
      </header>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  tone?: "good" | "bad";
}) {
  const color = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-600" : "text-ink";
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-line last:border-0">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-right min-w-0">
        <span className={`text-sm font-semibold tnum ${color}`}>{value}</span>
        {sub && <span className="block text-[11px] text-ink-muted mt-0.5 truncate">{sub}</span>}
      </span>
    </div>
  );
}

/** Where our price sits in the spread, and what the spread actually looks like. */
export function MarketInsights({ insights }: { insights: ProductInsights }) {
  const { lowest, highest, avg, median, spread, rank, ourPrice, gapToCheapest, listed } = insights;

  if (listed.length === 0) {
    return (
      <Panel title="Market insights" question="How does our price sit against the market?">
        <p className="text-xs text-ink-muted">
          No competitor prices have been collected for this product yet, so there is no market to
          compare against.
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Market insights" question="How does our price sit against the market?">
      <div className="-mt-2">
        <Row
          label="Lowest price"
          value={rupees(lowest?.price as number)}
          sub={
            lowest && (
              <span className="inline-flex items-center gap-1.5">
                <MarketplaceMark label={lowest.label} size={14} />
                {lowest.label}
              </span>
            )
          }
          tone="good"
        />
        <Row
          label="Highest price"
          value={rupees(highest?.price as number)}
          sub={
            highest && (
              <span className="inline-flex items-center gap-1.5">
                <MarketplaceMark label={highest.label} size={14} />
                {highest.label}
              </span>
            )
          }
        />
        <Row label="Average market price" value={avg !== null ? rupees(avg) : "—"} />
        <Row label="Median market price" value={median !== null ? rupees(median) : "—"} />
        {/* A spread needs two listings to say anything; one is always ₹0. */}
        {listed.length > 1 && spread !== null && (
          <Row
            label="Market spread"
            value={rupees(spread)}
            sub={`Across ${listed.length} listings`}
          />
        )}
        <Row
          label="Our price"
          value={ourPrice !== null ? rupees(ourPrice) : "—"}
          sub={rank ? `Rank #${rank.rank} of ${rank.of} sellers` : undefined}
          tone={gapToCheapest !== null && gapToCheapest > 0 ? "bad" : "good"}
        />
        <Row
          label="Gap to cheapest"
          value={gapToCheapest !== null ? rupees(Math.abs(gapToCheapest)) : "—"}
          sub={
            gapToCheapest === null
              ? undefined
              : gapToCheapest > 0
                ? "We are pricier"
                : gapToCheapest < 0
                  ? "We undercut the market"
                  : "Level"
          }
          tone={gapToCheapest !== null && gapToCheapest > 0 ? "bad" : "good"}
        />
      </div>

      {/* The distance as a line, so it reads before the digits do. Drawn
          whenever our price differs from the market, even on a single listing. */}
      {ourPrice !== null && gapToCheapest !== null && gapToCheapest !== 0 && (
        <PriceSpreadBar insights={insights} />
      )}
    </Panel>
  );
}

/** Our price plotted on the min–max range of every tracked listing. */
function PriceSpreadBar({ insights }: { insights: ProductInsights }) {
  const min = insights.lowest?.price as number;
  const max = insights.highest?.price as number;
  const ours = insights.ourPrice as number;
  const lo = Math.min(min, ours);
  const hi = Math.max(max, ours);
  const at = (v: number) => ((v - lo) / (hi - lo)) * 100;

  return (
    <div className="mt-6 pt-5 border-t border-line">
      <div className="text-[10px] uppercase tracking-wide text-ink-muted mb-4">Price range</div>
      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-emerald-200 via-amber-200 to-red-200">
        <span
          className="absolute -top-1 w-3.5 h-3.5 rounded-full bg-primary ring-2 ring-white shadow"
          style={{ left: `calc(${at(ours)}% - 7px)` }}
          title={`Our price ${rupees(ours)}`}
        />
      </div>
      <div className="flex justify-between text-[10px] text-ink-muted tnum mt-2">
        <span>{rupees(lo)}</span>
        <span className="text-primary font-semibold">Us · {rupees(ours)}</span>
        <span>{rupees(hi)}</span>
      </div>
    </div>
  );
}

const ACTION_STYLE: Record<ActionTone, { icon: LucideIcon; wrap: string; mark: string }> = {
  act: { icon: AlertTriangle, wrap: "border-red-100 bg-red-50/40", mark: "text-red-500" },
  watch: { icon: Lightbulb, wrap: "border-amber-100 bg-amber-50/40", mark: "text-amber-500" },
  opportunity: { icon: Sparkles, wrap: "border-indigo-100 bg-indigo-50/40", mark: "text-primary" },
  good: { icon: CheckCircle2, wrap: "border-emerald-100 bg-emerald-50/40", mark: "text-emerald-500" },
};

/**
 * Recommendations, derived by rule from the numbers above. Each one restates a
 * figure already on the page rather than predicting anything — there is no
 * price history to forecast from, and a made-up trend is a business risk here.
 */
export function Recommendations({ insights }: { insights: ProductInsights }) {
  const actions = pricingActions(insights);

  return (
    <Panel title="Recommended actions" question="What should we do about this product today?">
      <ul className="space-y-3">
        {actions.map((a) => {
          const style = ACTION_STYLE[a.tone];
          const Icon = style.icon;
          return (
            <li key={a.title} className={`rounded-xl border p-4 ${style.wrap}`}>
              <div className="flex items-start gap-3">
                <Icon size={16} className={`${style.mark} shrink-0 mt-0.5`} />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-ink">{a.title}</div>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">{a.body}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-ink-muted mt-4 pt-4 border-t border-line leading-relaxed">
        Derived from the prices on this page — no forecasting, since the API stores no price
        history.
      </p>
    </Panel>
  );
}

/** Which tracked marketplaces are blind spots, and the route to fixing them. */
export function CoverageGaps({
  insights,
  onAddUrl,
}: {
  insights: ProductInsights;
  onAddUrl: () => void;
}) {
  const { missing, rows } = insights;

  return (
    <Panel
      title="Coverage gaps"
      question="Which marketplaces are we not collecting a price from?"
    >
      {missing.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <p className="text-xs text-ink">
            A price is being collected from all {rows.length} tracked marketplaces.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-ink-muted mb-4">
            <span className="font-semibold text-ink tnum">{missing.length}</span> of {rows.length}{" "}
            marketplaces return no price for this product. Each one is a listing we cannot compare
            against.
          </p>
          <ul className="space-y-2">
            {missing.map((row) => (
              <li
                key={row.label}
                className="flex items-center gap-3 rounded-xl border border-line p-3"
              >
                <MarketplaceMark label={row.label} size={28} />
                <span className="text-[13px] font-medium text-ink flex-1 min-w-0 truncate">
                  {row.label}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted shrink-0">
                  <PackageX size={12} />
                  {row.url ? "URL mapped, no price" : "No URL"}
                </span>
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="mt-4" onClick={onAddUrl}>
            <Plus size={14} /> Add competitor URL
          </Button>
        </>
      )}
    </Panel>
  );
}

/**
 * Price trend, competitor timeline, change log and activity feed all need
 * timestamped price captures. The API returns only the current price per
 * marketplace, so this states the gap instead of drawing a plausible line.
 */
export function PriceHistorySection() {
  return (
    <Panel
      title="Price history"
      question="How have our price and the market moved over time?"
      className="lg:col-span-2"
    >
      <AwaitingData
        icon={LineChart}
        headline="No price history is being stored yet"
        detail="Trend charts, the competitor timeline and the change log all need timestamped price captures. The price endpoint returns only the latest value per marketplace, with no capture date."
        requires="GET /platform-price-history/product/{id} → needs CapturedAt per row"
      />
    </Panel>
  );
}
