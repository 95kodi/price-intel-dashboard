"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";
import { createProduct, type CatalogProduct } from "@/services/productService";

interface DeleteProductDialogProps {
  open: boolean;
  product: CatalogProduct | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteProductDialog({ open, product, onClose, onSuccess }: DeleteProductDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDeactivate() {
    if (!product) return;
    setDeleting(true);
    try {
      await createProduct({
        ProductID: product.ProductID,
        ItemCode: product.ItemCode,
        Brand: product.Brand,
        ModelName: product.ModelName,
        RAM: product.RAM,
        StorageSize: product.StorageSize,
        ColorName: product.ColorName,
        VariantName: product.VariantName,
        ItemName: product.ItemName,
        Category: product.Category,
        SubCategory: product.SubCategory,
        IsActive: false,
      });
      onSuccess();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Deactivate Product" className="max-w-md">
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <p className="text-sm text-gray-600 mb-1">
          Are you sure you want to deactivate this product?
        </p>
        <p className="text-xs text-gray-400 mb-6">
          The product will no longer appear as Active in the catalog.
        </p>
        <div className="flex gap-2 w-full justify-center">
          <Button type="button" variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button type="button" variant="danger" loading={deleting} onClick={handleDeactivate}>Deactivate</Button>
        </div>
      </div>
    </Modal>
  );
}
