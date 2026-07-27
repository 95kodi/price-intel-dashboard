"use client";
import Link from "next/link";
import {
  ChevronRight,
  RefreshCw,
  Pencil,
  Plus,
  Trash2,
  Package,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate, formatDateTime } from "@/lib/utils";
import { POSITION_BADGE, POSITION_DOT, POSITION_PILL, rupees } from "@/lib/viz";
import type { Position } from "@/lib/metrics";
import type { CatalogProduct } from "@/services/productService";

/**
 * The API carries no product imagery, so the hero mark is a brand monogram
 * rather than a stock photo — it anchors the page without implying a picture
 * we do not have.
 */
function ProductMark({ product }: { product: CatalogProduct }) {
  const source = product.Brand?.trim() || product.ItemName?.trim() || "";
  const initials = source.slice(0, 2).toUpperCase();
  return (
    <div
      aria-hidden
      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50 text-primary flex items-center justify-center shrink-0 text-xl font-semibold tracking-tight"
    >
      {initials || <Package size={24} />}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="text-xs font-medium text-ink mt-0.5 truncate">{value}</dd>
    </div>
  );
}

interface ProductHeroProps {
  product: CatalogProduct;
  position: Position;
  refreshing: boolean;
  onRefresh: () => void;
  onEdit: () => void;
  onAddUrl: () => void;
  onDelete: () => void;
}

export function ProductHero({
  product,
  position,
  refreshing,
  onRefresh,
  onEdit,
  onAddUrl,
  onDelete,
}: ProductHeroProps) {
  return (
    <div className="bg-card/90 backdrop-blur-sm border-b border-line sticky top-0 z-20">
      <div className="px-5 sm:px-8 pt-4 pb-5 max-w-[1600px] mx-auto">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-ink-muted mb-3">
          <Link href="/products" className="hover:text-ink transition-colors">
            Product Catalog
          </Link>
          <ChevronRight size={12} />
          <span className="text-ink truncate">{product.ItemName?.trim()}</span>
        </nav>

        {/* Narrow screens stack the identity above the price; from sm up the
            two sit side by side with the price against the right edge. */}
        <div className="flex flex-wrap items-start gap-x-5 gap-y-4">
          <div className="flex items-start gap-4 min-w-0 basis-full sm:basis-0 sm:flex-1">
            <ProductMark product={product} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight">
                  {product.ItemName?.trim() || "Untitled product"}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset ${POSITION_PILL[position]}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${POSITION_DOT[position]}`} />
                  {POSITION_BADGE[position]}
                </span>
                {!product.IsActive && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset bg-gray-50 text-gray-500 ring-gray-200">
                    Inactive
                  </span>
                )}
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 mt-4 max-w-2xl">
                <Fact label="Brand" value={product.Brand || "—"} />
                <Fact label="SKU" value={product.ItemCode || `#${product.ProductID}`} />
                <Fact label="Category" value={product.Category || "—"} />
                <Fact
                  label="Price updated"
                  value={product.LastUpdated ? formatDate(product.LastUpdated) : "Never"}
                />
              </dl>
            </div>
          </div>

          {/* Our price rides in the header because every action below is judged
              against it. */}
          <div className="w-full sm:w-auto sm:text-right sm:pl-6 sm:border-l border-line shrink-0">
            <div className="text-[10px] uppercase tracking-wide text-ink-muted">Our price</div>
            <div className="text-[32px] leading-9 font-semibold tracking-tight text-ink tnum mt-1">
              {product.CurrentPrice !== null ? rupees(product.CurrentPrice) : "—"}
            </div>
            {product.LastUpdated && (
              <div
                className="text-[11px] text-ink-muted mt-1 inline-flex items-center gap-1"
                title={formatDateTime(product.LastUpdated)}
              >
                <Clock size={11} />
                {formatDate(product.LastUpdated)}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-5">
          {/* Re-reads the API. There is no endpoint that triggers a live scrape,
              so this does not claim to re-scan the marketplaces. */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            title="Re-read the latest collected prices"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : undefined} />
            {refreshing ? "Refreshing" : "Refresh data"}
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil size={14} />
            Edit product
          </Button>
          <Button variant="primary" size="sm" onClick={onAddUrl}>
            <Plus size={14} />
            Add competitor URL
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete} className="ml-auto">
            <Trash2 size={14} />
            Deactivate
          </Button>
        </div>
      </div>
    </div>
  );
}
