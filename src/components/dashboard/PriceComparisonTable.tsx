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
import { Search, RefreshCw, ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
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

function PriceCell({ price, url, isLowest, isHighest }: { price: number | null; url: string | null; isLowest: boolean; isHighest: boolean }) {
  if (price === null || price === undefined) {
    return <span className="text-gray-300">—</span>;
  }
  let bgClass = "";
  if (isLowest) bgClass = "bg-green-50";
  else if (isHighest) bgClass = "bg-red-50";

  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block px-2 py-1 rounded ${bgClass} text-green-700 font-medium hover:underline ${!url ? "pointer-events-none" : ""}`}
    >
      {formatPrice(price)}
    </a>
  );
}

export function PriceComparisonTable() {
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pageIndex, setPageIndex] = useState(0);

  const { data: brands } = useBrands();
  const { data: products, isLoading, isError, refetch, isFetching } = useProductsWithPrices({
    search: search || undefined,
    brand: brand || undefined,
    status: status || undefined,
  });

  const columns: ColumnDef<MergedProduct>[] = useMemo(() => {
    const cols: ColumnDef<MergedProduct>[] = [
      {
        accessorKey: "ItemName",
        header: "Product",
        enableSorting: true,
        cell: (info) => <span className="font-medium text-gray-900">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "Brand",
        header: "Brand",
        enableSorting: true,
        cell: (info) => <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md">{info.getValue() as string}</span>,
      },
    ];

    for (const { key, urlKey, label } of COMPETITOR_COLS) {
      cols.push({
        accessorKey: key,
        header: label,
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          const price = row[key];
          const url = row[urlKey];
          const allPrices = COMPETITOR_COLS.map((c) => row[c.key]).filter((p): p is number => p !== null && p > 0);
          const isLowest = price !== null && price > 0 && price === Math.min(...allPrices);
          const isHighest = price !== null && price > 0 && price === Math.max(...allPrices);
          return <PriceCell price={price} url={url} isLowest={isLowest} isHighest={isHighest} />;
        },
      });
    }

    cols.push({
      accessorKey: "lowestPrice",
      header: "Lowest Price",
      enableSorting: true,
      cell: (info) => <span className="font-semibold text-gray-900">{formatPrice(info.getValue() as number | null)}</span>,
    });

    cols.push({
      accessorKey: "lowestPlatform",
      header: "Lowest Platform",
      enableSorting: true,
      cell: (info) => {
        const platform = info.getValue() as string | null;
        if (!platform) return <span className="text-gray-400">—</span>;
        return (
          <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-green-100 text-green-700">
            {platform}
          </span>
        );
      },
    });

    cols.push({
      id: "lastUpdated",
      header: "Last Updated",
      enableSorting: true,
      cell: () => <span className="text-xs text-gray-500">Today</span>,
    });

    return cols;
  }, []);

  const table = useReactTable({
    data: products ?? [],
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

  const totalRows = products?.length ?? 0;
  const pageCount = table.getPageCount();

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
      <div className="px-4 py-3.5 border-b border-gray-200 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900 flex-1">Price Comparison</h3>
        <span className="text-xs text-gray-400">{totalRows} products</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-200">
        <div className="relative w-56">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search products..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={brand} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBrand(e.target.value)} className="w-36">
          <option value="">All brands</option>
          {brands?.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)} className="w-36">
          <option value="">All</option>
          <option value="available">Available</option>
          <option value="missing">Missing Competitors</option>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          Refresh
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="bg-gray-50">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wide text-gray-500 font-medium whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none"
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === "asc" ? (
                            <ChevronUp size={12} />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ChevronDown size={12} />
                          ) : (
                            <ArrowUpDown size={11} className="text-gray-300" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-xs text-gray-500">
              Showing {pageIndex * 10 + 1}–{Math.min((pageIndex + 1) * 10, totalRows)} of {totalRows}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => table.setPageIndex(i)}
                  className={`w-7 h-7 flex items-center justify-center rounded-md text-xs border ${
                    pageIndex === i ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
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
