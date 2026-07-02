"use client";
import { useMemo } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, ComposedChart, Line,
} from "recharts";
import { useProductsWithPrices, useCompetitorCoverage } from "@/hooks/useQueries";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { formatPrice } from "@/lib/utils";

const COMPETITOR_COLS = [
  { key: "AmazonPrice" as const, label: "Amazon", color: "#f59e0b" },
  { key: "FlipkartPrice" as const, label: "Flipkart", color: "#6366f1" },
  { key: "PoorvikaPrice" as const, label: "Poorvika", color: "#10b981" },
  { key: "CromaPrice" as const, label: "Croma", color: "#8b5cf6" },
  { key: "RelianceDigitalPrice" as const, label: "Reliance", color: "#f43f5e" },
  { key: "SangeethaMobilesPrice" as const, label: "Sangeetha", color: "#f97316" },
  { key: "TheChennaiMobilesPrice" as const, label: "Chennai Mobiles", color: "#14b8a6" },
  { key: "sathyaPrice" as const, label: "Sathya", color: "#ec4899" },
];

function ChartContainer({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className || ""}`}>
      <h3 className="text-xs font-medium text-gray-500 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function useChartData() {
  const { data: products, isLoading, isError, refetch } = useProductsWithPrices();
  const { data: coverage, isLoading: covLoading } = useCompetitorCoverage();
  return { products, coverage, isLoading: isLoading || covLoading, isError, refetch };
}

export function CoverageBarChart() {
  const { coverage, isLoading, isError, refetch } = useChartData();
  if (isLoading) return <ChartSkeleton />;
  if (isError || !coverage) return <ErrorState onRetry={() => refetch()} />;

  return (
    <ChartContainer title="Product Coverage by Competitor">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={coverage} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <YAxis dataKey="competitor" type="category" width={110} tick={{ fontSize: 12, fill: "#374151" }} />
          <Tooltip />
          <Bar dataKey="percentage" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {coverage.map((entry, i) => (
              <Cell key={i} fill={COMPETITOR_COLS.find((c) => c.label === entry.competitor)?.color || "#2563eb"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function LowestPriceWinnerChart() {
  const { products, isLoading, isError, refetch } = useChartData();
  const data = useMemo(() => {
    if (!products) return [];
    const counts: Record<string, number> = {};
    for (const p of products) {
      if (p.lowestPlatform) {
        counts[p.lowestPlatform] = (counts[p.lowestPlatform] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: COMPETITOR_COLS.find((c) => c.label === name)?.color || "#6b7280" }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (data.length === 0) return <ChartContainer title="Lowest Price Winner">No data</ChartContainer>;

  return (
    <ChartContainer title="Lowest Price Winner">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend iconSize={8} fontSize={11} />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

const BRAND_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1", "#f97316", "#6b7280"];

export function BrandDistributionChart() {
  const { products, isLoading, isError, refetch } = useChartData();
  const data = useMemo(() => {
    if (!products) return [];
    const counts: Record<string, number> = {};
    for (const p of products) {
      counts[p.Brand] = (counts[p.Brand] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value], i) => ({ name, value, color: BRAND_COLORS[i % BRAND_COLORS.length] }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (data.length === 0) return <ChartContainer title="Brand Distribution">No data</ChartContainer>;

  return (
    <ChartContainer title="Brand Distribution">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend iconSize={8} fontSize={11} />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function AveragePriceByCompetitorChart() {
  const { products, isLoading, isError, refetch } = useChartData();
  const data = useMemo(() => {
    if (!products) return [];
    return COMPETITOR_COLS.map(({ key, label, color }) => {
      const prices = products.map((p) => p[key]).filter((p): p is number => p !== null && p > 0);
      const avg = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
      return { name: label, avg, color };
    }).filter((d) => d.avg > 0);
  }, [products]);

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (data.length === 0) return <ChartContainer title="Average Price by Competitor">No data</ChartContainer>;

  return (
    <ChartContainer title="Average Price by Competitor">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
          <Tooltip />
          <Bar dataKey="avg" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function MissingPriceCoverageChart() {
  const { products, isLoading, isError, refetch } = useChartData();
  const data = useMemo(() => {
    if (!products) return [];
    const total = products.length;
    return COMPETITOR_COLS.map(({ key, label }) => {
      const available = products.filter((p) => p[key] !== null && p[key] > 0).length;
      return { name: label, Available: available, Missing: total - available };
    });
  }, [products]);

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <ChartContainer title="Missing Price Coverage">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
          <Tooltip />
          <Legend iconSize={8} fontSize={11} />
          <Bar dataKey="Available" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Missing" stackId="a" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function CheapestPlatformTrendChart() {
  const { products, isLoading, isError, refetch } = useChartData();
  const data = useMemo(() => {
    if (!products) return [];
    const counts: Record<string, number> = {};
    for (const p of products) {
      if (p.lowestPlatform) {
        counts[p.lowestPlatform] = (counts[p.lowestPlatform] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: COMPETITOR_COLS.find((c) => c.label === name)?.color || "#6b7280" }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (data.length === 0) return <ChartContainer title="Cheapest Platform Trend">No data</ChartContainer>;

  return (
    <ChartContainer title="Cheapest Platform Trend">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} />
          <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 12, fill: "#374151" }} />
          <Tooltip />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function ProductPriceSpreadChart() {
  const { products, isLoading, isError, refetch } = useChartData();
  const data = useMemo(() => {
    if (!products) return [];
    const result: Array<{ product: string; price: number; competitor: string }> = [];
    for (const p of products.slice(0, 30)) {
      for (const { key, label } of COMPETITOR_COLS) {
        const price = p[key];
        if (price !== null && price > 0) {
          result.push({ product: p.ItemName.length > 20 ? p.ItemName.slice(0, 20) + "..." : p.ItemName, price, competitor: label });
        }
      }
    }
    return result;
  }, [products]);

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (data.length === 0) return <ChartContainer title="Product Price Spread">No data</ChartContainer>;

  return (
    <ChartContainer title="Product Price Spread">
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 20, left: 80, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="product" tick={{ fontSize: 9, fill: "#64748b" }} angle={-45} textAnchor="end" height={80} interval={0} />
          <YAxis dataKey="price" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
          <Tooltip />
          <Scatter data={data} fill="#3b82f6" opacity={0.6} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function PriceGapAnalysisChart() {
  const { products, isLoading, isError, refetch } = useChartData();
  const data = useMemo(() => {
    if (!products) return [];
    return products.slice(0, 20).map((p) => {
      const prices = COMPETITOR_COLS.map((c) => p[c.key]).filter((pr): pr is number => pr !== null && pr > 0);
      const highest = prices.length > 0 ? Math.max(...prices) : 0;
      const lowest = prices.length > 0 ? Math.min(...prices) : 0;
      const gap = highest - lowest;
      return {
        name: p.ItemName.length > 15 ? p.ItemName.slice(0, 15) + "..." : p.ItemName,
        highest,
        lowest,
        gap,
      };
    }).filter((d) => d.highest > 0);
  }, [products]);

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (data.length === 0) return <ChartContainer title="Price Gap Analysis">No data</ChartContainer>;

  return (
    <ChartContainer title="Price Gap Analysis">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} angle={-45} textAnchor="end" height={80} interval={0} />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
          <Tooltip />
          <Legend iconSize={8} fontSize={11} />
          <Bar dataKey="highest" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={20} name="Highest Price" />
          <Bar dataKey="lowest" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} name="Lowest Price" />
          <Line dataKey="gap" stroke="#3b82f6" strokeWidth={2} name="Gap" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
