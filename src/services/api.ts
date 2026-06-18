import type { Competitor, Product, Notification, ProductWithPrices, DashboardSummary } from "@/types";
import {
  fetchPriceComparisonFromAPI,
  convertComparisonToProductWithPrices,
  convertComparisonToDashboardSummary,
  generateNotificationsFromComparison,
  extractBrand,
} from "./comparison.service";
import {
  calculateDashboardSummary,
  calculateCompetitorCoverage,
} from "./dashboard.service";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- Dashboard ---
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const comparison = await fetchPriceComparisonFromAPI();
  return convertComparisonToDashboardSummary(comparison);
}

export async function fetchProductsWithPrices(
  filters?: { search?: string; brand?: string; status?: string }
): Promise<ProductWithPrices[]> {
  const comparison = await fetchPriceComparisonFromAPI();
  let products = convertComparisonToProductWithPrices(comparison.data);

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    products = products.filter(
      (p) =>
        (p.name?.toLowerCase().includes(s) || false) ||
        (p.brand?.toLowerCase().includes(s) || false) ||
        (p.sku?.toLowerCase().includes(s) || false)
    );
  }
  if (filters?.brand) {
    products = products.filter((p) => p.brand === filters.brand);
  }
  if (filters?.status) {
    products = products.filter((p) => p.status === filters.status);
  }

  return products;
}

export async function fetchBrandPriceGaps() {
  const comparison = await fetchPriceComparisonFromAPI();
  const products = convertComparisonToProductWithPrices(comparison.data);

  const brandMap: Record<string, number[]> = {};
  products.forEach((p) => {
    if (p.priceGap !== null) {
      if (!brandMap[p.brand]) brandMap[p.brand] = [];
      brandMap[p.brand].push(Math.abs(p.priceGap));
    }
  });

  return Object.entries(brandMap).map(([brand, gaps]) => ({
    brand,
    avgGap: Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length),
  }));
}

export async function fetchCompetitorCoverage() {
  const comparison = await fetchPriceComparisonFromAPI();
  return calculateCompetitorCoverage(comparison.data);
}

// --- Competitors ---
export async function fetchCompetitors(): Promise<Competitor[]> {
  const comparison = await fetchPriceComparisonFromAPI();
  const summary = calculateDashboardSummary(comparison.data);
  return [
    { id: 1, name: "Amazon", website: "https://amazon.in", enabled: true, lastScan: new Date().toISOString(), productCount: summary.amazonProducts },
    { id: 2, name: "Flipkart", website: "https://flipkart.com", enabled: true, lastScan: new Date().toISOString(), productCount: summary.flipkartProducts },
    { id: 3, name: "Poorvika", website: "https://poorvika.com", enabled: true, lastScan: new Date().toISOString(), productCount: summary.poorvikaProducts },
    { id: 4, name: "Sangeetha", website: "https://sangeethamobiles.com", enabled: true, lastScan: new Date().toISOString(), productCount: summary.sangeethaProducts },
  ];
}

export async function createCompetitor(
  data: Omit<Competitor, "id" | "lastScan" | "productCount">
): Promise<Competitor> {
  return {
    ...data,
    id: Date.now(),
    lastScan: null,
    productCount: 0,
  };
}

export async function updateCompetitor(
  id: number,
  data: Partial<Competitor>
): Promise<Competitor> {
  return {
    id,
    name: data.name || "",
    website: data.website || "",
    enabled: data.enabled !== false,
    lastScan: null,
    productCount: 0,
  };
}

export async function deleteCompetitor(id: number): Promise<void> {}

export async function toggleCompetitor(id: number): Promise<Competitor> {
  return {
    id,
    name: "",
    website: "",
    enabled: true,
    lastScan: null,
    productCount: 0,
  };
}

// --- Products ---
export async function fetchProducts(): Promise<Product[]> {
  const comparison = await fetchPriceComparisonFromAPI();
  return comparison.data.map((item, idx) => ({
    id: idx + 1,
    name: item.ItemName,
    productName: item.ItemName,
    brand: extractBrand(item.ItemName),
    category: "Smartphones",
    sku: item.ItemCode,
    ourPrice: item.SangeethaPrice ?? 0,
    currentPrice: item.SangeethaPrice ?? 0,
    createdAt: new Date().toISOString(),
    status: "active",
  }));
}

export async function createProduct(
  data: Omit<Product, "id" | "createdAt">
): Promise<Product> {
  return {
    ...data,
    id: Date.now(),
    createdAt: new Date().toISOString(),
  };
}

export async function updateProduct(
  id: number,
  data: Partial<Product>
): Promise<Product> {
  return {
    id,
    brand: "",
    category: "",
    sku: "",
    createdAt: "",
    status: "active",
    ...data,
  };
}

export async function deleteProduct(id: number): Promise<void> {}

// --- Notifications ---
let notificationsCache: Notification[] = [];

export async function fetchNotifications(): Promise<Notification[]> {
  if (notificationsCache.length === 0) {
    const comparison = await fetchPriceComparisonFromAPI();
    const generated = generateNotificationsFromComparison(comparison.data);
    notificationsCache = generated.map((notif, idx) => ({
      id: idx + 1,
      type: notif.type,
      title: notif.title,
      description: notif.description,
      timestamp: new Date().toISOString(),
      read: false,
      productId: notif.productId,
    }));
  }
  return notificationsCache;
}

export async function markNotificationRead(id: number): Promise<void> {
  notificationsCache = notificationsCache.map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
}

export async function markAllNotificationsRead(): Promise<void> {
  notificationsCache = notificationsCache.map((n) => ({ ...n, read: true }));
}

// --- Scan ---
export async function runPriceScan(): Promise<{ success: boolean; message: string }> {
  await delay(3000);
  return { success: true, message: "Scan completed. Products updated." };
}

// --- Unique brands for filters ---
export async function fetchBrands(): Promise<string[]> {
  const comparison = await fetchPriceComparisonFromAPI();
  const brands = comparison.data.map((item) => extractBrand(item.ItemName));
  return [...new Set(brands)].sort();
}

// --- Product URLs ---
export async function fetchProductUrls(productId?: number) {
  return [];
}

export async function createProductUrl(data: {
  productId: number;
  competitorId: number;
  url: string;
}) {
  return data;
}

// --- Price History ---
export async function fetchPriceHistory(productId: number) {
  return [];
}
