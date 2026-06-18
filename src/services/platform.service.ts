/**
 * Platform Service
 * Handles all platform/competitor-related API calls
 */

import { apiGet, apiPost } from "./api-client";
import type { Platform, Competitor, ApiListResponse, ApiSingleResponse } from "@/types";

/**
 * Fetch all platforms from backend
 */
export async function fetchPlatformsFromAPI(): Promise<Platform[]> {
  try {
    const response = await apiGet<ApiListResponse<Platform>>("/api/PlatformMaster/GetAll");
    return response.data || [];
  } catch (error) {
    console.error("Failed to fetch platforms from API:", error);
    throw error;
  }
}

/**
 * Create a new platform
 */
export async function createPlatformAPI(
  data: Omit<Platform, "id">
): Promise<Platform> {
  try {
    const payload = {
      platformName: data.name || data.platformName,
      platformCode: data.platformCode || (data.name || "").toUpperCase(),
      websiteUrl: data.website || data.websiteUrl,
      enabled: data.enabled !== false,
    };

    const response = await apiPost<ApiSingleResponse<Platform>>(
      "/api/PlatformMaster/Add",
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Failed to create platform:", error);
    throw error;
  }
}

/**
 * Convert Platform to Competitor format for UI compatibility
 */
export function platformToCompetitor(platform: Platform): Competitor {
  return {
    id: platform.id,
    name: platform.name || platform.platformName || "",
    website: platform.website || platform.websiteUrl || "",
    enabled: platform.enabled !== false,
    lastScan: platform.lastScan || null,
    productCount: platform.productCount || 0,
    platformName: platform.platformName,
    platformCode: platform.platformCode,
    websiteUrl: platform.websiteUrl,
  };
}

/**
 * Fetch all competitors (platforms converted to competitor format)
 */
export async function fetchCompetitorsFromAPI(): Promise<Competitor[]> {
  try {
    const platforms = await fetchPlatformsFromAPI();
    return platforms.map(platformToCompetitor);
  } catch (error) {
    console.error("Failed to fetch competitors:", error);
    throw error;
  }
}
