"use client";
import { useMemo } from "react";
import Link from "next/link";
import { productHref } from "@/lib/utils";
import { useDashboardFilters } from "@/components/dashboard/DashboardFilters";
import { MARKETPLACES, priceOf } from "@/lib/metrics";
import { STATUS_MARK, POSITION_COPY, rupees, truncate } from "@/lib/viz";
import { ChartCard, NoData } from "./ChartCard";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import type { MergedProduct } from "@/types";

type Cell = "cheapest" | "matching" | "above" | "unlisted";

/** Our price against this one marketplace — "cheapest" means we undercut them. */
function cellFor(p: MergedProduct, price: number | null): Cell {
  if (price === null || p.CurrentPrice === null) return "unlisted";
  if (p.CurrentPrice < price) return "cheapest";
  if (p.CurrentPrice > price) return "above";
  return "matching";
}

const LEGEND: Array<{ cell: Cell; text: string }> = [
  { cell: "cheapest", text: "We are cheaper" },
  { cell: "matching", text: "Same price" },
  { cell: "above", text: "They are cheaper" },
  { cell: "unlisted", text: "Not listed" },
];

/**
 * Scan a column to find the competitor that beats us most often; scan a row to
 * see one product's exposure. Every cell carries a glyph as well as a colour.
 */
export function CompetitorHeatmap() {
  const { products, isLoading, isError, isFetching, refetch } = useDashboardFilters();

  const rows = useMemo(
    () =>
      products
        .filter((p) => p.CurrentPrice !== null)
        .map((p) => ({
          product: p,
          cells: MARKETPLACES.map((m) => {
            const price = priceOf(p, m);
            return { marketplace: m.label, price, cell: cellFor(p, price) };
          }),
          losses: MARKETPLACES.filter((m) => cellFor(p, priceOf(p, m)) === "above").length,
        }))
        .sort((a, b) => b.losses - a.losses),
    [products]
  );

  const csv = rows.map((r) => {
    const out: Record<string, string | number> = { Product: r.product.ItemName };
    for (const c of r.cells) out[c.marketplace] = c.price ?? "";
    return out;
  });

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <ChartCard
      title="Competitor Heatmap"
      question="Which marketplaces beat us, on which products?"
      data={csv}
      stale={isFetching}
    >
      {(expanded) => {
        const shown = expanded ? rows : rows.slice(0, 8);
        if (shown.length === 0) {
          return <NoData message="No product in this slice has our price recorded." />;
        }
        return (
          <div>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] uppercase tracking-wider text-ink-muted font-medium pb-2 pr-3 sticky left-0 bg-card z-10">
                      Product
                    </th>
                    {MARKETPLACES.map((m) => (
                      <th
                        key={m.label}
                        className="pb-2 px-1 text-[10px] font-medium text-ink-muted align-bottom"
                      >
                        <span className="block whitespace-nowrap [writing-mode:vertical-rl] rotate-180 h-16 mx-auto">
                          {m.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map(({ product, cells }) => (
                    <tr key={product.ProductID} className="group">
                      <td className="pr-3 py-1 sticky left-0 bg-card group-hover:bg-indigo-50/40 z-10 transition-colors">
                        <Link
                          href={productHref(product.ProductID)}
                          className="text-[12px] text-ink hover:text-primary transition-colors block max-w-[190px] truncate"
                          title={product.ItemName}
                        >
                          {truncate(product.ItemName, 30)}
                        </Link>
                      </td>
                      {cells.map((c) => (
                        <td key={c.marketplace} className="px-1 py-1">
                          <span
                            title={
                              c.price === null
                                ? `${c.marketplace}: not listed`
                                : `${c.marketplace}: ${rupees(c.price)} — ${LEGEND.find((l) => l.cell === c.cell)?.text}`
                            }
                            className={`flex items-center justify-center h-7 w-full min-w-[26px] rounded-md text-[10px] font-bold ${
                              c.cell === "unlisted" ? "text-gray-400" : "text-white"
                            }`}
                            style={{ backgroundColor: STATUS_MARK[c.cell] }}
                          >
                            {POSITION_COPY[c.cell].glyph}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-line">
              {LEGEND.map(({ cell, text }) => (
                <li key={cell} className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
                  <span
                    aria-hidden="true"
                    className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold ${
                      cell === "unlisted" ? "text-gray-400" : "text-white"
                    }`}
                    style={{ backgroundColor: STATUS_MARK[cell] }}
                  >
                    {POSITION_COPY[cell].glyph}
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            {!expanded && rows.length > shown.length && (
              <p className="text-xs text-ink-muted mt-3">
                Showing {shown.length} most-exposed products of {rows.length}.
              </p>
            )}
          </div>
        );
      }}
    </ChartCard>
  );
}
