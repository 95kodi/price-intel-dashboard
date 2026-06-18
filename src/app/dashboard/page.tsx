"use client";
import { Package } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { PriceComparisonTable } from "@/components/dashboard/PriceComparisonTable";
import { ScanButton } from "@/components/dashboard/ScanButton";
import { WinLossPieChart, BrandGapBarChart, CompetitorCoverageChart } from "@/components/charts/DashboardCharts";
import { useDashboardSummary } from "@/hooks/useQueries";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const { data: summary } = useDashboardSummary();

  return (
    <div>
      <PageHeader title="Dashboard Overview" meta={summary ? `Last scan: ${formatDateTime(summary.lastScanTime)}` : undefined}>
        <ScanButton />
        <Link href="/products">
          <Button variant="outline" size="sm">
            <Package size={14} />
            Product Catalog
          </Button>
        </Link>
        <div className="w-8 h-8 rounded-full bg-blue-700 text-white text-xs font-medium flex items-center justify-center">
          RK
        </div>
      </PageHeader>

      <div className="p-6">
        <KpiCards />
        <PriceComparisonTable />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <WinLossPieChart />
          <BrandGapBarChart />
          <CompetitorCoverageChart />
        </div>
      </div>
    </div>
  );
}
