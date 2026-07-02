"use client";
import { Package, Globe } from "lucide-react";
import { useDashboardSummary, useCompetitorCoverage } from "@/hooks/useQueries";
import { KpiCardSkeleton } from "@/components/ui/Skeleton";

const COMPETITOR_ICONS: Record<string, string> = {
  Amazon: "bg-amber-50 text-amber-600",
  Flipkart: "bg-indigo-50 text-indigo-600",
  Poorvika: "bg-emerald-50 text-emerald-600",
  Croma: "bg-purple-50 text-purple-600",
  "Reliance Digital": "bg-rose-50 text-rose-600",
  Sangeetha: "bg-orange-50 text-orange-600",
  "The Chennai Mobiles": "bg-teal-50 text-teal-600",
  Sathya: "bg-pink-50 text-pink-600",
};

export function KpiCards() {
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useDashboardSummary();
  const { data: coverage, isLoading: covLoading, isError: covError } = useCompetitorCoverage();

  if (summaryLoading || covLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (summaryError || covError || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="col-span-full bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          Couldn&apos;t load summary metrics.
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Total Products", value: summary.totalProducts.toString(), sub: "Active products tracked", icon: Package, iconStyle: "bg-blue-50 text-blue-600" },
    ...(coverage?.map((c) => ({
      label: c.competitor === "The Chennai Mobiles" ? "Chennai Mobiles" : c.competitor,
      value: `${c.percentage}%`,
      sub: `${c.count} of ${c.total} products`,
      icon: Globe,
      iconStyle: COMPETITOR_ICONS[c.competitor] || "bg-gray-50 text-gray-600",
    })) ?? []),
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">{card.label}</span>
              <div className={`w-7 h-7 rounded-lg ${card.iconStyle} flex items-center justify-center`}>
                <Icon size={14} />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
