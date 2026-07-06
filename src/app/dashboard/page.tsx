"use client";
import { Download, Bell } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { PriceComparisonTable, exportCsv } from "@/components/dashboard/PriceComparisonTable";
import { ScanButton } from "@/components/dashboard/ScanButton";
import {
  CoverageBarChart,
  LowestPriceWinnerChart,
  BrandDistributionChart,
  AveragePriceByCompetitorChart,
  MissingPriceCoverageChart,
  CheapestPlatformTrendChart,
  ProductPriceSpreadChart,
  PriceGapAnalysisChart,
} from "@/components/charts/DashboardCharts";
import { useDashboardSummary, useProductsWithPrices, useNotifications } from "@/hooks/useQueries";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const { data: summary } = useDashboardSummary();
  const { data: products } = useProductsWithPrices();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={summary ? `Last updated ${formatDateTime(summary.lastScanTime)}` : "Loading latest scan..."}
      >
        <ScanButton />
        <Button variant="outline" size="sm" onClick={() => exportCsv(products ?? [])} disabled={!products?.length}>
          <Download size={14} />
          Export
        </Button>
        <Link
          href="/notifications"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-gray-50 hover:text-ink transition-colors"
        >
          <Bell size={15} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-danger text-white text-[9px] font-semibold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center leading-none">
              {unreadCount}
            </span>
          )}
        </Link>
        <button
          aria-label="Account"
          className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white text-xs font-semibold flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          RK
        </button>
      </PageHeader>

      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        <section aria-label="Overview">
          <KpiCards />
        </section>

        <section aria-label="Price comparison">
          <PriceComparisonTable />
        </section>

        <section aria-label="Competitor insights">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-ink tracking-tight">Competitor Insights</h2>
            <p className="text-sm text-ink-muted mt-1">Coverage, pricing, and gap analysis across marketplaces</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CoverageBarChart />
            <LowestPriceWinnerChart />
            <BrandDistributionChart />
            <AveragePriceByCompetitorChart />
            <MissingPriceCoverageChart />
            <CheapestPlatformTrendChart />
            <ProductPriceSpreadChart />
            <PriceGapAnalysisChart />
          </div>
        </section>
      </div>
    </div>
  );
}
