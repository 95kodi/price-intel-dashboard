"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ProductForm } from "@/components/products/ProductForm";
import { createProduct } from "@/services/productService";

interface AddProductDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddProductDialog({ open, onClose, onSuccess }: AddProductDialogProps) {
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
    <Modal open={open} onClose={onClose} title="Add New Product" className="max-w-[700px]">
      <p className="text-sm text-gray-500 mb-5 -mt-3">Enter product information to add it to the catalog.</p>
      <ProductForm
        saving={saving}
        submitLabel="Save Product"
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}
