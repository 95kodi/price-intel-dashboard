"use client";
import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Search, RefreshCw, ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { useProductsWithPrices, useBrands } from "@/hooks/useQueries";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { formatPrice, formatPriceGap, getCompetitorPriceColor } from "@/lib/utils";
import type { ProductWithPrices } from "@/types";

const columnHelper = createColumnHelper<ProductWithPrices>();

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

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Product Name",
        cell: (info) => <span className="font-medium text-gray-900">{info.getValue()}</span>,
      }),
      columnHelper.accessor("brand", {
        header: "Brand",
        cell: (info) => <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md">{info.getValue()}</span>,
      }),
      columnHelper.accessor("amazonPrice", {
        header: "Amazon",
        cell: (info) => {
          const price = info.getValue();
          const url = info.row.original.amazonUrl;
          if (price != null && url) {
            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${getCompetitorPriceColor(price, info.row.original.ourPrice)} hover:underline cursor-pointer`}
              >
                {formatPrice(price)}
              </a>
            );
          }
          return <span className="text-gray-400">—</span>;
        },
      }),
      columnHelper.accessor("flipkartPrice", {
        header: "Flipkart",
        cell: (info) => {
          const price = info.getValue();
          const url = info.row.original.flipkartUrl;
          if (price != null && url) {
            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${getCompetitorPriceColor(price, info.row.original.ourPrice)} hover:underline cursor-pointer`}
              >
                {formatPrice(price)}
              </a>
            );
          }
          return <span className="text-gray-400">—</span>;
        },
      }),
      columnHelper.accessor("poorvikaPrice", {
        header: "Poorvika",
        cell: (info) => {
          const price = info.getValue();
          const url = info.row.original.poorvikaUrl;
          if (price != null && url) {
            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${getCompetitorPriceColor(price, info.row.original.ourPrice)} hover:underline cursor-pointer`}
              >
                {formatPrice(price)}
              </a>
            );
          }
          return <span className="text-gray-400">—</span>;
        },
      }),
      columnHelper.accessor("sangeethaPrice", {
        header: "Sangeetha (Our Price)",
        cell: (info) => {
          const price = info.getValue();
          const url = info.row.original.sangeethaUrl;
          if (price != null && url) {
            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                {formatPrice(price)}
              </a>
            );
          }
          return <span className="text-gray-400">—</span>;
        },
      }),
      columnHelper.accessor("lowestPrice", {
        header: "Lowest Price",
        cell: (info) => <span className="font-semibold text-gray-900">{formatPrice(info.getValue())}</span>,
      }),
      columnHelper.accessor("lowestPlatform", {
        header: "Lowest Platform",
        cell: (info) => {
          const platform = info.getValue();
          if (!platform) return <span className="text-gray-400">—</span>;
          const isUs = platform === "Sangeetha";
          return (
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${isUs ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {platform}
            </span>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        id: "lastUpdated",
        header: "Last Updated",
        cell: () => <span className="text-xs text-gray-500">Today 11:42 AM</span>,
      }),
    ],
    []
  );


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
          <Input
            placeholder="Search products..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={brand} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBrand(e.target.value)} className="w-36">
          <option value="">All brands</option>
          {brands?.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)} className="w-36">
          <option value="">All status</option>
          <option value="winning">Winning</option>
          <option value="losing">Losing</option>
          <option value="matching">Matching</option>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={9} />
      ) : isError ? (
        <ErrorState
          title="Failed to load products"
          description="Unable to fetch price comparison data. Please check your connection and try again."
          onRetry={() => refetch()}
        />
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
