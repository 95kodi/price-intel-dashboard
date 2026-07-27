"use client";
import { Download, Bell } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { PriceComparisonTable, exportCsv } from "@/components/dashboard/PriceComparisonTable";
import { DownloadAgentButton } from "@/components/dashboard/DownloadAgentButton";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import {
  DashboardFilterProvider,
  DashboardFilterBar,
  useDashboardFilters,
} from "@/components/dashboard/DashboardFilters";
import { PricePositionBar } from "@/components/charts/PricePositionBar";
import { CompetitorWinsChart } from "@/components/charts/CompetitorWinsChart";
import { BiggestGapsList } from "@/components/charts/BiggestGapsList";
import { PriceDumbbell } from "@/components/charts/PriceDumbbell";
import { CompetitorHeatmap } from "@/components/charts/CompetitorHeatmap";
import { PriceGapTrend } from "@/components/charts/PriceGapTrend";
import { useNotifications } from "@/hooks/useQueries";
import { Button } from "@/components/ui/Button";

function HeaderActions() {
  const { products } = useDashboardFilters();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <>
      <DownloadAgentButton />
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportCsv(products)}
        disabled={products.length === 0}
      >
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
    </>
  );
}

function DashboardBody() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Competitive price position across 8 marketplaces"
      >
        <HeaderActions />
      </PageHeader>

      <div className="p-5 sm:p-8 space-y-6 max-w-[1600px] mx-auto">
        {/* One filter row, above everything it scopes. */}
        <DashboardFilterBar />

        <KpiCards />

        <PriceComparisonTable />

        {/* Two questions of the same shape sit side by side. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PricePositionBar />
          <CompetitorWinsChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BiggestGapsList />
          <PriceGapTrend />
        </div>

        {/* The heatmap is the widest artefact; alerts ride beside it as a rail. */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2">
            <CompetitorHeatmap />
          </div>
          <AlertsPanel />
        </div>

        <PriceDumbbell />
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <DashboardFilterProvider>
      <DashboardBody />
    </DashboardFilterProvider>
  );
}
