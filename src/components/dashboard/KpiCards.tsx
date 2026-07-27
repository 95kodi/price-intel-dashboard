"use client";
import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  Package,
  TrendingDown,
  TrendingUp,
  PackageX,
  Store,
  ArrowLeftRight,
  ActivitySquare,
  Zap,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { KpiCardSkeleton } from "@/components/ui/Skeleton";
import { formatPrice } from "@/lib/utils";
import { computeMetrics, ACTION_THRESHOLD } from "@/lib/metrics";
import { rupees } from "@/lib/viz";
import { useDashboardFilters } from "./DashboardFilters";

type Tone = "neutral" | "good" | "bad" | "warn";

const TONE_ICON: Record<Tone, string> = {
  neutral: "bg-indigo-50 text-primary",
  good: "bg-emerald-50 text-emerald-600",
  bad: "bg-red-50 text-red-500",
  warn: "bg-amber-50 text-amber-600",
};

const TONE_VALUE: Record<Tone, string> = {
  neutral: "text-ink",
  good: "text-emerald-700",
  bad: "text-red-600",
  warn: "text-amber-700",
};

interface TileProps {
  label: string;
  value: string;
  /** One line telling the reader what to do or think. Never decorative. */
  detail: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  /** Draws the eye — reserved for the one tile that demands action. */
  emphasis?: boolean;
  href?: string;
  children?: ReactNode;
}

function Tile({ label, value, detail, icon: Icon, tone = "neutral", emphasis, href, children }: TileProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-sm font-medium text-ink-muted leading-snug">{label}</span>
        <div
          className={`w-9 h-9 rounded-xl ${TONE_ICON[tone]} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}
        >
          <Icon size={16} />
        </div>
      </div>
      {/* Proportional figures: tabular-nums makes a large standalone number read loose. */}
      <div className={`text-[36px] leading-[40px] font-semibold tracking-tight ${TONE_VALUE[tone]}`}>
        {value}
      </div>
      <div className="text-xs text-ink-muted mt-1.5 leading-relaxed">{detail}</div>
      {children}
    </>
  );

  const shell = `group bg-card border rounded-2xl p-6 shadow-card transition-all duration-200 flex flex-col ${
    emphasis
      ? "border-amber-300 ring-1 ring-amber-100 hover:shadow-card-hover"
      : "border-line hover:shadow-card-hover hover:-translate-y-0.5"
  }`;

  if (href) {
    return (
      <Link href={href} className={`${shell} hover:border-primary/30`}>
        {body}
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
          View products <ArrowRight size={12} />
        </span>
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}

/** Per-marketplace coverage bars — the detail behind the headline percentage. */
function CoverageBars({ rows }: { rows: Array<{ label: string; pct: number }> }) {
  return (
    <div className="mt-4 space-y-1.5">
      {rows.slice(0, 3).map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="text-[10px] text-ink-muted w-20 truncate" title={r.label}>
            {r.label}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(r.pct, 2)}%` }}
            />
          </div>
          <span className="text-[10px] text-ink-muted tnum w-8 text-right">{r.pct}%</span>
        </div>
      ))}
    </div>
  );
}

export function KpiCards() {
  const { products, isLoading, isError, totalCount } = useDashboardFilters();
  const m = useMemo(() => computeMetrics(products), [products]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
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

  const gapAbove = m.avgGap > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {/* Row 1 — where do we stand? */}
      <Tile
        label="Products monitored"
        value={m.total.toLocaleString("en-IN")}
        detail={
          products.length === totalCount
            ? `Across ${m.coverage.rows.length} marketplaces`
            : `Filtered from ${totalCount.toLocaleString("en-IN")} tracked`
        }
        icon={Package}
      />

      <Tile
        label="Price winners"
        value={m.cheapest.toLocaleString("en-IN")}
        detail={
          <>
            <span className="font-semibold text-emerald-700 tnum">{m.cheapestPct}%</span> of catalog
            — we undercut every competitor
          </>
        }
        icon={TrendingDown}
        tone="good"
      />

      <Tile
        label="Above market"
        value={m.above.toLocaleString("en-IN")}
        detail={
          <>
            <span className="font-semibold text-red-600 tnum">{m.abovePct}%</span> of catalog priced
            over the cheapest seller
          </>
        }
        icon={TrendingUp}
        tone="bad"
      />

      <Tile
        label="Missing listings"
        value={m.missingCount.toLocaleString("en-IN")}
        detail={
          m.worstMissing
            ? `Worst: ${m.worstMissing.label} (${m.worstMissing.count} absent)`
            : "Every product is listed everywhere"
        }
        icon={PackageX}
        tone={m.missingCount > 0 ? "warn" : "good"}
      />

      {/* Row 2 — how healthy is the operation? */}
      <Tile
        label="Marketplace coverage"
        value={`${m.coverage.pct}%`}
        detail={
          <>
            <span className="tnum">
              {m.coverage.tracked.toLocaleString("en-IN")} /{" "}
              {m.coverage.possible.toLocaleString("en-IN")}
            </span>{" "}
            possible listings tracked
          </>
        }
        icon={Store}
      >
        <CoverageBars rows={m.coverage.rows} />
      </Tile>

      <Tile
        label="Average price gap"
        value={formatPrice(Math.abs(m.avgGap))}
        detail={
          m.avgGap === 0
            ? "Level with the cheapest competitor"
            : gapAbove
              ? "Higher than the cheapest competitor"
              : "Below the cheapest competitor"
        }
        icon={ArrowLeftRight}
        tone={m.avgGap === 0 ? "neutral" : gapAbove ? "bad" : "good"}
      />

      {/* No scan-log endpoint exists, so this reports what is verifiable —
          how many products came back with a live price — and says so. */}
      <Tile
        label="Last scan health"
        value={`${m.total - m.unlisted}/${m.total}`}
        detail={
          <>
            products returned a live price.{" "}
            <span className="text-gray-400">
              Success/failure counts need a scan-log endpoint.
            </span>
          </>
        }
        icon={ActivitySquare}
        tone={m.unlisted === 0 ? "good" : "warn"}
      />

      <Tile
        label="Needs attention"
        value={m.needsAction.toLocaleString("en-IN")}
        detail={`Priced more than ${rupees(ACTION_THRESHOLD)} above the cheapest seller`}
        icon={Zap}
        tone="warn"
        emphasis
        href="/winners-losers"
      />
    </div>
  );
}
