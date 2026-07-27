"use client";
import { PageHeader } from "@/components/layout/PageHeader";
import { WinnersLosersKpis } from "@/components/products/WinnersLosersKpis";
import { WinnersLosersLists } from "@/components/products/WinnersLosersLists";
import {
  DashboardFilterProvider,
  DashboardFilterBar,
} from "@/components/dashboard/DashboardFilters";

export default function WinnersLosersPage() {
  return (
    <DashboardFilterProvider>
      <PageHeader
        title="Winners & Losers"
        subtitle="Where our price wins, and what it costs us where it doesn't"
      />
      <div className="p-5 sm:p-8 space-y-6 max-w-[1600px] mx-auto">
        {/* One filter row, above every number it scopes. */}
        <DashboardFilterBar />

        <WinnersLosersKpis />

        {/* The API returns prices without capture times, so no card claims a
            "last updated" age — an invented freshness figure is worse than none. */}
        <WinnersLosersLists />
      </div>
    </DashboardFilterProvider>
  );
}
