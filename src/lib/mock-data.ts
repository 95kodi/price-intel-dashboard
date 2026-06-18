import type {
  Product,
  Competitor,
  Notification,
  ProductWithPrices,
  DashboardSummary,
  BrandPriceGap,
  CompetitorCoverage,
} from "@/types";

export const COMPETITORS: Competitor[] = [
  { id: 1, name: "Amazon", website: "https://amazon.in", enabled: true, lastScan: "2025-01-15T11:42:00Z", productCount: 38 },
  { id: 2, name: "Flipkart", website: "https://flipkart.com", enabled: true, lastScan: "2025-01-15T11:42:00Z", productCount: 40 },
  { id: 3, name: "Poorvika", website: "https://poorvika.com", enabled: true, lastScan: "2025-01-15T11:45:00Z", productCount: 28 },
  { id: 4, name: "Reliance Digital", website: "https://reliancedigital.in", enabled: true, lastScan: "2025-01-15T11:50:00Z", productCount: 32 },
  { id: 5, name: "Vijay Sales", website: "https://vijaysales.com", enabled: false, lastScan: "2025-01-14T09:00:00Z", productCount: 22 },
  { id: 6, name: "Croma", website: "https://croma.com", enabled: true, lastScan: "2025-01-15T11:55:00Z", productCount: 35 },
];

export const PRODUCTS: Product[] = [
  { id: 1, name: "iPhone 16 Pro Max 512GB", brand: "Apple", category: "Smartphones", ourPrice: 109900, sku: "APL-IP16PM-512", createdAt: "2025-01-01T00:00:00Z", status: "active" },
  { id: 2, name: "Samsung Galaxy S25 Ultra 256GB", brand: "Samsung", category: "Smartphones", ourPrice: 129999, sku: "SAM-S25U-256", createdAt: "2025-01-01T00:00:00Z", status: "active" },
  { id: 3, name: "Sony WH-1000XM5 Headphones", brand: "Sony", category: "Audio", ourPrice: 24990, sku: "SNY-XM5-BLK", createdAt: "2025-01-02T00:00:00Z", status: "active" },
  { id: 4, name: 'LG OLED evo C4 55" TV', brand: "LG", category: "TVs", ourPrice: 139990, sku: "LG-C455-2024", createdAt: "2025-01-02T00:00:00Z", status: "active" },
  { id: 5, name: "Apple MacBook Air M3 16GB", brand: "Apple", category: "Laptops", ourPrice: 114900, sku: "APL-MBA-M3-16", createdAt: "2025-01-03T00:00:00Z", status: "active" },
  { id: 6, name: "OnePlus 13 256GB", brand: "OnePlus", category: "Smartphones", ourPrice: 69999, sku: "OP-13-256-BLK", createdAt: "2025-01-03T00:00:00Z", status: "active" },
  { id: 7, name: 'Samsung 65" QLED 4K TV', brand: "Samsung", category: "TVs", ourPrice: 89990, sku: "SAM-Q65-2024", createdAt: "2025-01-04T00:00:00Z", status: "active" },
  { id: 8, name: "Sony PlayStation 5 Slim", brand: "Sony", category: "Gaming", ourPrice: 49990, sku: "SNY-PS5S-WHT", createdAt: "2025-01-04T00:00:00Z", status: "active" },
  { id: 9, name: "Apple AirPods Pro 2nd Gen", brand: "Apple", category: "Audio", ourPrice: 24900, sku: "APL-APP2-WHT", createdAt: "2025-01-05T00:00:00Z", status: "active" },
  { id: 10, name: "Bose QuietComfort 45", brand: "Bose", category: "Audio", ourPrice: 29990, sku: "BOS-QC45-BLK", createdAt: "2025-01-05T00:00:00Z", status: "active" },
  { id: 11, name: "Samsung Galaxy Tab S9 Ultra", brand: "Samsung", category: "Tablets", ourPrice: 109999, sku: "SAM-TS9U-256", createdAt: "2025-01-06T00:00:00Z", status: "active" },
  { id: 12, name: "Apple iPad Pro M4 11-inch", brand: "Apple", category: "Tablets", ourPrice: 99900, sku: "APL-IPDP-M4-11", createdAt: "2025-01-06T00:00:00Z", status: "active" },
  { id: 13, name: "LG 27UK850 4K Monitor", brand: "LG", category: "Monitors", ourPrice: 42990, sku: "LG-27UK850-BLK", createdAt: "2025-01-07T00:00:00Z", status: "active" },
  { id: 14, name: "Dell XPS 15 Core i9", brand: "Dell", category: "Laptops", ourPrice: 189990, sku: "DLL-XPS15-I9", createdAt: "2025-01-07T00:00:00Z", status: "active" },
  { id: 15, name: "Dyson V15 Detect Vacuum", brand: "Dyson", category: "Appliances", ourPrice: 69900, sku: "DYS-V15-DET", createdAt: "2025-01-08T00:00:00Z", status: "active" },
];

