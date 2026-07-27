"use client";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { KpiCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { ProductHero } from "@/components/products/detail/ProductHero";
import {
  ProductKpis,
  MarketplaceTable,
  MarketplaceCards,
} from "@/components/products/detail/MarketplaceBreakdown";
import {
  MarketInsights,
  Recommendations,
  CoverageGaps,
  PriceHistorySection,
} from "@/components/products/detail/ProductIntelligence";
import { EditProductUrlDialog } from "@/components/products/EditProductUrlDialog";
import { AddProductUrlDialog } from "@/components/products/AddProductUrlDialog";
import { EditProductDialog } from "@/components/products/EditProductDialog";
import { DeleteProductDialog } from "@/components/products/DeleteProductDialog";
import {
  useProductsWithPrices,
  useProduct,
  useProductUrls,
  usePlatformMaster,
} from "@/hooks/useQueries";
import { buildInsights, type MarketRow } from "@/lib/product-detail";

interface MappedUrl {
  productPlatformId: number;
  platformId: number;
  name: string;
  url: string;
}

function DetailSkeleton() {
  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-[1600px] mx-auto">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params.id);

  const [refreshing, setRefreshing] = useState(false);
  const [editUrlTarget, setEditUrlTarget] = useState<MarketRow | null>(null);
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // The merged comparison feed is the same source the dashboard and the
  // winners page read, so every price on this page agrees with those.
  const {
    data: merged,
    isLoading: pricesLoading,
    isError: pricesError,
    refetch: refetchMerged,
  } = useProductsWithPrices();
  const mergedProduct = useMemo(
    () => merged?.find((p) => p.ProductID === productId) ?? null,
    [merged, productId]
  );

  const productQuery = useProduct(productId);
  const urlsQuery = useProductUrls(productId);
  // The platform master fails independently: losing it costs us platform ids,
  // not the whole page.
  const platformsQuery = usePlatformMaster();

  const product = productQuery.data ?? null;

  const mapped: MappedUrl[] = useMemo(
    () =>
      (urlsQuery.data?.Platforms ?? []).map((p) => ({
        productPlatformId: p.ProductPlatformID,
        platformId: p.PlatformID,
        name: p.PlatformName,
        url: p.ProductURL,
      })),
    [urlsQuery.data]
  );

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([
      productQuery.refetch(),
      urlsQuery.refetch(),
      platformsQuery.refetch(),
      refetchMerged(),
    ]);
    setRefreshing(false);
  };

  const insights = useMemo(
    () =>
      buildInsights(
        mergedProduct,
        (platformsQuery.data ?? []).map((p) => ({
          platformId: p.PlatformID,
          name: p.PlatformName,
        })),
        mapped
      ),
    [mergedProduct, platformsQuery.data, mapped]
  );

  // Every source must land before the derived sections render: half-loaded,
  // they would state "no competitor prices" about a product that has them.
  if (productQuery.isLoading || urlsQuery.isLoading || pricesLoading) return <DetailSkeleton />;

  if (productQuery.isError || !product) {
    return (
      <div className="p-5 sm:p-8 max-w-[1600px] mx-auto">
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-4"
        >
          <ArrowLeft size={14} /> Back to products
        </Link>
        <div className="bg-card border border-line rounded-2xl shadow-card">
          <ErrorState
            title="Product not found"
            description="We couldn't load this product. It may have been removed, or the API is unreachable."
            onRetry={refresh}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <ProductHero
        product={product}
        position={insights.position}
        refreshing={refreshing}
        onRefresh={refresh}
        onEdit={() => setShowEdit(true)}
        onAddUrl={() => setShowAddUrl(true)}
        onDelete={() => setShowDelete(true)}
      />

      <div className="p-5 sm:p-8 space-y-6 max-w-[1600px] mx-auto">
        {/* Without the comparison feed there is no market to describe, so the
            market sections are withheld rather than rendered empty. */}
        {pricesError ? (
          <div className="bg-card border border-line rounded-2xl shadow-card">
            <ErrorState
              title="Competitor prices unavailable"
              description="The product loaded, but the price comparison feed didn't. Market position, gaps and recommendations need it."
              onRetry={refetchMerged}
            />
          </div>
        ) : (
          <>
            <ProductKpis insights={insights} lastUpdated={product.LastUpdated} />

            <MarketplaceTable
              insights={insights}
              onEditUrl={setEditUrlTarget}
              onAddUrl={() => setShowAddUrl(true)}
            />

            <MarketplaceCards
              insights={insights}
              onEditUrl={setEditUrlTarget}
              onAddUrl={() => setShowAddUrl(true)}
            />

            {/* Read left to right: what the market looks like, then what to do. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <MarketInsights insights={insights} />
              <Recommendations insights={insights} />
              <CoverageGaps insights={insights} onAddUrl={() => setShowAddUrl(true)} />
              <PriceHistorySection />
            </div>
          </>
        )}
      </div>

      {editUrlTarget && editUrlTarget.productPlatformId !== null && (
        <EditProductUrlDialog
          open
          onClose={() => setEditUrlTarget(null)}
          productPlatformId={editUrlTarget.productPlatformId}
          productId={productId}
          platformId={editUrlTarget.platformId ?? 0}
          platformName={editUrlTarget.label}
          productUrl={editUrlTarget.url ?? ""}
          onSuccess={() => {
            setEditUrlTarget(null);
            refresh();
          }}
        />
      )}

      <AddProductUrlDialog
        open={showAddUrl}
        onClose={() => setShowAddUrl(false)}
        productId={productId}
        productName={product.ItemName}
        existingPlatformIds={mapped.map((m) => m.platformId)}
        onSuccess={() => {
          setShowAddUrl(false);
          refresh();
        }}
      />

      <EditProductDialog
        open={showEdit}
        product={product}
        onClose={() => setShowEdit(false)}
        onSuccess={refresh}
      />

      <DeleteProductDialog
        open={showDelete}
        product={product}
        onClose={() => setShowDelete(false)}
        onSuccess={() => router.push("/products")}
      />
    </div>
  );
}
