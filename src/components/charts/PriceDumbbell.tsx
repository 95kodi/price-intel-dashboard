"use client";
import { useMemo } from "react";
import Link from "next/link";
import { productHref } from "@/lib/utils";
import { useDashboardFilters } from "@/components/dashboard/DashboardFilters";
import { SERIES_OURS, SERIES_MARKET, rupees, rupeesShort } from "@/lib/viz";
import { ChartCard, NoData } from "./ChartCard";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";

interface Row {
  id: number;
  name: string;
  ours: number;
  market: number;
  cheapestAt: string;
  gap: number;
}

/**
 * A dumbbell, not grouped bars: the quantity a manager actually reads is the
 * distance between two prices, so encode it as one length instead of asking
 * them to subtract two bar heights by eye.
 */
export function PriceDumbbell() {
  const { products, isLoading, isError, isFetching, refetch } = useDashboardFilters();

  const rows = useMemo<Row[]>(
    () =>
      products
        .filter((p) => p.CurrentPrice !== null && p.lowestPrice !== null)
        .map((p) => ({
          id: p.ProductID,
          name: p.ItemName,
          ours: p.CurrentPrice!,
          market: p.lowestPrice!,
          cheapestAt: p.lowestPlatform ?? "—",
          gap: p.priceGap ?? 0,
        }))
        .sort((a, b) => b.gap - a.gap),
    [products]
  );

  // One shared scale across every row, so distances are comparable row to row.
  const values = rows.flatMap((r) => [r.ours, r.market]);
  const lo = values.length ? Math.min(...values) : 0;
  const hi = values.length ? Math.max(...values) : 1;
  const span = hi - lo || 1;
  const pad = 6;
  const pos = (v: number) => pad + ((v - lo) / span) * (100 - pad * 2);

  const csv = rows.map((r) => ({
    Product: r.name,
    "Our price": r.ours,
    "Cheapest competitor": r.market,
    "Cheapest at": r.cheapestAt,
    Gap: r.gap,
  }));

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <ChartCard
      title="Our Price vs. the Market"
      question="How far is each product from the cheapest seller?"
      data={csv}
      stale={isFetching}
    >
      {(expanded) => {
        const shown = expanded ? rows : rows.slice(0, 7);
        if (shown.length === 0) {
          return <NoData message="No product in this slice has both our price and a competitor price." />;
        }
        return (
          <div>
            {/* Two series, so a legend is always present. */}
            <div className="flex items-center gap-4 mb-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                <span
                  className="w-2.5 h-2.5 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: SERIES_OURS }}
                />
                Our price
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                <span
                  className="w-2.5 h-2.5 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: SERIES_MARKET }}
                />
                Cheapest competitor
              </span>
            </div>

            <ul className="space-y-3.5">
              {shown.map((r) => {
                const ourX = pos(r.ours);
                const mktX = pos(r.market);
                const left = Math.min(ourX, mktX);
                const width = Math.abs(ourX - mktX);
                return (
                  <li key={r.id}>
                    <Link href={productHref(r.id)} className="group block">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span
                          className="text-[12px] text-ink truncate group-hover:text-primary transition-colors"
                          title={r.name}
                        >
                          {r.name}
                        </span>
                        <span
                          className={`tnum text-[11px] font-semibold shrink-0 ${
                            r.gap > 0 ? "text-red-600" : r.gap < 0 ? "text-emerald-700" : "text-ink-muted"
                          }`}
                        >
                          {r.gap > 0 ? "+" : r.gap < 0 ? "−" : ""}
                          {rupees(Math.abs(r.gap))}
                        </span>
                      </div>
                      <div className="relative h-4" title={`Our price ${rupees(r.ours)} · cheapest ${rupees(r.market)} on ${r.cheapestAt}`}>
                        {/* baseline track */}
                        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gray-100" />
                        {/* the gap itself — the quantity being read */}
                        <div
                          className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-slate-300"
                          style={{ left: `${left}%`, width: `${width}%` }}
                        />
                        <span
                          className="absolute top-1/2 w-2.5 h-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full ring-2 ring-white"
                          style={{ left: `${mktX}%`, backgroundColor: SERIES_MARKET }}
                        />
                        <span
                          className="absolute top-1/2 w-2.5 h-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full ring-2 ring-white"
                          style={{ left: `${ourX}%`, backgroundColor: SERIES_OURS }}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="flex justify-between text-[10px] text-ink-muted tnum mt-3 pt-2 border-t border-line">
              <span>{rupeesShort(lo)}</span>
              <span>{rupeesShort(hi)}</span>
            </div>

            {!expanded && rows.length > shown.length && (
              <p className="text-xs text-ink-muted mt-2">
                Showing the {shown.length} widest gaps of {rows.length}.
              </p>
            )}
          </div>
        );
      }}
    </ChartCard>
  );
}
