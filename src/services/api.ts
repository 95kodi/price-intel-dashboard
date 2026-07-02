import type { Product, PriceComparison, PriceComparisonResponse, MergedProduct, DashboardSummary, ProductWithPrices, Competitor, Notification, CompetitorCoverage } from "@/types";

const API_BASE = "https://api.gogizmo.co";

async function fetchProductsAPI(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/products/`);
  if (!res.ok) throw new Error(`Failed to fetch products: ${res.statusText}`);
  return res.json();
}

async function fetchPriceComparisonAPI(): Promise<PriceComparisonResponse> {
  const res = await fetch(`${API_BASE}/price-comparison/`);
  if (!res.ok) throw new Error(`Failed to fetch price comparison: ${res.statusText}`);
  return res.json();
}

async function fetchAllData() {
  const [products, comparison] = await Promise.all([fetchProductsAPI(), fetchPriceComparisonAPI()]);
  return { products, comparison };
}

function mergeData(products: Product[], comparison: PriceComparison[]): MergedProduct[] {
  const activeMap = new Map<number, Product>(
    products.filter((p) => p.IsActive).map((p) => [p.ProductID, p])
  );

  return comparison
    .filter((pc) => activeMap.has(pc.ProductID))
    .map((pc) => {
      const p = activeMap.get(pc.ProductID)!;
      const prices = [pc.AmazonPrice, pc.FlipkartPrice, pc.PoorvikaPrice, pc.CromaPrice, pc.RelianceDigitalPrice, pc.SangeethaMobilesPrice, pc.TheChennaiMobilesPrice, pc.sathyaPrice];
      const validPrices = prices.filter((pr): pr is number => pr !== null && pr > 0);
      const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

      let lowestPlatform: string | null = null;
      if (lowestPrice !== null) {
        if (pc.AmazonPrice === lowestPrice) lowestPlatform = "Amazon";
        else if (pc.FlipkartPrice === lowestPrice) lowestPlatform = "Flipkart";
        else if (pc.PoorvikaPrice === lowestPrice) lowestPlatform = "Poorvika";
        else if (pc.CromaPrice === lowestPrice) lowestPlatform = "Croma";
        else if (pc.RelianceDigitalPrice === lowestPrice) lowestPlatform = "Reliance Digital";
        else if (pc.SangeethaMobilesPrice === lowestPrice) lowestPlatform = "Sangeetha";
        else if (pc.TheChennaiMobilesPrice === lowestPrice) lowestPlatform = "The Chennai Mobiles";
        else if (pc.sathyaPrice === lowestPrice) lowestPlatform = "Sathya";
      }

      return {
        ProductID: p.ProductID,
        ItemName: p.ItemName,
        Brand: p.Brand,
        Category: p.Category,
        AmazonPrice: pc.AmazonPrice ?? null,
        AmazonURL: pc.AmazonURL ?? null,
        FlipkartPrice: pc.FlipkartPrice ?? null,
        FlipkartURL: pc.FlipkartURL ?? null,
        PoorvikaPrice: pc.PoorvikaPrice ?? null,
        PoorvikaURL: pc.PoorvikaURL ?? null,
        CromaPrice: pc.CromaPrice ?? null,
        CromaURL: pc.CromaURL ?? null,
        RelianceDigitalPrice: pc.RelianceDigitalPrice ?? null,
        RelianceDigitalURL: pc.RelianceDigitalURL ?? null,
        SangeethaMobilesPrice: pc.SangeethaMobilesPrice ?? null,
        SangeethaMobilesURL: pc.SangeethaMobilesURL ?? null,
        TheChennaiMobilesPrice: pc.TheChennaiMobilesPrice ?? null,
        TheChennaiMobilesURL: pc.TheChennaiMobilesURL ?? null,
        sathyaPrice: pc.sathyaPrice ?? null,
        sathyaURL: pc.sathyaURL ?? null,
        lowestPrice,
        lowestPlatform,
      };
    });
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { products, comparison } = await fetchAllData();
  const merged = mergeData(products, comparison.data);
  const totalProducts = merged.length;

  const gaps = merged.map((m) => {
    const prices = [m.AmazonPrice, m.FlipkartPrice, m.PoorvikaPrice, m.CromaPrice, m.RelianceDigitalPrice, m.SangeethaMobilesPrice, m.TheChennaiMobilesPrice, m.sathyaPrice].filter((p): p is number => p !== null && p > 0);
    if (prices.length < 2) return null;
    return Math.max(...prices) - Math.min(...prices);
  }).filter((g): g is number => g !== null);
  const averagePriceGap = gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;

  return {
    totalProducts,
    winningProducts: 0,
    losingProducts: 0,
    matchingProducts: 0,
    averagePriceGap,
    lastScanTime: new Date().toISOString(),
  };
}

export async function fetchProductsWithPrices(filters?: { search?: string; brand?: string; status?: string }): Promise<MergedProduct[]> {
  const { products, comparison } = await fetchAllData();
  let merged = mergeData(products, comparison.data);

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    merged = merged.filter(
      (p) =>
        p.ItemName.toLowerCase().includes(s) ||
        p.Brand.toLowerCase().includes(s)
    );
  }
  if (filters?.brand) {
    merged = merged.filter((p) => p.Brand === filters.brand);
  }
  if (filters?.status === "available") {
    merged = merged.filter((p) => p.lowestPrice !== null);
  } else if (filters?.status === "missing") {
    merged = merged.filter((p) => p.lowestPrice === null);
  }

  return merged;
}

export async function fetchBrands(): Promise<string[]> {
  const { products, comparison } = await fetchAllData();
  const merged = mergeData(products, comparison.data);
  const brands = [...new Set(merged.map((p) => p.Brand))];
  return brands.sort();
}

export async function fetchCompetitors(): Promise<Competitor[]> {
  const { products, comparison } = await fetchAllData();
  const merged = mergeData(products, comparison.data);

  const countPrice = (field: keyof MergedProduct) => merged.filter((m) => m[field] !== null).length;

  return [
    { id: 1, name: "Amazon", website: "https://amazon.in", enabled: true, lastScan: new Date().toISOString(), productCount: countPrice("AmazonPrice") },
    { id: 2, name: "Flipkart", website: "https://flipkart.com", enabled: true, lastScan: new Date().toISOString(), productCount: countPrice("FlipkartPrice") },
    { id: 3, name: "Poorvika", website: "https://poorvika.com", enabled: true, lastScan: new Date().toISOString(), productCount: countPrice("PoorvikaPrice") },
    { id: 4, name: "Croma", website: "https://croma.com", enabled: true, lastScan: new Date().toISOString(), productCount: countPrice("CromaPrice") },
    { id: 5, name: "Reliance Digital", website: "https://reliancedigital.in", enabled: true, lastScan: new Date().toISOString(), productCount: countPrice("RelianceDigitalPrice") },
    { id: 6, name: "Sangeetha", website: "https://sangeethamobiles.com", enabled: true, lastScan: new Date().toISOString(), productCount: countPrice("SangeethaMobilesPrice") },
    { id: 7, name: "The Chennai Mobiles", website: "https://thechennaimobiles.com", enabled: true, lastScan: new Date().toISOString(), productCount: countPrice("TheChennaiMobilesPrice") },
    { id: 8, name: "Sathya", website: "https://sathya.in", enabled: true, lastScan: new Date().toISOString(), productCount: countPrice("sathyaPrice") },
  ];
}

export async function fetchBrandPriceGaps() {
  const { products, comparison } = await fetchAllData();
  const merged = mergeData(products, comparison.data);

  const brandMap: Record<string, number[]> = {};
  merged.forEach((m) => {
    const prices = [m.AmazonPrice, m.FlipkartPrice, m.PoorvikaPrice, m.CromaPrice, m.RelianceDigitalPrice, m.SangeethaMobilesPrice, m.TheChennaiMobilesPrice, m.sathyaPrice].filter((p): p is number => p !== null && p > 0);
    if (prices.length >= 2) {
      const gap = Math.max(...prices) - Math.min(...prices);
      if (!brandMap[m.Brand]) brandMap[m.Brand] = [];
      brandMap[m.Brand].push(gap);
    }
  });

  return Object.entries(brandMap).map(([brand, gaps]) => ({
    brand,
    avgGap: Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length),
  }));
}

export async function fetchCompetitorCoverage(): Promise<CompetitorCoverage[]> {
  const { products, comparison } = await fetchAllData();
  const merged = mergeData(products, comparison.data);
  const total = merged.length;

  const competitors = [
    { competitor: "Amazon", key: "AmazonPrice" as keyof MergedProduct },
    { competitor: "Flipkart", key: "FlipkartPrice" as keyof MergedProduct },
    { competitor: "Poorvika", key: "PoorvikaPrice" as keyof MergedProduct },
    { competitor: "Croma", key: "CromaPrice" as keyof MergedProduct },
    { competitor: "Reliance Digital", key: "RelianceDigitalPrice" as keyof MergedProduct },
    { competitor: "Sangeetha", key: "SangeethaMobilesPrice" as keyof MergedProduct },
    { competitor: "The Chennai Mobiles", key: "TheChennaiMobilesPrice" as keyof MergedProduct },
    { competitor: "Sathya", key: "sathyaPrice" as keyof MergedProduct },
  ];

  return competitors.map(({ competitor, key }) => {
    const count = merged.filter((m) => m[key] !== null).length;
    return { competitor, count, total, percentage: total > 0 ? Math.round((count / total) * 100) : 0 };
  });
}

export async function createCompetitor(data: Omit<Competitor, "id" | "lastScan" | "productCount">): Promise<Competitor> {
  return { ...data, id: Date.now(), lastScan: null, productCount: 0 };
}

export async function updateCompetitor(id: number, data: Partial<Competitor>): Promise<Competitor> {
  return { id, name: data.name || "", website: data.website || "", enabled: data.enabled !== false, lastScan: null, productCount: 0 };
}

export async function deleteCompetitor(id: number): Promise<void> {}

export async function toggleCompetitor(id: number): Promise<Competitor> {
  return { id, name: "", website: "", enabled: true, lastScan: null, productCount: 0 };
}

export async function fetchProducts(): Promise<Product[]> {
  return fetchProductsAPI();
}

export async function createProduct(data: Omit<Product, "id" | "createdAt">): Promise<Product> {
  return { ...data, id: Date.now(), createdAt: new Date().toISOString() } as any;
}

export async function updateProduct(id: number, data: Partial<Product>): Promise<Product> {
  return { id, brand: "", category: "", sku: "", createdAt: "", status: "active", ...data } as any;
}

export async function deleteProduct(id: number): Promise<void> {}

let notificationsCache: Notification[] = [];

export async function fetchNotifications(): Promise<Notification[]> {
  if (notificationsCache.length === 0) {
    const { products, comparison } = await fetchAllData();
    const merged = mergeData(products, comparison.data);
    notificationsCache = merged.filter((m) => m.lowestPrice !== null).slice(0, 10).map((m, idx) => ({
      id: idx + 1,
      type: "info",
      title: `${m.ItemName} — Lowest at ₹${m.lowestPrice?.toLocaleString()}`,
      description: `Lowest price on ${m.lowestPlatform}`,
      timestamp: new Date().toISOString(),
      read: false,
    }));
  }
  return notificationsCache;
}

export async function markNotificationRead(id: number): Promise<void> {
  notificationsCache = notificationsCache.map((n) => (n.id === id ? { ...n, read: true } : n));
}

export async function markAllNotificationsRead(): Promise<void> {
  notificationsCache = notificationsCache.map((n) => ({ ...n, read: true }));
}

export async function runPriceScan(): Promise<{ success: boolean; message: string }> {
  return { success: true, message: "Scan completed. Products updated." };
}

export async function fetchProductUrls(productId?: number) {
  return [];
}

export async function createProductUrl(data: { productId: number; competitorId: number; url: string }) {
  return data;
}

export async function fetchPriceHistory(productId: number) {
  return [];
}
