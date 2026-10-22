import { API_BASE } from "./api-client";

export interface PlatformPriceEntry {
  ProductID: number;
  ProductPlatformID: number;
  ItemName: string;
  PlatformID: number;
  PlatformName: string;
  ProductURL: string;
  Price: number;
}

export async function getPlatformPriceHistory(productId: number): Promise<PlatformPriceEntry[]> {
  const response = await fetch(
    `${API_BASE}/platform-price-history/product/${productId}`
  );
  if (!response.ok) throw new Error("Failed to fetch platform price history");
  return response.json();
}
