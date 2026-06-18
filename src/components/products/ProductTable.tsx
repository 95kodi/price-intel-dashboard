"use client";
import { useState } from "react";
import { Edit2, Trash2, Plus, Upload, Package, Search } from "lucide-react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/useQueries";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

const CATEGORIES = ["Smartphones", "Laptops", "TVs", "Audio", "Gaming", "Tablets", "Monitors", "Appliances"];

const emptyForm = {
  name: "",
  brand: "",
  category: "Smartphones",
  ourPrice: 0,
  sku: "",
  status: "active" as "active" | "inactive",
};

export function ProductTable() {
  const { data: products, isLoading, isError, refetch } = useProducts();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const filtered = (products ?? []).filter(
    (p) => (p.name || p.productName || "").toLowerCase().includes(search.toLowerCase()) || (p.brand || "").toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const pageCount = Math.ceil(filtered.length / pageSize) || 1;

  function openAddModal() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditing(product);
    setForm({
      name: product.name || product.productName || "",
      brand: product.brand,
      category: product.category,
      ourPrice: product.ourPrice || product.currentPrice || product.price || 0,
      sku: product.sku,
      status: product.status,
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
    setModalOpen(false);
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
          <Input placeholder="Search products..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm">
          <Upload size={13} />
          Bulk Upload CSV
        </Button>
        <Button variant="primary" size="sm" onClick={openAddModal}>
          <Plus size={14} />
          Add Product
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : !filtered.length ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description={search ? "Try a different search term." : "Add your first product to start tracking competitor prices."}
          action={!search ? { label: "Add Product", onClick: openAddModal } : undefined}
        />
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {["Product Name", "Brand", "Category", "SKU", "Our Price", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-medium text-gray-900">{p.name || p.productName}</td>
                  <td className="px-3 py-2.5">
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md">{p.brand}</span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{p.category}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{p.sku}</td>
                  <td className="px-3 py-2.5 font-medium">{formatPrice(p.ourPrice || p.currentPrice || p.price || 0)}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditModal(p)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" aria-label={`Edit ${p.name}`}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-md hover:bg-red-50 text-red-500" aria-label={`Delete ${p.name}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit product" : "Add product"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Product name" placeholder="iPhone 16 Pro Max" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Brand" placeholder="Apple" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required />
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="SKU" placeholder="APL-IP16PM-512" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            <Input
              label="Our price (₹)"
              type="number"
              placeholder="109900"
              value={form.ourPrice || ""}
              onChange={(e) => setForm({ ...form, ourPrice: Number(e.target.value) })}
              required
            />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={createMutation.isPending || updateMutation.isPending}>
              {editing ? "Save changes" : "Add product"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete product">
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will remove all price tracking history for this product.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => {
              if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              setDeleteTarget(null);
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
