"use client";
import { useMemo, useState } from "react";
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
  Search,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Trophy,
} from "lucide-react";
import { useProductsWithPrices, useBrands } from "@/hooks/useQueries";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { formatPrice } from "@/lib/utils";
import type { MergedProduct } from "@/types";

const COMPETITOR_COLS = [
  { key: "AmazonPrice" as const, urlKey: "AmazonURL" as const, label: "Amazon" },
  { key: "FlipkartPrice" as const, urlKey: "FlipkartURL" as const, label: "Flipkart" },
  { key: "PoorvikaPrice" as const, urlKey: "PoorvikaURL" as const, label: "Poorvika" },
  { key: "CromaPrice" as const, urlKey: "CromaURL" as const, label: "Croma" },
  { key: "RelianceDigitalPrice" as const, urlKey: "RelianceDigitalURL" as const, label: "Reliance" },
  { key: "SangeethaMobilesPrice" as const, urlKey: "SangeethaMobilesURL" as const, label: "Sangeetha" },
  { key: "TheChennaiMobilesPrice" as const, urlKey: "TheChennaiMobilesURL" as const, label: "Chennai Mobiles" },
  { key: "sathyaPrice" as const, urlKey: "sathyaURL" as const, label: "Sathya" },
];

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
  if (price === null || price === undefined || price <= 0) {
    return <span className="text-gray-300">—</span>;
  }
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
        <span className="tnum text-[10px] leading-3 text-gray-400">+{formatPrice(diff).replace("₹", "₹")} vs low</span>
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
  const headers = ["Product", "Brand", "Category", ...COMPETITOR_COLS.map((c) => c.label), "Lowest Price", "Lowest Platform"];
  const esc = (v: string | number | null) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        esc(r.ItemName),
        esc(r.Brand),
        esc(r.Category),
        ...COMPETITOR_COLS.map((c) => esc(r[c.key])),
        esc(r.lowestPrice),
        esc(r.lowestPlatform),
      ].join(",")
    ),
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
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pageIndex, setPageIndex] = useState(0);

  const { data: brands } = useBrands();
  const { data: products, isLoading, isError, refetch, isFetching } = useProductsWithPrices({
    search: search || undefined,
    brand: brand || undefined,
    status: status || undefined,
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!competitor) return products;
    const col = COMPETITOR_COLS.find((c) => c.label === competitor);
    if (!col) return products;
    return products.filter((p) => p[col.key] !== null && (p[col.key] as number) > 0);
  }, [products, competitor]);

  const columns: ColumnDef<MergedProduct>[] = useMemo(() => {
    const cols: ColumnDef<MergedProduct>[] = [
      {
        accessorKey: "ItemName",
        header: "Product",
        enableSorting: true,
        cell: (info) => (
          <span className="font-medium text-ink text-[13px] block max-w-[240px] truncate" title={info.getValue() as string}>
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
          return <span className={`text-[11px] font-medium px-2 py-1 rounded-md ${brandBadgeStyle(b)}`}>{b}</span>;
        },
      },
    ];

    for (const { key, urlKey, label } of COMPETITOR_COLS) {
      cols.push({
        accessorKey: key,
        header: label,
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          const allPrices = COMPETITOR_COLS.map((c) => row[c.key]).filter((p): p is number => p !== null && p > 0);
          const lowest = allPrices.length > 0 ? Math.min(...allPrices) : null;
          const highest = allPrices.length > 0 ? Math.max(...allPrices) : null;
          return <PriceCell price={row[key]} url={row[urlKey]} lowest={lowest} highest={highest} />;
        },
      });
    }

    cols.push({
      accessorKey: "lowestPrice",
      header: "Best Price",
      enableSorting: true,
      cell: (info) => (
        <span className="tnum font-semibold text-ink text-[13px]">{formatPrice(info.getValue() as number | null)}</span>
      ),
    });

    cols.push({
      accessorKey: "lowestPlatform",
      header: "Winner",
      enableSorting: true,
      cell: (info) => {
        const platform = info.getValue() as string | null;
        if (!platform) return <span className="text-gray-300">—</span>;
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100">
            <Trophy size={10} />
            {platform}
          </span>
        );
      },
    });

    cols.push({
      id: "spread",
      header: "Spread",
      enableSorting: true,
      accessorFn: (row) => {
        const prices = COMPETITOR_COLS.map((c) => row[c.key]).filter((p): p is number => p !== null && p > 0);
        return prices.length >= 2 ? Math.max(...prices) - Math.min(...prices) : 0;
      },
      cell: (info) => {
        const gap = info.getValue() as number;
        if (!gap) return <span className="text-gray-300">—</span>;
        return <span className="tnum text-xs font-medium text-amber-700">+{formatPrice(gap)}</span>;
      },
    });

    return cols;
  }, []);

  const table = useReactTable({
    data: filteredProducts,
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

  const totalRows = filteredProducts.length;
  const pageCount = table.getPageCount();

  return (
    <div className="bg-card border border-line rounded-2xl overflow-hidden shadow-card">
      <div className="px-6 pt-5 pb-4 flex items-center gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink tracking-tight">Price Comparison</h2>
          <p className="text-xs text-ink-muted mt-0.5">Live prices across {COMPETITOR_COLS.length} marketplaces</p>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-ink-muted tnum">{totalRows} products</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
        <div className="relative w-60">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
          <Input
            placeholder="Search products..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageIndex(0);
            }}
            aria-label="Search products"
          />
        </div>
        <Select
          value={brand}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setBrand(e.target.value);
            setPageIndex(0);
          }}
          className="w-36"
          aria-label="Filter by brand"
        >
          <option value="">All brands</option>
          {brands?.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Select>
        <Select
          value={competitor}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setCompetitor(e.target.value);
            setPageIndex(0);
          }}
          className="w-44"
          aria-label="Filter by competitor"
        >
          <option value="">All competitors</option>
          {COMPETITOR_COLS.map((c) => (
            <option key={c.key} value={c.label}>Listed on {c.label}</option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setStatus(e.target.value);
            setPageIndex(0);
          }}
          className="w-40"
          aria-label="Filter by availability"
        >
          <option value="">All availability</option>
          <option value="available">Available</option>
          <option value="missing">Missing Competitors</option>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportCsv(filteredProducts)} disabled={totalRows === 0}>
          <Download size={13} />
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={12} />
      ) : isError ? (
        <ErrorState title="Failed to load products" description="Unable to fetch price comparison data." onRetry={() => refetch()} />
      ) : totalRows === 0 ? (
        <EmptyState title="No products match your filters" description="Try adjusting your search or filters." />
      ) : (
        <>
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto border-t border-line">
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
                  return (
                    <tr key={row.id} className="group cursor-default">
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

          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-xs text-ink-muted tnum">
              Showing {pageIndex * 10 + 1}–{Math.min((pageIndex + 1) * 10, totalRows)} of {totalRows}
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
              {pageList(pageIndex, pageCount).map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="w-8 text-center text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => table.setPageIndex(p)}
                    aria-current={pageIndex === p ? "page" : undefined}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
                      pageIndex === p
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
    </div>
  );
}
