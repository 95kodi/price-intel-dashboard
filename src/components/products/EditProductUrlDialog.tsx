"use client";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { saveProductPlatformUrl } from "@/services/productPlatformUrlService";
import { useToast } from "@/components/ui/Toast";

interface EditProductUrlDialogProps {
  open: boolean;
  onClose: () => void;
  productPlatformId: number;
  productId: number;
  platformId: number;
  platformName: string;
  productUrl: string;
  onSuccess: () => void;
}

export function EditProductUrlDialog({
  open,
  onClose,
  productPlatformId,
  productId,
  platformId,
  platformName,
  productUrl,
  onSuccess,
}: EditProductUrlDialogProps) {
  const { toast } = useToast();
  const [url, setUrl] = useState(productUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function validateUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  async function handleSave() {
    const trimmed = url.trim();
    if (!validateUrl(trimmed)) {
      setError("Please enter a valid URL");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await saveProductPlatformUrl({
        ProductPlatformID: productPlatformId,
        ProductID: productId,
        PlatformID: platformId,
        ProductURL: trimmed,
        IsActive: 1,
      });
      toast("Product URL updated successfully");
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save product URL";
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Update Product URL">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 -mt-3">
          Update the competitor product URL for this platform.
        </p>

        <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Platform Name</p>
            <p className="font-medium text-gray-900 mt-0.5">{platformName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Product ID</p>
            <p className="font-medium text-gray-900 mt-0.5">{productId}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Platform ID</p>
            <p className="font-medium text-gray-900 mt-0.5">{platformId}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Product Platform ID</p>
            <p className="font-medium text-gray-900 mt-0.5">{productPlatformId}</p>
          </div>
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
                Updating...
              </>
            ) : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
