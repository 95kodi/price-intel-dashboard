"use client";
import { useMemo } from "react";
import { useDashboardFilters } from "@/components/dashboard/DashboardFilters";
import { computeMetrics } from "@/lib/metrics";
import { STATUS_MARK, POSITION_COPY } from "@/lib/viz";
import { ChartCard, NoData } from "./ChartCard";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";

/**
 * A stacked horizontal bar, not a doughnut: the reader compares three shares
 * against one baseline, which angles make harder than lengths.
 */
export function PricePositionBar() {
  const { products, isLoading, isError, isFetching, refetch } = useDashboardFilters();
  const m = useMemo(() => computeMetrics(products), [products]);

  const buckets = m.positionSplit.filter((b) => b.count > 0);
  const csv = m.positionSplit.map((b) => ({
    Position: b.label,
    Products: b.count,
    Share: `${b.pct}%`,
  }));

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <ChartCard
      title="Price Position Distribution"
      question="Are we winning or losing against the market right now?"
      data={csv}
      stale={isFetching}
    >
      {() =>
        buckets.length === 0 ? (
          <NoData />
        ) : (
          <div>
            {/* 2px surface gaps do the separating — no strokes around segments. */}
            <div
              className="flex gap-[2px] h-7 w-full rounded-lg overflow-hidden"
              role="img"
              aria-label={buckets
                .map((b) => `${b.label}: ${b.count} products, ${b.pct}%`)
                .join(". ")}
            >
              {buckets.map((b, i) => {
                const showLabel = b.pct >= 12;
                const first = i === 0;
                const last = i === buckets.length - 1;
                return (
                  <div
                    key={b.position}
                    title={`${b.label} — ${b.count} products (${b.pct}%)`}
                    className="flex items-center justify-center min-w-[3px] transition-all duration-500"
                    style={{
                      width: `${b.pct}%`,
                      backgroundColor: STATUS_MARK[b.position],
                      borderRadius: `${first ? "4px" : "0"} ${last ? "4px" : "0"} ${last ? "4px" : "0"} ${first ? "4px" : "0"}`,
                    }}
                  >
                    {showLabel && (
                      <span
                        className={`text-[11px] font-semibold tnum ${
                          b.position === "matching" || b.position === "unlisted"
                            ? "text-slate-700"
                            : "text-white"
                        }`}
                      >
                        {b.pct}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend: icon glyph + text label, so colour never carries it alone. */}
            <ul className="mt-5 space-y-2.5">
              {m.positionSplit.map((b) => (
                <li key={b.position} className="flex items-center gap-2.5 text-sm">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_MARK[b.position] }}
                  />
                  <span
                    aria-hidden="true"
                    className="text-[10px] text-ink-muted w-3 text-center shrink-0"
                  >
                    {POSITION_COPY[b.position].glyph}
                  </span>
                  <span className="text-ink flex-1 truncate">{b.label}</span>
                  <span className="tnum font-semibold text-ink">{b.count}</span>
                  <span className="tnum text-ink-muted w-10 text-right text-xs">{b.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        )
      }
    </ChartCard>
  );
}
