"use client";
import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { useDashboardFilters } from "@/components/dashboard/DashboardFilters";
import { computeMetrics } from "@/lib/metrics";
import { SERIES_OURS } from "@/lib/viz";
import { ChartCard, NoData } from "./ChartCard";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";

/**
 * One series, so one colour for every bar — never a value-ramp on nominal
 * categories, which would double-encode length as hue. No legend either: the
 * title already names what is plotted.
 */
export function CompetitorWinsChart() {
  const { products, isLoading, isError, isFetching, refetch } = useDashboardFilters();
  const m = useMemo(() => computeMetrics(products), [products]);

  const rows = m.competitorWins;
  const max = Math.max(1, ...rows.map((r) => r.wins));
  const anyWins = rows.some((r) => r.wins > 0);

  const csv = rows.map((r) => ({
    Marketplace: r.label,
    "Times cheapest": r.wins,
    "Products listed": r.listed,
  }));

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <ChartCard
      title="Competitor Wins"
      question="Which competitor undercuts us on the most products?"
      data={csv}
      stale={isFetching}
    >
      {() =>
        !anyWins ? (
          <NoData message="No competitor currently holds the cheapest price on any product in this slice." />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.label} className="group">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink w-[104px] shrink-0 truncate" title={r.label}>
                    {r.label}
                  </span>
                  <div className="flex-1 h-2.5 rounded-sm bg-gray-50 relative overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(r.wins / max) * 100}%`,
                        backgroundColor: SERIES_OURS,
                        /* 4px rounded data-end, square at the baseline */
                        borderRadius: "0 4px 4px 0",
                      }}
                    />
                  </div>
                  {/* Value at the tip; text wears ink, never the series colour. */}
                  <span className="tnum text-sm font-semibold text-ink w-6 text-right shrink-0">
                    {r.wins}
                  </span>
                  <span className="text-[10px] text-ink-muted w-16 shrink-0 tnum">
                    of {r.listed} listed
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )
      }
    </ChartCard>
  );
}

/** The leader, called out as a figure because one number is the whole story. */
export function TopCompetitorCallout() {
  const { products } = useDashboardFilters();
  const m = useMemo(() => computeMetrics(products), [products]);
  const top = m.competitorWins[0];
  if (!top || top.wins === 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-200 px-2 py-1 rounded-md">
      <Trophy size={11} />
      {top.label} leads with {top.wins}
    </div>
  );
}
