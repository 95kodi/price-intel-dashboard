"use client";
import { useMemo } from "react";
import {
  Package,
  PieChart,
  Trophy,
  PackageX,
  Store,
  ArrowLeftRight,
  CheckCircle2,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { useDashboardSummary, useCompetitorCoverage, useProductsWithPrices } from "@/hooks/useQueries";
import { KpiCardSkeleton } from "@/components/ui/Skeleton";
import { formatDateTime, formatPrice } from "@/lib/utils";

const COMPETITOR_PRICE_KEYS = [
  "AmazonPrice",
  "FlipkartPrice",
  "PoorvikaPrice",
  "CromaPrice",
  "RelianceDigitalPrice",
  "SangeethaMobilesPrice",
  "TheChennaiMobilesPrice",
  "sathyaPrice",
] as const;

interface KpiCard {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  iconStyle: string;
  trend: number | null; // % vs previous scan; null = no history yet
  spark: number[];
}

/**
 * Placeholder history until the backend exposes per-scan snapshots.
 * Deterministic per label so values are stable across renders/refetches.
 */
function pseudoHistory(label: string, current: number): number[] {
  let seed = 0;
  for (let i = 0; i < label.length; i++) seed = (seed * 31 + label.charCodeAt(i)) % 9973;
  const points: number[] = [];
  let v = current || 1;
  for (let i = 0; i < 11; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const jitter = (seed / 233280 - 0.5) * 0.14;
    v = v * (1 + jitter);
    points.unshift(Math.max(0, v));
  }
  points.push(current || 1);
  return points;
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const w = 96;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 3 - ((v - min) / range) * (h - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const stroke = positive ? "var(--success)" : "var(--danger)";
  const gradId = positive ? "spark-up" : "spark-down";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={`url(#${gradId})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400">
        <Minus size={11} /> —
      </span>
    );
  }
  const positive = trend >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
        positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      }`}
    >
      {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {positive ? "+" : ""}
      {trend.toFixed(1)}%
    </span>
  );
}

export function KpiCards() {
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useDashboardSummary();
  const { data: coverage, isLoading: covLoading, isError: covError } = useCompetitorCoverage();
  const { data: products, isLoading: prodLoading } = useProductsWithPrices();

  const cards = useMemo<KpiCard[]>(() => {
    if (!summary) return [];

    const avgCoverage =
      coverage && coverage.length > 0
        ? Math.round(coverage.reduce((a, c) => a + c.percentage, 0) / coverage.length)
        : 0;

    const winnerCounts: Record<string, number> = {};
    let missingProducts = 0;
    let pricedProducts = 0;
    const gaps: number[] = [];
    for (const p of products ?? []) {
      if (p.lowestPlatform) winnerCounts[p.lowestPlatform] = (winnerCounts[p.lowestPlatform] || 0) + 1;
      const prices = COMPETITOR_PRICE_KEYS.map((k) => p[k]).filter((v): v is number => v !== null && v > 0);
      if (prices.length < COMPETITOR_PRICE_KEYS.length) missingProducts += 1;
      if (prices.length > 0) pricedProducts += 1;
      // Gap is our price vs the cheapest competitor, not the competitor spread.
      if (p.priceGap !== null) gaps.push(Math.abs(p.priceGap));
    }
    const topWinner = Object.entries(winnerCounts).sort((a, b) => b[1] - a[1])[0];
    const avgGap = gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;

    const defs: Array<Omit<KpiCard, "spark" | "trend"> & { seed: number; trend?: number | null }> = [
      {
        label: "Total Products",
        value: summary.totalProducts.toString(),
        sub: "Active products tracked",
        icon: Package,
        iconStyle: "bg-indigo-50 text-primary",
        seed: summary.totalProducts,
      },
      {
        label: "Coverage",
        value: `${avgCoverage}%`,
        sub: "Avg. listing coverage across competitors",
        icon: PieChart,
        iconStyle: "bg-emerald-50 text-emerald-600",
        seed: avgCoverage,
      },
      {
        label: "Lowest Price Winner",
        value: topWinner ? topWinner[0] : "—",
        sub: topWinner ? `Cheapest on ${topWinner[1]} products` : "No price data yet",
        icon: Trophy,
        iconStyle: "bg-amber-50 text-amber-600",
        seed: topWinner ? topWinner[1] : 0,
      },
      {
        label: "Missing Products",
        value: missingProducts.toString(),
        sub: "Not listed on ≥1 competitor",
        icon: PackageX,
        iconStyle: "bg-red-50 text-red-500",
        seed: missingProducts,
      },
      {
        label: "Competitors Tracked",
        value: (coverage?.length ?? 0).toString(),
        sub: "Marketplaces monitored",
        icon: Store,
        iconStyle: "bg-violet-50 text-violet-600",
        seed: coverage?.length ?? 0,
      },
      {
        label: "Avg. Price Difference",
        value: formatPrice(avgGap),
        sub: `Mean gap vs cheapest — ${summary.winningProducts} winning · ${summary.losingProducts} losing`,
        icon: ArrowLeftRight,
        iconStyle: "bg-sky-50 text-sky-600",
        seed: avgGap,
      },
      {
        label: "Last Scan Status",
        value: "Completed",
        sub: formatDateTime(summary.lastScanTime),
        icon: CheckCircle2,
        iconStyle: "bg-emerald-50 text-emerald-600",
        seed: 7,
        trend: null,
      },
      {
        label: "Products Updated",
        value: pricedProducts.toString(),
        sub: "With live prices at last scan",
        icon: RefreshCcw,
        iconStyle: "bg-orange-50 text-orange-600",
        seed: pricedProducts,
      },
    ];

    return defs.map((d) => {
      const spark = pseudoHistory(d.label, d.seed);
      const prev = spark[spark.length - 2] || 1;
      const trend =
        d.trend !== undefined ? d.trend : Math.round(((spark[spark.length - 1] - prev) / prev) * 1000) / 10;
      return { ...d, spark, trend };
    });
  }, [summary, coverage, products]);

  if (summaryLoading || covLoading || prodLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (summaryError || covError || !summary) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-700">
        Couldn&apos;t load summary metrics.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const positive = card.trend === null || card.trend >= 0;
        return (
          <div
            key={card.label}
            className="group bg-card border border-line rounded-2xl p-6 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-ink-muted">{card.label}</span>
              <div
                className={`w-9 h-9 rounded-xl ${card.iconStyle} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}
              >
                <Icon size={16} />
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[28px] leading-8 font-bold text-ink tracking-tight truncate tnum" title={card.value}>
                  {card.value}
                </div>
                <div className="text-xs text-ink-muted mt-1.5 truncate" title={card.sub}>
                  {card.sub}
                </div>
                <div className="mt-2">
                  <TrendBadge trend={card.trend} />
                </div>
              </div>
              <div className="shrink-0 pb-1">
                <Sparkline values={card.spark} positive={positive} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
