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

const getBaseUrl = (): string => {
  // In browser environment
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "http://155.117.46.151:9200";
  }
  // In server environment
  return process.env.NEXT_PUBLIC_API_URL || "http://155.117.46.151:9200";
};

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
