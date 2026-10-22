/**
 * Reusable API Client for backend communication
 * Handles base URL, error handling, and request/response typing
 */

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface ApiError extends Error {
  status?: number;
  response?: unknown;
}

/**
 * Base URL of the PHP API. The default "/api" is for Hostinger, where the
 * static dashboard sits in public_html and the API in public_html/api — same
 * origin, no CORS. Set NEXT_PUBLIC_API_URL (see .env.example) to point a
 * local `npm run dev` or another host at it; it is baked in at build time.
 */
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/+$/, "");

const getBaseUrl = (): string => API_BASE;

/**
 * Make a GET request to the API
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  try {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error: ApiError = new Error(`API Error: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    const data = (await response.json()) as T;
    return data;
  } catch (error) {
    console.error(`GET ${endpoint} failed:`, error);
    throw error;
  }
}

/**
 * Make a POST request to the API
 */
export async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  try {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error: ApiError = new Error(`API Error: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    const data = (await response.json()) as T;
    return data;
  } catch (error) {
    console.error(`POST ${endpoint} failed:`, error);
    throw error;
  }
}

/**
 * Make a PUT request to the API
 */
export async function apiPut<T>(endpoint: string, body: unknown): Promise<T> {
  try {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error: ApiError = new Error(`API Error: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    const data = (await response.json()) as T;
    return data;
  } catch (error) {
    console.error(`PUT ${endpoint} failed:`, error);
    throw error;
  }
}

/**
 * Make a DELETE request to the API
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  try {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error: ApiError = new Error(`API Error: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    const data = (await response.json()) as T;
    return data;
  } catch (error) {
    console.error(`DELETE ${endpoint} failed:`, error);
    throw error;
  }
}
