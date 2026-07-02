export interface UpdateUrlPayload {
  ProductPlatformID: number;
  ProductID: number;
  PlatformID: number;
  ProductURL: string;
}

export interface UpdateUrlResponse {
  success: boolean;
  message: string;
}

export async function updateProductUrl(payload: UpdateUrlPayload): Promise<UpdateUrlResponse> {
  console.log("Update URL Payload", JSON.stringify(payload, null, 2));
  const response = await fetch("https://api.gogizmo.co/urlmap/update-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.message || "Failed to update URL");
  }
  return response.json();
}
