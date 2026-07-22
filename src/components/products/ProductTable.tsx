"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Edit2, Trash2, Package, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { EditProductDialog } from "@/components/products/EditProductDialog";
import { DeleteProductDialog } from "@/components/products/DeleteProductDialog";
import type { CatalogProduct } from "@/services/productService";
import { getProducts, getProductsPage, invalidateProductsCache } from "@/services/productService";

type StatusFilter = "all" | "active" | "inactive";

const PAGE_SIZES = [10, 25, 50, 100];

// Always first/last page, a window around the current one, ellipses for gaps.
function getPageItems(current: number, count: number): (number | "...")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  const pages = new Set([0, count - 1, current]);
  for (const p of [current - 1, current + 1]) {
    if (p > 0 && p < count - 1) pages.add(p);
  }
  if (current <= 2) [1, 2, 3].forEach((p) => pages.add(p));
  if (current >= count - 3) [count - 4, count - 3, count - 2].forEach((p) => pages.add(p));

  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | "...")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push("...");
    items.push(p);
  });
  return items;
}

export function ProductTable() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [deleting, setDeleting] = useState<CatalogProduct | null>(null);
  const { toast } = useToast();

  // The API has no search/status params, so filtering means walking the whole
  // catalog client-side; plain browsing stays a single request per page.
  const isFiltering = search.trim() !== "" || statusFilter !== "all";
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);

    const load = async () => {
      if (isFiltering) {
        const all = await getProducts();
        const term = search.trim().toLowerCase();
        const matches = all.filter((p) => {
          if (statusFilter === "active" && !p.IsActive) return false;
          if (statusFilter === "inactive" && p.IsActive) return false;
          if (!term) return true;
          return (
            p.ItemName.toLowerCase().includes(term) ||
            p.Brand.toLowerCase().includes(term) ||
            p.ItemCode.toLowerCase().includes(term)
          );
        });
        return {
          rows: matches.slice(page * pageSize, (page + 1) * pageSize),
          total: matches.length,
        };
      }
      const result = await getProductsPage(page + 1, pageSize);
      return { rows: result.data ?? [], total: result.total_records ?? 0 };
    };

    load()
      .then(({ rows, total }) => {
        if (cancelled) return;
        setProducts(rows);
        setTotal(total);
      })
      .catch(() => {
        if (!cancelled) setIsError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, statusFilter, isFiltering, reloadKey]);

  const fetchProducts = () => {
    invalidateProductsCache();
    setReloadKey((k) => k + 1);
  };

  const pageCount = Math.ceil(total / pageSize) || 1;

  function handleEditSuccess() {
    toast("Product updated successfully");
    fetchProducts();
  }

  function handleDeleteSuccess() {
    toast("Product deactivated successfully");
    fetchProducts();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3.5 border-b border-gray-200 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900 flex-1">All Products</h3>
        <span className="text-xs text-gray-400">{total.toLocaleString()} products</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-200">
        <div className="relative w-56">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search products..."
            className="pl-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(0); }}
          className="w-28"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <Select
          value={String(pageSize)}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
          className="w-28"
          aria-label="Rows per page"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 size={18} className="animate-spin" />
          <span>Loading products...</span>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <span>Failed to load products</span>
          <Button variant="outline" size="sm" onClick={fetchProducts}>Retry</Button>
        </div>
      ) : !products.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
          <Package size={40} className="text-gray-300" />
          <span className="text-sm">No products found</span>
          {(search || statusFilter !== "all") && <span className="text-xs">Try adjusting your search or filters.</span>}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 sticky top-0">
                  {["Product Name", "Brand", "Category", "SKU", "Price", "Created Date", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wide text-gray-500 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.ProductID} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <Link
                        href={`/products/${p.ProductID}`}
                        className="font-medium text-gray-900 hover:text-blue-600 hover:underline truncate block"
                        title={p.ItemName}
                      >
                        {p.ItemName}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md">{p.Brand}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{p.Category}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{p.ItemCode}</td>
                    <td className="px-3 py-2.5 text-gray-900 whitespace-nowrap">
                      {p.CurrentPrice != null
                        ? new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format(p.CurrentPrice)
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(p.CreatedOn).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5">
                      {p.IsActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditing(p)}
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                          aria-label={`Edit ${p.ItemName}`}
                          title={!p.IsActive ? "Inactive product" : undefined}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleting(p)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                          aria-label={`Delete ${p.ItemName}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-xs text-gray-500">
              Showing {(page * pageSize + 1).toLocaleString()}–
              {Math.min((page + 1) * pageSize, total).toLocaleString()} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label="Previous page"
                className="w-7 h-7 flex items-center justify-center rounded-md text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={14} />
              </button>
              {getPageItems(page, pageCount).map((item, i) =>
                item === "..." ? (
                  <span key={`gap-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    aria-current={page === item ? "page" : undefined}
                    className={`w-7 h-7 flex items-center justify-center rounded-md text-xs border ${
                      page === item ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item + 1}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                aria-label="Next page"
                className="w-7 h-7 flex items-center justify-center rounded-md text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      <EditProductDialog
        open={!!editing}
        product={editing}
        onClose={() => setEditing(null)}
        onSuccess={handleEditSuccess}
      />

      <DeleteProductDialog
        open={!!deleting}
        product={deleting}
        onClose={() => setDeleting(null)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
