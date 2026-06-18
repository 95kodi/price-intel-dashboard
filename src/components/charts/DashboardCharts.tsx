"use client";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useDashboardSummary, useBrandPriceGaps, useCompetitorCoverage } from "@/hooks/useQueries";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { formatPrice } from "@/lib/utils";

const STATUS_COLORS = { winning: "#16a34a", losing: "#dc2626", matching: "#2563eb" };

export function WinLossPieChart() {
  const { data, isLoading, isError, refetch } = useDashboardSummary();
  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!data) return null;

  const chartData = [
    { name: "Winning", value: data.winningProducts, color: STATUS_COLORS.winning },
    { name: "Losing", value: data.losingProducts, color: STATUS_COLORS.losing },
    { name: "Matching", value: data.matchingProducts, color: STATUS_COLORS.matching },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-xs font-medium text-gray-500 mb-3">Winning vs Losing Products</h3>
      <div className="flex items-center gap-4 mb-2 text-xs text-gray-600">
        {chartData.map((d) => (
          <span key={d.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
            {d.name} {d.value}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [`${value} products`, name]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BrandGapBarChart() {
  const { data, isLoading, isError, refetch } = useBrandPriceGaps();
  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-xs font-medium text-gray-500 mb-3">Average Price Gap by Brand</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="brand" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
          <Tooltip formatter={(value) => [formatPrice(value as number), "Avg Gap"]} />
          <Bar dataKey="avgGap" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompetitorCoverageChart() {
  const { data, isLoading, isError, refetch } = useCompetitorCoverage();
  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!data) return null;

  const sorted = [...data].sort((a, b) => b.productCount - a.productCount);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:col-span-2">
      <h3 className="text-xs font-medium text-gray-500 mb-3">Competitor Coverage — Products Tracked</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis dataKey="competitor" type="category" width={110} tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value) => [`${value} products`, "Coverage"]} />
          <Bar dataKey="productCount" fill="#2563eb" radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
