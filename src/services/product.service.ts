/**
 * Product Service
 * Handles all product-related API calls
 */

import { apiGet, apiPost } from "./api-client";

export async function fetchProductsFromAPI(): Promise<any[]> {
  try {
    const response = await apiGet<any>("/api/Product/GetAll");
    return response.data || [];
  } catch (error) {
    console.error("Failed to fetch products from API:", error);
    throw error;
  }
}

export async function createProductAPI(
  data: any
): Promise<any> {
  try {
    const payload = {
      productName: data.name || data.productName,
      brand: data.brand,
      category: data.category,
      currentPrice: data.ourPrice || data.price,
      sku: data.sku,
      status: data.status,
    };

    const response = await apiPost<any>(
      "/api/Product/Add",
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Failed to create product:", error);
    throw error;
  }
}

export async function fetchBrandsFromAPI(): Promise<string[]> {
  try {
    const products = await fetchProductsFromAPI();
    const brands = [...new Set(products.map((p: any) => p.brand))];
    return brands.sort();
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    throw error;
  }
}
