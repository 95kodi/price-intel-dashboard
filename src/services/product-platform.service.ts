/**
 * Product Platform Service
 * Handles product-platform mappings and price history
 */

import { apiGet, apiPost } from "./api-client";
import type {
  ProductPlatform,
  PriceHistoryEntry,
  ApiListResponse,
  ApiSingleResponse,
} from "@/types";

/**
 * Fetch all product-platform mappings
 */
export async function fetchProductPlatformsFromAPI(): Promise<ProductPlatform[]> {
  try {
    const response = await apiGet<ApiListResponse<ProductPlatform>>(
      "/api/ProductPlatform/GetAll"
    );
    return response.data || [];
  } catch (error) {
    console.error("Failed to fetch product platforms from API:", error);
    throw error;
  }
}

/**
 * Create a new product-platform mapping
 */
export async function createProductPlatformAPI(
  data: Omit<ProductPlatform, "id">
): Promise<ProductPlatform> {
  try {
    const payload = {
      productId: data.productId,
      platformId: data.platformId,
      productUrl: data.productUrl,
    };

    const response = await apiPost<ApiSingleResponse<ProductPlatform>>(
      "/api/ProductPlatform/Add",
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Failed to create product platform mapping:", error);
    throw error;
  }
}

/**
 * Fetch price history for a specific product
 */
export async function fetchPriceHistoryFromAPI(
  productId: number
): Promise<PriceHistoryEntry[]> {
  try {
    const response = await apiGet<ApiListResponse<PriceHistoryEntry>>(
      `/api/ProductPlatform/GetPriceHistory/${productId}`
    );
    return response.data || [];
  } catch (error) {
    console.error(`Failed to fetch price history for product ${productId}:`, error);
    throw error;
  }
}

/**
 * Format price history entries for chart display
 */
export function formatPriceHistoryForChart(
  entries: PriceHistoryEntry[]
): Array<{
  date: string;
  platform: string;
  price: number;
}> {
  return entries.map((entry) => ({
    date: entry.date || entry.capturedAt || new Date().toISOString(),
    platform: entry.platform || entry.platformName || "Unknown",
    price: entry.price,
  }));
}

/**
 * Group price history by platform for chart visualization
 */
export function groupPriceHistoryByPlatform(
  entries: PriceHistoryEntry[]
): Record<
  string,
  Array<{
    date: string;
    price: number;
  }>
> {
  const grouped: Record<
    string,
    Array<{
      date: string;
      price: number;
    }>
  > = {};

  entries.forEach((entry) => {
    const platform = entry.platform || entry.platformName || "Unknown";
    if (!grouped[platform]) {
      grouped[platform] = [];
    }
    grouped[platform].push({
      date: entry.date || entry.capturedAt || new Date().toISOString(),
      price: entry.price,
    });
  });

  return grouped;
}
