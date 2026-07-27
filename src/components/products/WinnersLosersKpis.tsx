"use client";
import { useMemo, type ReactNode } from "react";
import { Trophy, TrendingUp, ArrowLeftRight, AlertOctagon, type LucideIcon } from "lucide-react";
import { KpiCardSkeleton } from "@/components/ui/Skeleton";
import { useDashboardFilters } from "@/components/dashboard/DashboardFilters";
import { computeMetrics } from "@/lib/metrics";
import { rupees } from "@/lib/viz";

type Tone = "good" | "bad" | "neutral";

const TONE_ICON: Record<Tone, string> = {
  good: "bg-emerald-50 text-emerald-600",
  bad: "bg-red-50 text-red-500",
  neutral: "bg-indigo-50 text-primary",
};

const TONE_VALUE: Record<Tone, string> = {
  good: "text-emerald-700",
  bad: "text-red-600",
  neutral: "text-ink",
};

interface TileProps {
  label: string;
  value: string;
  /** One line saying what the number means for pricing. Never decorative. */
  detail: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  /** Reserved for the single figure that should pull the eye first. */
  emphasis?: boolean;
}

function Tile({ label, value, detail, icon: Icon, tone = "neutral", emphasis }: TileProps) {
  return (
    <div
      className={`group bg-card border rounded-2xl p-6 shadow-card transition-all duration-200 ${
        emphasis
          ? "border-red-200 ring-1 ring-red-100 bg-red-50/30 hover:shadow-card-hover"
          : "border-line hover:shadow-card-hover hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-sm font-medium text-ink-muted leading-snug">{label}</span>
        <div
          className={`w-9 h-9 rounded-xl ${TONE_ICON[tone]} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}
        >
          <Icon size={16} />
        </div>
      </div>
      <div className={`text-[36px] leading-[40px] font-semibold tracking-tight ${TONE_VALUE[tone]}`}>
        {value}
      </div>
      <div className="text-xs text-ink-muted mt-1.5 leading-relaxed">{detail}</div>
    </div>
  );
}

/**
 * The four numbers a pricing manager needs before reading a single card: how
 * many products win, how many lose, what the typical loss costs, and the worst
 * single case.
 */
export function WinnersLosersKpis() {
  const { products, isLoading, isError } = useDashboardFilters();
  const m = useMemo(() => computeMetrics(products), [products]);

  // Averaged over losing products only. The dashboard's "average price gap"
  // spans the whole catalog and nets winners off against losers — a different
  // question, so it is deliberately not reused here.
  const losing = m.biggestGaps;
  const avgLosingGap =
    losing.length > 0 ? Math.round(losing.reduce((a, r) => a + r.gap, 0) / losing.length) : 0;
  const largestGap = losing[0] ?? null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-700">
        Couldn&apos;t load price data, so no metrics can be shown.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <Tile
        label="Winning products"
        value={m.cheapest.toLocaleString("en-IN")}
        detail={
          <>
            Products where we have the lowest price —{" "}
            <span className="font-semibold text-emerald-700 tnum">{m.cheapestPct}%</span> of this
            selection
          </>
        }
        icon={Trophy}
        tone="good"
      />

      <Tile
        label="Price losers"
        value={m.above.toLocaleString("en-IN")}
        detail={
          <>
            Products needing a price update —{" "}
            <span className="font-semibold text-red-600 tnum">{m.abovePct}%</span> of this selection
          </>
        }
        icon={TrendingUp}
        tone="bad"
      />

      <Tile
        label="Average price gap"
        value={avgLosingGap > 0 ? rupees(avgLosingGap) : "—"}
        detail={
          losing.length > 0
            ? `How much higher we sit, averaged across the ${losing.length} losing products`
            : "Nothing is priced above the market right now"
        }
        icon={ArrowLeftRight}
        tone={avgLosingGap > 0 ? "bad" : "good"}
      />

      <Tile
        label="Largest price gap"
        value={largestGap ? rupees(largestGap.gap) : "—"}
        detail={
          largestGap ? (
            <>
              <span className="font-medium text-ink">{largestGap.product.ItemName}</span> — cheapest
              on {largestGap.cheapestAt}
            </>
          ) : (
            "No product is priced above the cheapest seller"
          )
        }
        icon={AlertOctagon}
        tone="bad"
        emphasis
      />
    </div>
  );
}
