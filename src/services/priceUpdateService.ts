export interface SavePriceHistoryPayload {
  PriceID: number;
  ProductPlatformID: number;
  Price: number;
  MRP: number;
  Discount: number;
  Source: string;
  IsActive: number;
}

export async function savePriceHistory(payload: SavePriceHistoryPayload): Promise<unknown> {
  const response = await fetch("https://api.gogizmo.co/platform-price-history/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.message || "Failed to save price");
  }
  return response.json();
}
