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
  CurrentPrice: number | null;
  LastUpdated: string | null;
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

export interface ProductsPage {
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
  data: CatalogProduct[];
}

// The API caps page_size at 100, and supports no search/filter params.
const MAX_PAGE_SIZE = 100;

export async function getProductsPage(
  page: number,
  pageSize: number
): Promise<ProductsPage> {
  const response = await fetch(
    `https://api.gogizmo.co/products/?page=${page}&page_size=${Math.min(pageSize, MAX_PAGE_SIZE)}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }
  return response.json();
}

let allProductsCache: Promise<CatalogProduct[]> | null = null;

// Walks every page. Only needed when we have to search/filter across the whole
// catalog, since the API can't do it for us.
export function getProducts(): Promise<CatalogProduct[]> {
  allProductsCache ??= fetchAllProducts().catch((err) => {
    allProductsCache = null;
    throw err;
  });
  return allProductsCache;
}

export function invalidateProductsCache() {
  allProductsCache = null;
}

async function fetchAllProducts(): Promise<CatalogProduct[]> {
  const first = await getProductsPage(1, MAX_PAGE_SIZE);
  const totalPages = first.total_pages ?? 1;
  if (totalPages <= 1) {
    return first.data ?? [];
  }
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => getProductsPage(i + 2, MAX_PAGE_SIZE))
  );
  return rest.reduce((acc, page) => acc.concat(page.data ?? []), [...(first.data ?? [])]);
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
