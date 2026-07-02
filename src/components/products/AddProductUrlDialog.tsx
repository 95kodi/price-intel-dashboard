"use client";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { saveProductPlatformUrl } from "@/services/productPlatformUrlService";
import { getCompetitors, type ApiCompetitor } from "@/services/competitorService";
import { useToast } from "@/components/ui/Toast";

interface AddProductUrlDialogProps {
  open: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
  existingPlatformIds: number[];
  onSuccess: () => void;
}

export function AddProductUrlDialog({
  open,
  onClose,
  productId,
  productName,
  existingPlatformIds,
  onSuccess,
}: AddProductUrlDialogProps) {
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState<ApiCompetitor[]>([]);
  const [platformId, setPlatformId] = useState<number>(0);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      getCompetitors()
        .then(setPlatforms)
        .catch(() => toast("Failed to load platforms", "error"));
    }
  }, [open]);

  function validateUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  async function handleSave() {
    if (!platformId) {
      setError("Please select a platform");
      return;
    }

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a product URL");
      return;
    }

    if (!validateUrl(trimmed)) {
      setError("Please enter a valid URL");
      return;
    }

    if (existingPlatformIds.includes(platformId)) {
      toast("A URL already exists for this platform. Please edit the existing URL instead.", "error");
      return;
    }

    setError("");
    setSaving(true);
    try {
      await saveProductPlatformUrl({
        ProductPlatformID: 0,
        ProductID: productId,
        PlatformID: platformId,
        ProductURL: trimmed,
        IsActive: 1,
      });
      toast("Product URL added successfully");
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add product URL";
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Product URL">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 -mt-3">
          Map this product to a competitor product URL.
        </p>

        <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Product ID</p>
            <p className="font-medium text-gray-900 mt-0.5">{productId}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Product Name</p>
            <p className="font-medium text-gray-900 mt-0.5">{productName}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Select Platform</label>
          <select
            value={platformId}
            onChange={(e) => {
              setPlatformId(Number(e.target.value));
              if (error) setError("");
            }}
            disabled={saving}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
          >
            <option value={0}>Select a platform...</option>
            {platforms.map((p) => (
              <option key={p.PlatformID} value={p.PlatformID}>
                {p.PlatformName}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Product URL"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError("");
          }}
          placeholder="https://..."
          disabled={saving}
          error={error}
        />

        {url.trim() && !error && (
          <a
            href={url.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <ExternalLink size={12} />
            Open URL
          </a>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Adding...
              </>
            ) : "Add URL"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
