"use client";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { ProductPayload } from "@/services/productService";

export interface ProductFormData {
  ProductID?: number;
  ItemCode: string;
  Brand: string;
  ModelName: string;
  RAM: string;
  StorageSize: string;
  ColorName: string;
  VariantName: string;
  Category: string;
  SubCategory: string;
  IsActive: boolean;
}

export type ProductFormErrors = Partial<Record<keyof ProductFormData | "ItemName", string>>;

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  saving: boolean;
  submitLabel: string;
  onSubmit: (payload: ProductPayload) => Promise<void>;
  onCancel: () => void;
}

const CATEGORIES = [
  "Smart Phones",
  "Laptops",
  "Tablets",
  "TVs",
  "Audio",
  "Gaming",
  "Monitors",
  "Appliances",
  "Wearables",
  "Accessories",
];

const defaultForm: ProductFormData = {
  ItemCode: "",
  Brand: "",
  ModelName: "",
  RAM: "",
  StorageSize: "",
  ColorName: "",
  VariantName: "",
  Category: "Smart Phones",
  SubCategory: "",
  IsActive: true,
};

export function ProductForm({ initialData, saving, submitLabel, onSubmit, onCancel }: ProductFormProps) {
  const [form, setForm] = useState<ProductFormData>(() => ({ ...defaultForm, ...initialData }));
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const itemName = [form.Brand, form.ModelName, form.RAM, form.StorageSize, form.ColorName]
    .filter(Boolean)
    .join(" ");

  function validate(): boolean {
    const errs: ProductFormErrors = {};
    if (!form.ItemCode.trim()) errs.ItemCode = "Item Code is required";
    if (!form.Brand.trim()) errs.Brand = "Brand is required";
    if (!form.ModelName.trim()) errs.ModelName = "Model Name is required";
    if (!form.Category.trim()) errs.Category = "Category is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function set<K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const payload: ProductPayload = {
      ProductID: initialData?.ProductID ?? 0,
      ItemCode: form.ItemCode.trim(),
      Brand: form.Brand.trim(),
      ModelName: form.ModelName.trim(),
      RAM: form.RAM.trim(),
      StorageSize: form.StorageSize.trim(),
      ColorName: form.ColorName.trim(),
      VariantName: form.VariantName.trim(),
      ItemName: itemName,
      Category: form.Category,
      SubCategory: form.SubCategory.trim(),
      IsActive: form.IsActive,
    };
    await onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Basic Information</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            ref={firstInputRef}
            label="Item Code"
            placeholder="e.g. MOB-VIVO-Y400"
            value={form.ItemCode}
            onChange={(e) => set("ItemCode", e.target.value)}
            error={errors.ItemCode}
            required
          />
          <Input
            label="Brand"
            placeholder="e.g. Vivo"
            value={form.Brand}
            onChange={(e) => set("Brand", e.target.value)}
            error={errors.Brand}
            required
          />
          <Input
            label="Model Name"
            placeholder="e.g. Y400 Pro"
            value={form.ModelName}
            onChange={(e) => set("ModelName", e.target.value)}
            error={errors.ModelName}
            required
          />
          <Input
            label="RAM"
            placeholder="e.g. 8GB"
            value={form.RAM}
            onChange={(e) => set("RAM", e.target.value)}
          />
          <Input
            label="Storage Size"
            placeholder="e.g. 256GB"
            value={form.StorageSize}
            onChange={(e) => set("StorageSize", e.target.value)}
          />
          <Input
            label="Color"
            placeholder="e.g. Nebula Purple"
            value={form.ColorName}
            onChange={(e) => set("ColorName", e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              label="Variant Name"
              placeholder="e.g. Standard Edition"
              value={form.VariantName}
              onChange={(e) => set("VariantName", e.target.value)}
            />
          </div>
        </div>
      </div>

      {itemName && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Auto-generated Item Name</h4>
          <Input label="Item Name" value={itemName} readOnly className="bg-gray-50 text-gray-700" />
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Category Information</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Category" value={form.Category} onChange={(e) => set("Category", e.target.value)} error={errors.Category}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <Input
            label="Sub Category"
            placeholder="e.g. 5G"
            value={form.SubCategory}
            onChange={(e) => set("SubCategory", e.target.value)}
          />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Status</h4>
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={form.IsActive}
            onClick={() => set("IsActive", !form.IsActive)}
            className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${form.IsActive ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${form.IsActive ? "translate-x-5" : ""}`} />
          </button>
          <span className="text-sm text-gray-700">Active Product</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="primary" loading={saving}>{submitLabel}</Button>
      </div>

      {errors.ItemName && !errors.ItemName.includes("required") && (
        <p className="text-xs text-red-600 text-right">{errors.ItemName}</p>
      )}
    </form>
  );
}
