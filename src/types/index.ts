export interface Product {
  ProductID: number;
  ItemName: string;
  Brand: string;
  Category: string;
  IsActive: boolean;
}

export interface PriceComparison {
  ProductID: number;
  AmazonPrice: number | null;
  AmazonURL: string | null;
  FlipkartPrice: number | null;
  FlipkartURL: string | null;
  PoorvikaPrice: number | null;
  PoorvikaURL: string | null;
  CromaPrice: number | null;
  CromaURL: string | null;
  RelianceDigitalPrice: number | null;
  RelianceDigitalURL: string | null;
  SangeethaMobilesPrice: number | null;
  SangeethaMobilesURL: string | null;
  TheChennaiMobilesPrice: number | null;
  TheChennaiMobilesURL: string | null;
  sathyaPrice: number | null;
  sathyaURL: string | null;
}

export interface PriceComparisonResponse {
  success: boolean;
  count: number;
  data: PriceComparison[];
}

export interface MergedProduct {
  ProductID: number;
  ItemName: string;
  Brand: string;
  Category: string;
  AmazonPrice: number | null;
  AmazonURL: string | null;
  FlipkartPrice: number | null;
  FlipkartURL: string | null;
  PoorvikaPrice: number | null;
  PoorvikaURL: string | null;
  CromaPrice: number | null;
  CromaURL: string | null;
  RelianceDigitalPrice: number | null;
  RelianceDigitalURL: string | null;
  SangeethaMobilesPrice: number | null;
  SangeethaMobilesURL: string | null;
  TheChennaiMobilesPrice: number | null;
  TheChennaiMobilesURL: string | null;
  sathyaPrice: number | null;
  sathyaURL: string | null;
  lowestPrice: number | null;
  lowestPlatform: string | null;
}

export interface CompetitorCoverage {
  competitor: string;
  count: number;
  total: number;
  percentage: number;
}

export interface Platform {
  id: number;
  platformName?: string;
  name?: string;
  platformCode?: string;
  websiteUrl?: string;
  website?: string;
  enabled?: boolean;
  lastScan?: string | null;
  productCount?: number;
}

export interface Competitor extends Platform {
  id: number;
  name: string;
  website: string;
  enabled: boolean;
  lastScan: string | null;
  productCount: number;
}

export interface ProductUrl {
  id: number;
  productId: number;
  competitorId: number;
  competitorName: string;
  url: string;
}

export interface PriceHistory {
  id: number;
  productId: number;
  competitorId: number;
  competitorName: string;
  price: number;
  capturedAt: string;
}

export interface CompetitorPrice {
  competitorId: number;
  competitorName: string;
  price: number | null;
  url: string;
}

export interface ProductWithPrices extends Omit<Product, "id" | "status"> {
  id: string;
  name: string;
  brand: string;
  amazonPrice: number | null;
  amazonUrl: string | null;
  flipkartPrice: number | null;
  flipkartUrl: string | null;
  poorvikaPrice: number | null;
  poorvikaUrl: string | null;
  sangeethaPrice: number | null;
  sangeethaUrl: string | null;
  lowestPrice: number | null;
  lowestPlatform: string | null;
  ourPrice: number;
  competitorPrices: CompetitorPrice[];
  lowestCompetitorPrice: number | null;
  priceGap: number | null;
  status: PriceStatus;
}

export type PriceStatus = "winning" | "losing" | "matching" | "active" | "inactive";

export interface DashboardSummary {
  totalProducts: number;
  averagePriceGap: number;
  winningProducts: number;
  losingProducts: number;
  matchingProducts: number;
  lastScanTime: string;
  amazonCoverage?: { count: number; percentage: number };
  flipkartCoverage?: { count: number; percentage: number };
  poorvikaCoverage?: { count: number; percentage: number };
  sangeethaCoverage?: { count: number; percentage: number };
}

export interface Notification {
  id: number;
  type: "danger" | "warning" | "info" | "success";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  productId?: number;
  competitorId?: number;
}

export interface ScanResult {
  success: boolean;
  productsScanned: number;
  priceChanges: number;
  duration: number;
  completedAt: string;
}

export interface BrandPriceGap {
  brand: string;
  avgGap: number;
}

export interface ProductPlatform {
  id: number;
  productId: number;
  platformId: number;
  productUrl: string;
  product?: Product;
  platform?: Platform;
}

export interface PriceHistoryEntry {
  id?: number;
  date?: string;
  capturedAt?: string;
  platform?: string;
  platformName?: string;
  price: number;
  productId?: number;
  platformId?: number;
}

export interface PriceComparisonItem {
  ItemCode: string;
  ItemName: string;
  AmazonPrice: number | null;
  AmazonURL: string | null;
  FlipkartPrice: number | null;
  FlipkartURL: string | null;
  PoorvikaPrice: number | null;
  PoorvikaURL: string | null;
  SangeethaPrice: number | null;
  SangeethaURL: string | null;
}

export interface ApiListResponse<T> {
  data: T[];
  message?: string;
  success?: boolean;
}

export interface ApiSingleResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}
