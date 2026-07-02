export interface PriceHistoryEntry {
  PriceID: number;
  Price: number;
  MRP: number;
  Discount: number;
  CaptureTime: string;
}

export interface PlatformPriceInfo {
  PlatformName: string;
  ProductURL: string;
  PriceHistory: PriceHistoryEntry[];
}

export interface PriceHistoryResponse {
  ProductID: number;
  ItemCode: string;
  ItemName: string;
  Platforms: Record<string, PlatformPriceInfo>;
}

export async function getPriceHistory(productId: number): Promise<PriceHistoryResponse> {
  const response = await fetch(
    `https://api.gogizmo.co/price-history/product/${productId}`
  );
  if (!response.ok) throw new Error("Failed to fetch price history");
  return response.json();
}
