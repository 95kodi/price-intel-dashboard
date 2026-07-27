"use client";
import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useDashboardFilters } from "@/components/dashboard/DashboardFilters";
import { computeMetrics } from "@/lib/metrics";
import { PRIORITY_COPY, PRIORITY_PILL, rupees } from "@/lib/viz";
import { ChartCard, NoData } from "./ChartCard";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";

/**
 * The worklist, ranked. Each row is a decision: product, what it costs us, and
 * how urgent — with a direct route to fix it.
 */
export function BiggestGapsList() {
  const { products, isLoading, isError, isFetching, refetch } = useDashboardFilters();
  const m = useMemo(() => computeMetrics(products), [products]);

  const all = m.biggestGaps;
  const max = Math.max(1, ...all.map((r) => r.gap));

  const csv = all.map((r) => ({
    Product: r.product.ItemName,
    Brand: r.product.Brand,
    "Our price": r.product.CurrentPrice ?? "",
    "Cheapest price": r.product.lowestPrice ?? "",
    "Cheapest at": r.cheapestAt,
    Gap: r.gap,
    Priority: PRIORITY_COPY[r.priority],
  }));

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <ChartCard
      title="Biggest Price Gaps"
      question="Where are we losing the most margin, and what do we fix first?"
      data={csv}
      stale={isFetching}
    >
      {(expanded) => {
        const rows = expanded ? all : all.slice(0, 6);
        if (rows.length === 0) {
          return (
            <NoData message="Nothing is priced above the market in this slice — no action needed." />
          );
        }
        return (
          <div>
            <ul className="space-y-1">
              {rows.map((r) => (
                <li key={r.product.ProductID}>
                  <Link
                    href={`/products/${r.product.ProductID}`}
                    className="group flex items-center gap-3 px-2 py-2.5 -mx-2 rounded-xl hover:bg-indigo-50/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[13px] font-medium text-ink truncate"
                          title={r.product.ItemName}
                        >
                          {r.product.ItemName}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ring-1 ring-inset shrink-0 ${PRIORITY_PILL[r.priority]}`}
                        >
                          {r.priority === "high" && (
                            <AlertTriangle size={9} className="inline mr-0.5 -mt-px" />
                          )}
                          {PRIORITY_COPY[r.priority]}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-sm bg-gray-50 overflow-hidden">
                        <div
                          className="h-full bg-danger transition-all duration-500"
                          style={{ width: `${(r.gap / max) * 100}%`, borderRadius: "0 4px 4px 0" }}
                        />
                      </div>
                      <div className="text-[11px] text-ink-muted mt-1">
                        Cheapest on <span className="font-medium text-ink">{r.cheapestAt}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="tnum text-sm font-semibold text-red-600">
                        +{rupees(r.gap)}
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Fix <ArrowRight size={10} />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {!expanded && all.length > rows.length && (
              <p className="text-xs text-ink-muted mt-3 pt-3 border-t border-line">
                {all.length - rows.length} more above market — expand to see all.
              </p>
            )}
          </div>
        );
      }}
    </ChartCard>
  );
}
