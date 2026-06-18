"use client";
import { Package, Globe } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useQueries";
import { KpiCardSkeleton } from "@/components/ui/Skeleton";

export function KpiCards() {
  const { data, isLoading, isError } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="col-span-full bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          Couldn&apos;t load summary metrics.
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: "Total Products",
      value: data.totalProducts.toString(),
      sub: "Active listings tracked",
      icon: Package,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Amazon Coverage",
      value: `${data.amazonCoverage?.percentage ?? 0}%`,
      sub: `${data.amazonCoverage?.count ?? 0} of ${data.totalProducts} products`,
      icon: Globe,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Flipkart Coverage",
      value: `${data.flipkartCoverage?.percentage ?? 0}%`,
      sub: `${data.flipkartCoverage?.count ?? 0} of ${data.totalProducts} products`,
      icon: Globe,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      label: "Poorvika Coverage",
      value: `${data.poorvikaCoverage?.percentage ?? 0}%`,
      sub: `${data.poorvikaCoverage?.count ?? 0} of ${data.totalProducts} products`,
      icon: Globe,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Sangeetha Coverage",
      value: `${data.sangeethaCoverage?.percentage ?? 0}%`,
      sub: `${data.sangeethaCoverage?.count ?? 0} of ${data.totalProducts} products`,
      icon: Globe,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">{card.label}</span>
              <div className={`w-7 h-7 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <Icon size={14} className={card.iconColor} />
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
