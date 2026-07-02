export interface CatalogProduct {
  ProductID: number;
  ItemCode: string;
  Brand: string;
  ModelName: string;
  RAM: string;
  StorageSize: string;
  ColorName: string;
  VariantName: string;
  ItemName: string;
  Category: string;
  SubCategory: string;
  IsActive: boolean;
  CreatedOn: string;
}

export interface ProductPayload {
  ProductID: number;
  ItemCode: string;
  Brand: string;
  ModelName: string;
  RAM: string;
  StorageSize: string;
  ColorName: string;
  VariantName: string;
  ItemName: string;
  Category: string;
  SubCategory: string;
  IsActive: boolean;
}

export async function getProducts(): Promise<CatalogProduct[]> {
  const response = await fetch("https://api.gogizmo.co/products/");
  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function getProductById(productId: number): Promise<CatalogProduct> {
  const response = await fetch(`https://api.gogizmo.co/products/${productId}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error("Product not found");
    throw new Error("Failed to load product");
  }
  return response.json();
}

export async function createProduct(product: ProductPayload): Promise<CatalogProduct> {
  return saveProduct(product);
}

async function saveProduct(product: ProductPayload): Promise<CatalogProduct> {
  const response = await fetch("https://api.gogizmo.co/products/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.message || "Failed to create product");
  }
  return response.json();
}
