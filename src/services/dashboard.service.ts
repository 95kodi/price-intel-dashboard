import type { PriceComparisonItem } from "@/types";

export interface DashboardSummaryData {
  totalProducts: number;
  amazonProducts: number;
  flipkartProducts: number;
  poorvikaProducts: number;
  sangeethaProducts: number;
}

export interface CompetitorCoverageItem {
  competitor: string;
  productCount: number;
}

export interface KpiCardsData {
  totalProducts: number;
  amazonCoverage: { count: number; percentage: number };
  flipkartCoverage: { count: number; percentage: number };
  poorvikaCoverage: { count: number; percentage: number };
  sangeethaCoverage: { count: number; percentage: number };
}

/**
 * Calculates Dashboard Summary data
 */
export function calculateDashboardSummary(items: PriceComparisonItem[]): DashboardSummaryData {
  const totalProducts = items.length;
  const amazonProducts = items.filter((item) => item.AmazonPrice !== null).length;
  const flipkartProducts = items.filter((item) => item.FlipkartPrice !== null).length;
  const poorvikaProducts = items.filter((item) => item.PoorvikaPrice !== null).length;
  const sangeethaProducts = items.filter((item) => item.SangeethaPrice !== null).length;

  return {
    totalProducts,
    amazonProducts,
    flipkartProducts,
    poorvikaProducts,
    sangeethaProducts,
  };
}

/**
 * Calculates Competitor Coverage Chart data
 */
export function calculateCompetitorCoverage(items: PriceComparisonItem[]): CompetitorCoverageItem[] {
  const summary = calculateDashboardSummary(items);
  return [
    { competitor: "Amazon", productCount: summary.amazonProducts },
    { competitor: "Flipkart", productCount: summary.flipkartProducts },
    { competitor: "Poorvika", productCount: summary.poorvikaProducts },
    { competitor: "Sangeetha", productCount: summary.sangeethaProducts },
  ];
}

/**
 * Calculates KPI Cards data
 */
export function calculateKpiCards(items: PriceComparisonItem[]): KpiCardsData {
  const summary = calculateDashboardSummary(items);
  const total = summary.totalProducts;

  const getPercentage = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

  return {
    totalProducts: total,
    amazonCoverage: {
      count: summary.amazonProducts,
      percentage: getPercentage(summary.amazonProducts),
    },
    flipkartCoverage: {
      count: summary.flipkartProducts,
      percentage: getPercentage(summary.flipkartProducts),
    },
    poorvikaCoverage: {
      count: summary.poorvikaProducts,
      percentage: getPercentage(summary.poorvikaProducts),
    },
    sangeethaCoverage: {
      count: summary.sangeethaProducts,
      percentage: getPercentage(summary.sangeethaProducts),
    },
  };
}
