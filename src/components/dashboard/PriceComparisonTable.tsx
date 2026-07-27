"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { formatPrice } from "@/lib/utils";
import {
  MARKETPLACES,
  ourRank,
  positionOf,
  priceOf,
  urlOf,
  type Position,
} from "@/lib/metrics";
import { POSITION_COPY, POSITION_PILL, rupees } from "@/lib/viz";
import { useDashboardFilters } from "./DashboardFilters";
import type { MergedProduct } from "@/types";

const BRAND_BADGE_STYLES = [
  "bg-indigo-50 text-indigo-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-sky-50 text-sky-700",
  "bg-violet-50 text-violet-700",
  "bg-rose-50 text-rose-700",
  "bg-teal-50 text-teal-700",
  "bg-orange-50 text-orange-700",
];

function brandBadgeStyle(brand: string): string {
  let hash = 0;
  for (let i = 0; i < brand.length; i++) hash = (hash * 31 + brand.charCodeAt(i)) >>> 0;
  return BRAND_BADGE_STYLES[hash % BRAND_BADGE_STYLES.length];
}

/** Status always ships an icon glyph plus a word — never colour alone. */
function PositionPill({ position }: { position: Position }) {
  const copy = POSITION_COPY[position];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ring-1 ring-inset whitespace-nowrap ${POSITION_PILL[position]}`}
      title={copy.label}
    >
      <span aria-hidden="true" className="text-[9px] leading-none">{copy.glyph}</span>
      {copy.short}
    </span>
  );
}

function PriceCell({
  price,
  url,
  lowest,
  highest,
}: {
  price: number | null;
  url: string | null;
  lowest: number | null;
  highest: number | null;
}) {
  if (price === null) return <span className="text-gray-300">—</span>;

  const isLowest = lowest !== null && price === lowest;
  const isHighest = highest !== null && price === highest && highest !== lowest;
  const diff = lowest !== null && price > lowest ? price - lowest : null;

  let priceClass = "text-ink";
  let chipClass = "";
  if (isLowest) {
    priceClass = "text-emerald-700 font-semibold";
    chipClass = "bg-emerald-50 ring-1 ring-inset ring-emerald-100";
  } else if (isHighest) {
    priceClass = "text-red-600 font-medium";
    chipClass = "bg-red-50 ring-1 ring-inset ring-red-100";
  }

  return (
    <span className={`inline-flex flex-col items-start px-2 py-1 rounded-lg ${chipClass}`}>
      <a
        href={url || "#"}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`tnum text-[13px] ${priceClass} ${url ? "hover:underline" : "pointer-events-none"}`}
      >
        {formatPrice(price)}
      </a>
      {diff !== null && diff > 0 && (
        <span className="tnum text-[10px] leading-3 text-gray-400">+{rupees(diff)} vs low</span>
      )}
    </span>
  );
}

function pageList(current: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  const pages = new Set<number>([0, count - 1, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 0 && p < count).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = -1;
  for (const p of sorted) {
    if (prev !== -1 && p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

export function exportCsv(rows: MergedProduct[]) {
  const headers = [
    "Product",
    "Brand",
    "Category",
    "Our Price",
    ...MARKETPLACES.map((c) => c.label),
    "Cheapest Price",
    "Cheapest Seller",
    "Our Rank",
    "Gap vs Best",
    "Status",
  ];
  const esc = (v: string | number | null) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) => {
      const rank = ourRank(r);
      return [
        esc(r.ItemName),
        esc(r.Brand),
        esc(r.Category),
        esc(r.CurrentPrice),
        ...MARKETPLACES.map((c) => esc(priceOf(r, c))),
        esc(r.lowestPrice),
        esc(r.lowestPlatform),
        esc(rank ? `${rank.rank} of ${rank.of}` : ""),
        esc(r.priceGap),
        esc(POSITION_COPY[positionOf(r)].label),
      ].join(",");
    }),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `price-comparison-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PriceComparisonTable() {
  const router = useRouter();
  const { products, isLoading, isError, isFetching, refetch, activeCount, reset } =
    useDashboardFilters();
  const [sorting, setSorting] = useState<SortingState>([{ id: "priceGap", desc: true }]);
  const [pageIndex, setPageIndex] = useState(0);

  const columns: ColumnDef<MergedProduct>[] = useMemo(() => {
    const cols: ColumnDef<MergedProduct>[] = [
      {
        accessorKey: "ItemName",
        header: "Product",
        enableSorting: true,
        cell: (info) => (
          <span
            className="font-medium text-ink text-[13px] block max-w-[240px] truncate"
            title={info.getValue() as string}
          >
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "Brand",
        header: "Brand",
        enableSorting: true,
        cell: (info) => {
          const b = info.getValue() as string;
          return (
            <span className={`text-[11px] font-medium px-2 py-1 rounded-md ${brandBadgeStyle(b)}`}>
              {b}
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        enableSorting: true,
        accessorFn: (row) => positionOf(row),
        cell: (info) => <PositionPill position={positionOf(info.row.original)} />,
      },
      {
        accessorKey: "CurrentPrice",
        header: "Our Price",
        enableSorting: true,
        cell: (info) => {
          const price = info.getValue() as number | null;
          if (price === null) return <span className="text-gray-300">—</span>;
          return (
            <span className="tnum text-[13px] font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-inset ring-indigo-100 px-2 py-1 rounded-lg">
              {formatPrice(price)}
            </span>
          );
        },
      },
      {
        id: "ourRank",
        header: "Our Rank",
        enableSorting: true,
        // Unranked products sort last rather than pretending to be rank 0.
        accessorFn: (row) => ourRank(row)?.rank ?? Number.MAX_SAFE_INTEGER,
        cell: (info) => {
          const rank = ourRank(info.row.original);
          if (!rank) return <span className="text-gray-300">—</span>;
          const best = rank.rank === 1;
          return (
            <span
              className={`tnum text-[12px] font-semibold ${best ? "text-emerald-700" : "text-ink"}`}
              title={`Our price is ${rank.rank} cheapest of ${rank.of} sellers`}
            >
              {rank.rank}
              <span className="text-ink-muted font-normal"> of {rank.of}</span>
            </span>
          );
        },
      },
      {
        accessorKey: "lowestPlatform",
        header: "Cheapest Seller",
        enableSorting: true,
        cell: (info) => {
          const platform = info.getValue() as string | null;
          if (!platform) return <span className="text-gray-300">—</span>;
          return (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100 whitespace-nowrap">
              <Trophy size={10} />
              {platform}
            </span>
          );
        },
      },
      {
        id: "priceGap",
        header: "Gap vs Best",
        enableSorting: true,
        accessorFn: (row) => row.priceGap ?? Number.NEGATIVE_INFINITY,
        cell: (info) => {
          const gap = info.row.original.priceGap;
          if (gap === null) return <span className="text-gray-300">—</span>;
          if (gap === 0) return <span className="tnum text-xs font-medium text-ink-muted">₹0</span>;
          const losing = gap > 0;
          return (
            <span
              className={`tnum text-xs font-semibold ${losing ? "text-red-600" : "text-emerald-700"}`}
            >
              {losing ? "+" : "−"}
              {rupees(Math.abs(gap))}
            </span>
          );
        },
      },
      {
        accessorKey: "lowestPrice",
        header: "Best Price",
        enableSorting: true,
        cell: (info) => (
          <span className="tnum font-semibold text-ink text-[13px]">
            {formatPrice(info.getValue() as number | null)}
          </span>
        ),
      },
    ];

    for (const marketplace of MARKETPLACES) {
      cols.push({
        id: marketplace.label,
        header: marketplace.label,
        enableSorting: true,
        accessorFn: (row) => priceOf(row, marketplace) ?? Number.MAX_SAFE_INTEGER,
        cell: (info) => {
          const row = info.row.original;
          const all = MARKETPLACES.map((c) => priceOf(row, c)).filter(
            (p): p is number => p !== null
          );
          return (
            <PriceCell
              price={priceOf(row, marketplace)}
              url={urlOf(row, marketplace)}
              lowest={all.length ? Math.min(...all) : null}
              highest={all.length ? Math.max(...all) : null}
            />
          );
        },
      });
    }

    return cols;
  }, []);

  const table = useReactTable({
    data: products,
    columns,
    state: { sorting, pagination: { pageIndex, pageSize: 10 } },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex, pageSize: 10 }) : updater;
      setPageIndex(next.pageIndex);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const totalRows = products.length;
  const pageCount = table.getPageCount();
  const safePage = Math.min(pageIndex, Math.max(0, pageCount - 1));

  return (
    <section
      aria-label="Price comparison"
      className="bg-card border border-line rounded-2xl overflow-hidden shadow-card"
    >
      <div className="px-6 pt-5 pb-4 flex items-center gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-ink tracking-tight">Price Comparison</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Every column sorts — click a row to open the product
          </p>
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCsv(products)}
          disabled={totalRows === 0}
        >
          <Download size={13} />
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={12} />
      ) : isError ? (
        <ErrorState
          title="Failed to load products"
          description="Unable to fetch price comparison data."
          onRetry={() => refetch()}
        />
      ) : totalRows === 0 ? (
        <EmptyState
          title="No products match your filters"
          description="Try widening the filters above."
          action={activeCount > 0 ? { label: "Clear filters", onClick: reset } : undefined}
        />
      ) : (
        <>
          {/* Hold the previous render at reduced opacity — no skeleton flash. */}
          <div
            className={`overflow-x-auto max-h-[560px] overflow-y-auto border-t border-line transition-opacity duration-200 ${
              isFetching ? "opacity-60" : ""
            }`}
          >
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header, idx) => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        aria-sort={
                          header.column.getIsSorted() === "asc"
                            ? "ascending"
                            : header.column.getIsSorted() === "desc"
                              ? "descending"
                              : undefined
                        }
                        className={`bg-gray-50 text-left px-4 py-3 text-[11px] uppercase tracking-wider text-ink-muted font-medium whitespace-nowrap select-none border-b border-line ${
                          header.column.getCanSort() ? "cursor-pointer hover:bg-gray-100" : ""
                        } ${idx === 0 ? "sticky left-0 z-20 pl-6" : ""}`}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() &&
                            (header.column.getIsSorted() === "asc" ? (
                              <ChevronUp size={12} className="text-primary" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ChevronDown size={12} className="text-primary" />
                            ) : (
                              <ArrowUpDown size={11} className="text-gray-300" />
                            ))}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, rowIdx) => {
                  const zebra = rowIdx % 2 === 1 ? "bg-gray-50/60" : "bg-card";
                  const goToProduct = () => router.push(`/products/${row.original.ProductID}`);
                  return (
                    <tr
                      key={row.id}
                      onClick={goToProduct}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          goToProduct();
                        }
                      }}
                      role="link"
                      tabIndex={0}
                      aria-label={`View ${row.original.ItemName}`}
                      className="group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    >
                      {row.getVisibleCells().map((cell, idx) => (
                        <td
                          key={cell.id}
                          className={`px-4 py-3 whitespace-nowrap border-b border-gray-100 transition-colors ${zebra} group-hover:bg-indigo-50/40 ${
                            idx === 0 ? "sticky left-0 z-[5] pl-6" : ""
                          }`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 flex-wrap gap-3">
            <span className="text-xs text-ink-muted tnum">
              Showing {safePage * 10 + 1}–{Math.min((safePage + 1) * 10, totalRows)} of {totalRows}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-gray-50 disabled:opacity-40 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              {pageList(safePage, pageCount).map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="w-8 text-center text-xs text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => table.setPageIndex(p)}
                    aria-current={safePage === p ? "page" : undefined}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
                      safePage === p
                        ? "bg-primary text-white font-semibold shadow-card"
                        : "border border-line text-ink-muted hover:bg-gray-50"
                    }`}
                  >
                    {p + 1}
                  </button>
                )
              )}
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-gray-50 disabled:opacity-40 transition-colors"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
