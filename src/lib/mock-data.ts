import type {
  Product,
  Competitor,
  Notification,
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
  { ProductID: 1, ItemName: "iPhone 16 Pro Max 512GB", Brand: "Apple", Category: "Smartphones", IsActive: true },
  { ProductID: 2, ItemName: "Samsung Galaxy S25 Ultra 256GB", Brand: "Samsung", Category: "Smartphones", IsActive: true },
  { ProductID: 3, ItemName: "Sony WH-1000XM5 Headphones", Brand: "Sony", Category: "Audio", IsActive: true },
  { ProductID: 4, ItemName: 'LG OLED evo C4 55" TV', Brand: "LG", Category: "TVs", IsActive: true },
  { ProductID: 5, ItemName: "Apple MacBook Air M3 16GB", Brand: "Apple", Category: "Laptops", IsActive: true },
  { ProductID: 6, ItemName: "OnePlus 13 256GB", Brand: "OnePlus", Category: "Smartphones", IsActive: true },
  { ProductID: 7, ItemName: 'Samsung 65" QLED 4K TV', Brand: "Samsung", Category: "TVs", IsActive: true },
  { ProductID: 8, ItemName: "Sony PlayStation 5 Slim", Brand: "Sony", Category: "Gaming", IsActive: true },
  { ProductID: 9, ItemName: "Apple AirPods Pro 2nd Gen", Brand: "Apple", Category: "Audio", IsActive: true },
  { ProductID: 10, ItemName: "Bose QuietComfort 45", Brand: "Bose", Category: "Audio", IsActive: true },
];

export function getDashboardSummary(): DashboardSummary {
  return {
    totalProducts: PRODUCTS.length,
    averagePriceGap: 0,
    winningProducts: 0,
    losingProducts: 0,
    matchingProducts: 0,
    lastScanTime: "2025-01-15T11:42:00Z",
  };
}

export function getBrandPriceGaps(): BrandPriceGap[] {
  return [];
}

export function getCompetitorCoverage(): CompetitorCoverage[] {
  return COMPETITORS.map((c) => ({ competitor: c.name, count: 0, total: 0, percentage: 0 }));
}

export const NOTIFICATIONS: Notification[] = [
  { id: 1, type: "danger", title: "Flipkart is cheaper by ₹2,000", description: "Samsung Galaxy S25 Ultra — Flipkart: ₹127,999 vs Our: ₹129,999", timestamp: "2025-01-15T11:40:00Z", read: false, productId: 2, competitorId: 2 },
  { id: 2, type: "warning", title: "Price dropped on Amazon", description: "Apple MacBook Air M3 dropped from ₹114,900 to ₹112,500 on Amazon", timestamp: "2025-01-15T11:22:00Z", read: false, productId: 5, competitorId: 1 },
  { id: 3, type: "info", title: "New competitor listing found", description: "Vijay Sales now lists iPhone 16 Pro Max at ₹108,900", timestamp: "2025-01-15T10:42:00Z", read: false, productId: 1, competitorId: 5 },
  { id: 4, type: "success", title: "You are winning on 18 products", description: "Latest scan completed — 18 products have the lowest market price", timestamp: "2025-01-15T09:42:00Z", read: true },
  { id: 5, type: "warning", title: "Product unavailable on Poorvika", description: "Sony WH-1000XM5 shows out of stock on poorvika.com", timestamp: "2025-01-15T08:30:00Z", read: true, productId: 3, competitorId: 3 },
  { id: 6, type: "info", title: "Scan completed successfully", description: "42 products scanned across 6 competitors. Duration: 4m 32s", timestamp: "2025-01-14T11:42:00Z", read: true },
];
