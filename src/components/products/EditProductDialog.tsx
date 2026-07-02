"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ProductForm } from "@/components/products/ProductForm";
import { createProduct, type CatalogProduct } from "@/services/productService";

interface EditProductDialogProps {
  open: boolean;
  product: CatalogProduct | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditProductDialog({ open, product, onClose, onSuccess }: EditProductDialogProps) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(payload: Parameters<typeof createProduct>[0]) {
    setSaving(true);
    try {
      await createProduct(payload);
      onSuccess();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Product" className="max-w-[700px]">
      <p className="text-sm text-gray-500 mb-5 -mt-3">Update product information.</p>
      {product && (
        <ProductForm
          initialData={{
            ProductID: product.ProductID,
            ItemCode: product.ItemCode,
            Brand: product.Brand,
            ModelName: product.ModelName,
            RAM: product.RAM,
            StorageSize: product.StorageSize,
            ColorName: product.ColorName,
            VariantName: product.VariantName,
            Category: product.Category,
            SubCategory: product.SubCategory,
            IsActive: product.IsActive,
          }}
          saving={saving}
          submitLabel="Update Product"
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
}
