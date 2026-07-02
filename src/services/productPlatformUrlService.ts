export interface PlatformUrlItem {
  ProductPlatformID: number;
  PlatformID: number;
  PlatformName: string;
  ProductURL: string;
}

export interface ProductPlatformUrlResponse {
  success: boolean;
  ProductID: number;
  ItemName: string;
  Brand: string;
  ModelName: string;
  Platforms?: PlatformUrlItem[] | null;
}

export interface SaveProductPlatformUrlPayload {
  ProductPlatformID: number;
  ProductID: number;
  PlatformID: number;
  ProductURL: string;
  IsActive: number;
}

export async function getProductPlatformUrls(productId: number): Promise<ProductPlatformUrlResponse> {
  const response = await fetch(
    `https://api.gogizmo.co/product-platform-url/product/${productId}`
  );
  if (!response.ok) throw new Error("Failed to fetch product platform URLs");
  return response.json();
}

export async function saveProductPlatformUrl(payload: SaveProductPlatformUrlPayload): Promise<unknown> {
  console.log("Save Product URL Payload", JSON.stringify(payload, null, 2));
  const response = await fetch("https://api.gogizmo.co/product-platform-url/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.message || "Failed to save product URL");
  }
  return response.json();
}