const rawPrices: Record<number, Record<number, number | null>> = {
  1: { 1: 112000, 2: 109900, 3: 111500, 4: 113000 },
  2: { 1: 125000, 2: 127000, 3: 129999, 4: 131000 },
  3: { 1: 22999, 2: 23499, 3: 24990, 4: 25500 },
  4: { 1: 134999, 2: 136000, 3: null, 4: 142000 },
  5: { 1: 112500, 2: 113000, 3: 114900, 4: null },
  6: { 1: 67500, 2: 68000, 3: 69999, 4: 71000 },
  7: { 1: 84999, 2: 85999, 3: 88000, 4: 91000 },
  8: { 1: 49990, 2: 49990, 3: 50500, 4: 51000 },
  9: { 1: 22000, 2: 22500, 3: 23999, 4: null },
  10: { 1: 27500, 2: 28000, 3: 29990, 4: 30500 },
  11: { 1: 104999, 2: 106000, 3: 109999, 4: 112000 },
  12: { 1: 97500, 2: 98000, 3: null, 4: 102000 },
  13: { 1: 39999, 2: 41000, 3: 42990, 4: null },
  14: { 1: 184999, 2: 187000, 3: null, 4: 192000 },
  15: { 1: 65000, 2: 67000, 3: null, 4: 72000 },
};

function getPriceStatus(ourPrice: number, lowestPrice: number | null) {
  if (!lowestPrice) return "matching" as const;
  if (ourPrice < lowestPrice) return "winning" as const;
  if (ourPrice > lowestPrice) return "losing" as const;
  return "matching" as const;
}

export function buildProductsWithPrices(): any[] {
  return PRODUCTS.map((product) => {
    const prices = rawPrices[product.id] || {};
    const competitorPrices = COMPETITORS.slice(0, 4).map((c) => ({
      competitorId: c.id,
      competitorName: c.name,
      price: prices[c.id] ?? null,
      url: `https://${c.website.replace("https://", "")}/dp/${product.sku}`,
    }));

    const validPrices = competitorPrices.filter((cp) => cp.price !== null).map((cp) => cp.price as number);
    const lowestCompetitorPrice = validPrices.length ? Math.min(...validPrices) : null;
    const ourPriceVal = product.ourPrice || 0;
    const priceGap = lowestCompetitorPrice !== null ? ourPriceVal - lowestCompetitorPrice : null;

    return {
      ...product,
      competitorPrices,
      lowestCompetitorPrice,
      priceGap,
      status: getPriceStatus(ourPriceVal, lowestCompetitorPrice),
    };
  });
}

export function getDashboardSummary(): DashboardSummary {
  const products = buildProductsWithPrices();
  const winning = products.filter((p) => p.status === "winning").length;
  const losing = products.filter((p) => p.status === "losing").length;
  const matching = products.filter((p) => p.status === "matching").length;
  const gaps = products.filter((p) => p.priceGap !== null).map((p) => Math.abs(p.priceGap as number));
  const avgGap = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;

  return {
    totalProducts: products.length,
    averagePriceGap: avgGap,
    winningProducts: winning,
    losingProducts: losing,
    matchingProducts: matching,
    lastScanTime: "2025-01-15T11:42:00Z",
  };
}

export function getBrandPriceGaps(): BrandPriceGap[] {
  const products = buildProductsWithPrices();
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

export function getCompetitorCoverage(): CompetitorCoverage[] {
  return COMPETITORS.map((c) => ({ competitor: c.name, productCount: c.productCount }));
}

export const NOTIFICATIONS: Notification[] = [
  { id: 1, type: "danger", title: "Flipkart is cheaper by ₹2,000", description: "Samsung Galaxy S25 Ultra — Flipkart: ₹127,999 vs Our: ₹129,999", timestamp: "2025-01-15T11:40:00Z", read: false, productId: 2, competitorId: 2 },
  { id: 2, type: "warning", title: "Price dropped on Amazon", description: "Apple MacBook Air M3 dropped from ₹114,900 to ₹112,500 on Amazon", timestamp: "2025-01-15T11:22:00Z", read: false, productId: 5, competitorId: 1 },
  { id: 3, type: "info", title: "New competitor listing found", description: "Vijay Sales now lists iPhone 16 Pro Max at ₹108,900", timestamp: "2025-01-15T10:42:00Z", read: false, productId: 1, competitorId: 5 },
  { id: 4, type: "success", title: "You are winning on 18 products", description: "Latest scan completed — 18 products have the lowest market price", timestamp: "2025-01-15T09:42:00Z", read: true },
  { id: 5, type: "warning", title: "Product unavailable on Poorvika", description: "Sony WH-1000XM5 shows out of stock on poorvika.com", timestamp: "2025-01-15T08:30:00Z", read: true, productId: 3, competitorId: 3 },
  { id: 6, type: "info", title: "Scan completed successfully", description: "42 products scanned across 6 competitors. Duration: 4m 32s", timestamp: "2025-01-14T11:42:00Z", read: true },
];
