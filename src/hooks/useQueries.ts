"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/services/api";
import { getProductById } from "@/services/productService";
import { getProductPlatformUrls } from "@/services/productPlatformUrlService";
import { getCompetitors } from "@/services/competitorService";

export const QUERY_KEYS = {
  dashboard: ["dashboard"] as const,
  products: (filters?: object) => ["products", filters] as const,
  productsWithPrices: (filters?: object) => ["products-with-prices", filters] as const,
  competitors: ["competitors"] as const,
  notifications: ["notifications"] as const,
  brands: ["brands"] as const,
  brandGaps: ["brand-gaps"] as const,
  competitorCoverage: ["competitor-coverage"] as const,
  priceHistory: (productId: number) => ["price-history", productId] as const,
  productPlatforms: ["product-platforms"] as const,
  product: (productId: number) => ["product", productId] as const,
  productUrls: (productId: number) => ["product-urls", productId] as const,
  platformMaster: ["platform-master"] as const,
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: api.fetchDashboardSummary,
    staleTime: 60_000,
    refetchInterval: 300_000,
  });
}

export function useProductsWithPrices(filters?: { search?: string; brand?: string; status?: string }) {
  return useQuery({
    queryKey: QUERY_KEYS.productsWithPrices(filters),
    queryFn: () => api.fetchProductsWithPrices(filters),
    staleTime: 60_000,
    refetchInterval: 300_000,
  });
}

export function useBrandPriceGaps() {
  return useQuery({ queryKey: QUERY_KEYS.brandGaps, queryFn: api.fetchBrandPriceGaps, staleTime: 60_000 });
}

export function useCompetitorCoverage() {
  return useQuery({ queryKey: QUERY_KEYS.competitorCoverage, queryFn: api.fetchCompetitorCoverage, staleTime: 60_000 });
}

export function useProducts() {
  return useQuery({ queryKey: QUERY_KEYS.products(), queryFn: api.fetchProducts, staleTime: 30_000 });
}

export function useBrands() {
  return useQuery({ queryKey: QUERY_KEYS.brands, queryFn: api.fetchBrands, staleTime: Infinity });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createProduct, onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }) });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.updateProduct>[1] }) => api.updateProduct(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteProduct, onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }) });
}

/** One catalog row — name, brand, SKU, our price, and when it last changed. */
export function useProduct(productId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.product(productId),
    queryFn: () => getProductById(productId),
    enabled: Number.isFinite(productId),
    staleTime: 30_000,
    retry: false,
  });
}

/** The marketplace URLs mapped to a product — what makes a listing editable. */
export function useProductUrls(productId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.productUrls(productId),
    queryFn: () => getProductPlatformUrls(productId),
    enabled: Number.isFinite(productId),
    staleTime: 30_000,
  });
}

/** The platform master. Rarely changes, so it is cached hard. */
export function usePlatformMaster() {
  return useQuery({
    queryKey: QUERY_KEYS.platformMaster,
    queryFn: getCompetitors,
    staleTime: 5 * 60_000,
  });
}

export function useCompetitors() {
  return useQuery({ queryKey: QUERY_KEYS.competitors, queryFn: api.fetchCompetitors, staleTime: 30_000 });
}

export function useCreateCompetitor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createCompetitor, onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.competitors }) });
}

export function useUpdateCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.updateCompetitor>[1] }) => api.updateCompetitor(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.competitors }),
  });
}

export function useDeleteCompetitor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteCompetitor, onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.competitors }) });
}

export function useToggleCompetitor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.toggleCompetitor, onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.competitors }) });
}

export function useNotifications() {
  return useQuery({ queryKey: QUERY_KEYS.notifications, queryFn: api.fetchNotifications, staleTime: 10_000 });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.markNotificationRead, onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.notifications }) });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.markAllNotificationsRead, onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.notifications }) });
}

export function useRunScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.runPriceScan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function usePriceHistory(productId: number) {
  return useQuery({ queryKey: QUERY_KEYS.priceHistory(productId), queryFn: () => api.fetchPriceHistory(productId), staleTime: 60_000 });
}

export function useProductPlatforms() {
  return useQuery({ queryKey: QUERY_KEYS.productPlatforms, queryFn: () => api.fetchProductUrls(), staleTime: 30_000 });
}

export function useCreateProductUrl() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createProductUrl, onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.productPlatforms }) });
}
