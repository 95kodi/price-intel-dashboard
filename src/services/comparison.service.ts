/**
 * Price Comparison Service
 * Handles price comparison data and calculations
 */

import { apiGet } from "./api-client";
import type {
  PriceComparisonResponse,
  PriceComparisonItem,
  DashboardSummary,
  ProductWithPrices,
} from "@/types";

/**
 * Extract brand from product name
 */
export function extractBrand(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("apple") || lower.includes("iphone") || lower.includes("ipad") || lower.includes("macbook")) return "Apple";
  if (lower.includes("samsung")) return "Samsung";
  if (lower.includes("sony")) return "Sony";
  if (lower.includes("lg")) return "LG";
  if (lower.includes("oneplus")) return "OnePlus";
  if (lower.includes("bose")) return "Bose";
  if (lower.includes("dell")) return "Dell";
  if (lower.includes("dyson")) return "Dyson";
  if (lower.includes("vivo")) return "Vivo";
  if (lower.includes("oppo")) return "Oppo";
  if (lower.includes("xiaomi") || lower.includes("mi ") || lower.includes("redmi")) return "Xiaomi";
  if (lower.includes("realme")) return "Realme";
  if (lower.includes("motorola") || lower.includes("moto")) return "Motorola";
  
  const firstWord = name.trim().split(/\s+/)[0];
  return firstWord || "Other";
}

/**
 * Fetch price comparison data from backend
 */
export async function fetchPriceComparisonFromAPI(): Promise<PriceComparisonResponse> {
  try {
    const response = await apiGet<PriceComparisonResponse>(
      "/price-comparison/"
    );
    return response;
  } catch (error) {
    console.error("Failed to fetch price comparison from API:", error);
    throw error;
  }
}

/**
 * Convert API price comparison response to ProductWithPrices format
 */
export function convertComparisonToProductWithPrices(
  items: PriceComparisonItem[]
): ProductWithPrices[] {
  return items.map((item) => {
    // 1. Determine ourPrice (using SangeethaPrice as our baseline)
    const ourPrice = item.SangeethaPrice ?? 0;

    // 2. Map all competitor prices
    const competitorPrices = [
      { competitorId: 1, competitorName: "Amazon", price: item.AmazonPrice, url: item.AmazonURL || "" },
      { competitorId: 2, competitorName: "Flipkart", price: item.FlipkartPrice, url: item.FlipkartURL || "" },
      { competitorId: 3, competitorName: "Poorvika", price: item.PoorvikaPrice, url: item.PoorvikaURL || "" },
      { competitorId: 4, competitorName: "Sangeetha", price: item.SangeethaPrice, url: item.SangeethaURL || "" },
    ];

    // 3. Find lowest price among all platforms
    const allPrices = [item.AmazonPrice, item.FlipkartPrice, item.PoorvikaPrice, item.SangeethaPrice]
      .filter((p): p is number => p !== null && p > 0);
    const lowestPrice = allPrices.length > 0 ? Math.min(...allPrices) : null;

    // 4. Find lowest platform name
    let lowestPlatform: string | null = null;
    if (lowestPrice !== null) {
      if (item.AmazonPrice === lowestPrice) lowestPlatform = "Amazon";
      else if (item.FlipkartPrice === lowestPrice) lowestPlatform = "Flipkart";
      else if (item.PoorvikaPrice === lowestPrice) lowestPlatform = "Poorvika";
      else if (item.SangeethaPrice === lowestPrice) lowestPlatform = "Sangeetha";
    }

    // 5. Calculate lowestCompetitorPrice (lowest among Amazon, Flipkart, Poorvika)
    const competitorPricesList = [item.AmazonPrice, item.FlipkartPrice, item.PoorvikaPrice]
      .filter((p): p is number => p !== null && p > 0);
    const lowestCompetitorPrice = competitorPricesList.length > 0 ? Math.min(...competitorPricesList) : null;

    // 6. Calculate priceGap (ourPrice - lowestCompetitorPrice)
    const priceGap = (ourPrice > 0 && lowestCompetitorPrice !== null) ? (ourPrice - lowestCompetitorPrice) : null;

    // 7. Calculate status (winning / losing / matching)
    let status: "winning" | "losing" | "matching" | "active" | "inactive" = "matching";
    if (ourPrice > 0 && lowestCompetitorPrice !== null) {
      if (ourPrice < lowestCompetitorPrice) status = "winning";
      else if (ourPrice > lowestCompetitorPrice) status = "losing";
      else status = "matching";
    }

    const brand = extractBrand(item.ItemName);

    return {
      id: item.ItemCode,
      name: item.ItemName,
      productName: item.ItemName,
      brand,
      category: "Electronics",
      sku: item.ItemCode,
      createdAt: new Date().toISOString(),
      amazonPrice: item.AmazonPrice,
      amazonUrl: item.AmazonURL,
      flipkartPrice: item.FlipkartPrice,
      flipkartUrl: item.FlipkartURL,
      poorvikaPrice: item.PoorvikaPrice,
      poorvikaUrl: item.PoorvikaURL,
      sangeethaPrice: item.SangeethaPrice,
      sangeethaUrl: item.SangeethaURL,
      lowestPrice,
      lowestPlatform,
      
      // Backward compatible fields
      ourPrice,
      competitorPrices,
      lowestCompetitorPrice,
      priceGap,
      status,
    };
  });
}

