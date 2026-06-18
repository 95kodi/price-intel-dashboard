/**
 * Product Service
 * Handles all product-related API calls
 */

import { apiGet, apiPost } from "./api-client";
import type { Product, ApiListResponse, ApiSingleResponse } from "@/types";

/**
 * Fetch all products from backend
 */
export async function fetchProductsFromAPI(): Promise<Product[]> {
  try {
    const response = await apiGet<ApiListResponse<Product>>("/api/Product/GetAll");
    return response.data || [];
  } catch (error) {
    console.error("Failed to fetch products from API:", error);
    throw error;
  }
}

/**
 * Create a new product
 */
export async function createProductAPI(
  data: Omit<Product, "id" | "createdAt">
): Promise<Product> {
  try {
    const payload = {
      productName: data.name || data.productName,
      brand: data.brand,
      category: data.category,
      currentPrice: data.ourPrice || data.price,
      sku: data.sku,
      status: data.status,
    };

    const response = await apiPost<ApiSingleResponse<Product>>(
      "/api/Product/Add",
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Failed to create product:", error);
    throw error;
  }
}

/**
 * Get unique brands from products
 */
export async function fetchBrandsFromAPI(): Promise<string[]> {
  try {
    const products = await fetchProductsFromAPI();
    const brands = [...new Set(products.map((p) => p.brand))];
    return brands.sort();
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    throw error;
  }
}
