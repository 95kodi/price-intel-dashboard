"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Pencil, Plus, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import { getProductPlatformUrls, type ProductPlatformUrlResponse } from "@/services/productPlatformUrlService";
import { getPlatformPriceHistory, type PlatformPriceEntry } from "@/services/platformPriceHistoryService";
import { getProductById, type CatalogProduct } from "@/services/productService";
import { useToast } from "@/components/ui/Toast";
import { EditProductUrlDialog } from "@/components/products/EditProductUrlDialog";
import { AddProductUrlDialog } from "@/components/products/AddProductUrlDialog";

interface PlatformSummary {
  productPlatformId: number;
  platformId: number;
  name: string;
  url: string;
  price: number | null;
}

export default function ProductDetailsPage() {
  const params = useParams();
  const productId = Number(params.id);
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [urlsData, setUrlsData] = useState<ProductPlatformUrlResponse | null>(null);
  const [priceEntries, setPriceEntries] = useState<PlatformPriceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [editTarget, setEditTarget] = useState<PlatformSummary | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [updatingPrices, setUpdatingPrices] = useState<Set<number>>(new Set());
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    if (!productId) return;
    setIsLoading(true);
    setIsError(false);
    try {
      const [productResult, urlResult, priceResult] = await Promise.all([
        getProductById(productId),
        getProductPlatformUrls(productId),
        getPlatformPriceHistory(productId),
      ]);
      setProduct(productResult);
      setUrlsData(urlResult);
      setPriceEntries(priceResult ?? []);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePrice = async (p: PlatformSummary) => {
    if (!p.url) return;
    setUpdatingPrices((prev) => new Set(prev).add(p.productPlatformId));
    try {
      const payload = {
        url: p.url,
        platform: p.name,
        productPlatformId: p.productPlatformId,
      };
      console.log("Scrape request:", payload);
      const res = await fetch("/api/scrape-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Update failed");
      toast(`Price updated: ${formatPrice(data.price)}`);
      const priceResult = await getPlatformPriceHistory(productId);
      setPriceEntries(priceResult ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update price";
      toast(msg, "error");
    } finally {
      setUpdatingPrices((prev) => {
        const next = new Set(prev);
        next.delete(p.productPlatformId);
        return next;
      });
    }
  };

  const refreshAllPrices = async () => {
    setIsRefreshingAll(true);
    try {
      for (const p of sorted) {
        if (!p.url) continue;
        setUpdatingPrices((prev) => new Set(prev).add(p.productPlatformId));
        try {
          const res = await fetch("/api/scrape-price", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: p.url,
              platform: p.name,
              productPlatformId: p.productPlatformId,
            }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || "Update failed");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed";
          toast(`${p.name}: ${msg}`, "error");
        } finally {
          setUpdatingPrices((prev) => {
            const next = new Set(prev);
            next.delete(p.productPlatformId);
            return next;
          });
        }
      }
      const priceResult = await getPlatformPriceHistory(productId);
      setPriceEntries(priceResult ?? []);
      toast("Prices updated successfully");
    } finally {
      setIsRefreshingAll(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [productId]);

  const platforms: PlatformSummary[] = urlsData
    ? (urlsData.Platforms ?? []).map((p) => {
        const priceEntry = priceEntries.find(
          (e) => e.ProductPlatformID === p.ProductPlatformID
        );
        return {
          productPlatformId: p.ProductPlatformID,
          platformId: p.PlatformID,
          name: p.PlatformName,
          url: p.ProductURL,
          price: priceEntry?.Price ?? null,
        };
      })
    : [];

  const sorted = [...platforms].sort(
    (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)
  );

  const lowestPrice = sorted.length > 0 ? sorted[0].price : null;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse bg-gray-200 rounded-xl h-24" />
        <div className="animate-pulse bg-gray-200 rounded-xl h-48" />
        <div className="animate-pulse bg-gray-200 rounded-xl h-32" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="p-6">
        <Link href="/products" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to Products
        </Link>
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <p className="text-sm text-gray-500">Product not found.</p>
              <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/products" className="hover:text-gray-600">Product Catalog</Link>
        <span>/</span>
        <span className="text-gray-900">Product Details</span>
        <div className="flex-1" />
        <Link href="/products" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Products
        </Link>
        <Button variant="primary" size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus size={14} /> Add Product URL
        </Button>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500">Product ID</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{product.ProductID}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Item Name</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{product.ItemName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Brand</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{product.Brand}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Model Name</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{product.ModelName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {sorted.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Price Comparison</CardTitle>
              <Button variant="outline" size="sm" onClick={refreshAllPrices} disabled={isRefreshingAll}>
                <RefreshCw size={14} className={isRefreshingAll ? "animate-spin" : ""} />
                Refresh All Prices
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wide text-gray-500 font-medium">Platform</th>
                    <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wide text-gray-500 font-medium">Current Price</th>
                    <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wide text-gray-500 font-medium">Product Link</th>
                    <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wide text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p) => (
                    <tr key={p.productPlatformId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {p.name}
                          {p.price === lowestPrice && (
                            <Badge variant="success">Best Price</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {p.price !== null ? formatPrice(p.price) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.url ? (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"
                          >
                            Open <ExternalLink size={12} />
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => updatePrice(p)}
                            disabled={!p.url || updatingPrices.has(p.productPlatformId)}
                            title={!p.url ? "No URL configured for this platform" : "Update Price"}
                            className="inline-flex items-center gap-1 text-green-600 hover:underline text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingPrices.has(p.productPlatformId) ? (
                              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <RefreshCw size={12} />
                            )}
                            Update Price
                          </button>
                          <button
                            onClick={() => setEditTarget(p)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"
                          >
                            <Pencil size={12} />
                            Edit URL
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <p className="text-sm text-gray-500">No product URLs have been mapped yet.</p>
              <Button variant="primary" size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus size={14} /> Add Product URL
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sorted.map((p) => (
          <Card key={p.productPlatformId}>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  {p.name}
                  {p.price === lowestPrice && (
                    <Badge variant="success">Best Price</Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {p.url && (
                <div className="flex items-center gap-4 flex-wrap">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium"
                  >
                    <ExternalLink size={14} />
                    Open Product Page
                  </a>
                  <button
                    onClick={() => updatePrice(p)}
                    disabled={updatingPrices.has(p.productPlatformId)}
                    className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:underline font-medium disabled:opacity-50"
                  >
                    {updatingPrices.has(p.productPlatformId) ? (
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    Update Price
                  </button>
                  <button
                    onClick={() => setEditTarget(p)}
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium"
                  >
                    <Pencil size={14} />
                    Edit URL
                  </button>
                </div>
              )}

              {p.price !== null ? (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Current Price</p>
                  <p className="text-base font-bold text-gray-900">{formatPrice(p.price)}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No price data available.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {editTarget && (
        <EditProductUrlDialog
          open={editTarget !== null}
          onClose={() => setEditTarget(null)}
          productPlatformId={editTarget.productPlatformId}
          productId={productId}
          platformId={editTarget.platformId}
          platformName={editTarget.name}
          productUrl={editTarget.url}
          onSuccess={() => {
            setEditTarget(null);
            fetchData();
          }}
        />
      )}
      <AddProductUrlDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        productId={productId}
        productName={product.ItemName}
        existingPlatformIds={platforms.map((p) => p.platformId)}
        onSuccess={() => {
          setShowAddDialog(false);
          fetchData();
        }}
      />
    </div>
  );
}