/**
 * Convert API price comparison response to DashboardSummary
 */
export function convertComparisonToDashboardSummary(
  response: PriceComparisonResponse
): DashboardSummary {
  const products = convertComparisonToProductWithPrices(response.data);
  const totalProducts = products.length;
  
  const winningProducts = products.filter((p) => p.status === "winning").length;
  const losingProducts = products.filter((p) => p.status === "losing").length;
  const matchingProducts = products.filter((p) => p.status === "matching").length;

  const gaps = products
    .filter((p) => p.priceGap !== null)
    .map((p) => Math.abs(p.priceGap as number));
  const averagePriceGap = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;

  // Compute coverage data
  const amazonProducts = response.data.filter((item) => item.AmazonPrice !== null).length;
  const flipkartProducts = response.data.filter((item) => item.FlipkartPrice !== null).length;
  const poorvikaProducts = response.data.filter((item) => item.PoorvikaPrice !== null).length;
  const sangeethaProducts = response.data.filter((item) => item.SangeethaPrice !== null).length;

  const getPercentage = (count: number) => (totalProducts > 0 ? Math.round((count / totalProducts) * 100) : 0);

  return {
    totalProducts,
    winningProducts,
    losingProducts,
    matchingProducts,
    averagePriceGap,
    lastScanTime: new Date().toISOString(),
    amazonCoverage: { count: amazonProducts, percentage: getPercentage(amazonProducts) },
    flipkartCoverage: { count: flipkartProducts, percentage: getPercentage(flipkartProducts) },
    poorvikaCoverage: { count: poorvikaProducts, percentage: getPercentage(poorvikaProducts) },
    sangeethaCoverage: { count: sangeethaProducts, percentage: getPercentage(sangeethaProducts) },
  };
}


/**
 * Generate notifications from price comparison data
 */
export function generateNotificationsFromComparison(
  items: PriceComparisonItem[]
): Array<{
  type: "danger" | "warning" | "info" | "success";
  title: string;
  description: string;
  productId: number;
}> {
  const notifications: Array<{
    type: "danger" | "warning" | "info" | "success";
    title: string;
    description: string;
    productId: number;
  }> = [];

  const products = convertComparisonToProductWithPrices(items);

  products.forEach((p, idx) => {
    if (p.status === "losing" && p.priceGap !== null) {
      const gap = Math.abs(p.priceGap);
      const cheaperCompetitor = p.competitorPrices.find(
        (c) => c.price === p.lowestCompetitorPrice
      );
      const competitorName = cheaperCompetitor?.competitorName || "Competitor";
      
      notifications.push({
        type: "danger",
        title: `${competitorName} is cheaper by ₹${gap.toLocaleString()}`,
        description: `${p.name} — ${competitorName}: ₹${p.lowestCompetitorPrice?.toLocaleString()} vs Our: ₹${p.ourPrice.toLocaleString()}`,
        productId: idx + 1,
      });
    }
  });

  return notifications;
}
