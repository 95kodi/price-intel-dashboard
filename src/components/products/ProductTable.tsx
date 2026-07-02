"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Edit2, Trash2, Package, Search, Loader2, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { AddProductDialog } from "@/components/products/AddProductDialog";
import { EditProductDialog } from "@/components/products/EditProductDialog";
import { DeleteProductDialog } from "@/components/products/DeleteProductDialog";
import type { CatalogProduct } from "@/services/productService";
import { getProducts } from "@/services/productService";

type StatusFilter = "all" | "active" | "inactive";

export function ProductTable() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [deleting, setDeleting] = useState<CatalogProduct | null>(null);
  const { toast } = useToast();
  const pageSize = 10;

  const fetchProducts = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const sorted = [...products].sort(
    (a, b) => new Date(b.CreatedOn).getTime() - new Date(a.CreatedOn).getTime()
  );

  const searched = sorted.filter(
    (p) =>
      p.ItemName.toLowerCase().includes(search.toLowerCase()) ||
      p.Brand.toLowerCase().includes(search.toLowerCase()) ||
      p.ItemCode.toLowerCase().includes(search.toLowerCase())
  );

  const filtered = searched.filter((p) => {
    if (statusFilter === "active") return p.IsActive;
    if (statusFilter === "inactive") return !p.IsActive;
    return true;
  });

  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const pageCount = Math.ceil(filtered.length / pageSize) || 1;

  function handleAddSuccess() {
    toast("Product created successfully");
    fetchProducts();
  }

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
        <span className="text-xs text-gray-400">{filtered.length} products</span>
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
        <div className="flex-1" />
        <Button variant="outline" size="sm">
          <Upload size={13} />
          Bulk Upload CSV
        </Button>
        <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={14} />
          Add Product
        </Button>
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
      ) : !filtered.length ? (
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
                  {["Product Name", "Brand", "Category", "SKU", "Created Date", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wide text-gray-500 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => (
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
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-7 h-7 flex items-center justify-center rounded-md text-xs border ${
                    page === i ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <AddProductDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={handleAddSuccess}
      />

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
