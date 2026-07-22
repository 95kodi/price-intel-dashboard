"use client";
import { useMemo, useState, type ReactNode } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, ComposedChart, Line,
} from "recharts";
import { Download, Maximize2, X } from "lucide-react";
import { useProductsWithPrices, useCompetitorCoverage } from "@/hooks/useQueries";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";

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

const AXIS_TICK = { fontSize: 11, fill: "#6b7280" };
const GRID_STROKE = "#f1f5f9";

function downloadCsv(title: string, rows: Array<object>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc((r as Record<string, unknown>)[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  data?: Array<object>;
  children: (height: number) => ReactNode;
}

function ChartCard({ title, subtitle, data, children }: ChartCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="bg-card border border-line rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow duration-200">
        <div className="flex items-start gap-2 mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-ink tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
          </div>
          {data && data.length > 0 && (
            <button
              onClick={() => downloadCsv(title, data)}
              title="Download data (CSV)"
              aria-label={`Download ${title} data`}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-ink hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />
            </button>
          )}
          <button
            onClick={() => setExpanded(true)}
            title="Expand"
            aria-label={`Expand ${title}`}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-ink hover:bg-gray-50 transition-colors"
          >
            <Maximize2 size={14} />
          </button>
        </div>
        {children(260)}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6"
          onClick={() => setExpanded(false)}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div
            className="bg-card rounded-2xl border border-line w-full max-w-4xl p-8 shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-2 mb-6">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-ink tracking-tight">{title}</h3>
                {subtitle && <p className="text-sm text-ink-muted mt-0.5">{subtitle}</p>}
              </div>
              <button
                onClick={() => setExpanded(false)}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-ink hover:bg-gray-50 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            {children(440)}
          </div>
        </div>
      )}
    </>
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
    <ChartCard title="Product Coverage" subtitle="Listing coverage by competitor" data={coverage}>
      {(height) => (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={coverage} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_STROKE} />
            <XAxis type="number" tick={AXIS_TICK} domain={[0, 100]} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
            <YAxis dataKey="competitor" type="category" width={110} tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "rgba(79,70,229,0.04)" }} formatter={(v) => [`${v}%`, "Coverage"]} />
            <Bar dataKey="percentage" radius={[0, 6, 6, 0]} maxBarSize={18} animationDuration={600}>
              {coverage.map((entry, i) => (
                <Cell key={i} fill={COMPETITOR_COLS.find((c) => c.label === entry.competitor)?.color || "#4f46e5"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
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

  return (
    <ChartCard title="Lowest Price Winner" subtitle="Who is cheapest most often" data={data}>
      {(height) =>
        data.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-ink-muted">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={3} cornerRadius={4} animationDuration={600}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={8} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )
      }
    </ChartCard>
  );
}

const BRAND_COLORS = ["#4f46e5", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1", "#f97316", "#6b7280"];

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

  return (
    <ChartCard title="Brand Distribution" subtitle="Catalog mix by brand" data={data}>
      {(height) =>
        data.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-ink-muted">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="85%" paddingAngle={3} cornerRadius={4} animationDuration={600}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={8} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )
      }
    </ChartCard>
  );
}

export function AveragePriceByCompetitorChart() {
  const { products, isLoading, isError, refetch } = useChartData();
  const data = useMemo(() => {
    if (!products) return [];
    const mean = (values: number[]) =>
      values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

    const competitors = COMPETITOR_COLS.map(({ key, label, color }) => ({
      name: label,
      avg: mean(products.map((p) => p[key]).filter((p): p is number => p !== null && p > 0)),
      color,
    }));

    // Lead with our own average so competitors read against it.
    const ours = {
      name: "Us",
      avg: mean(products.map((p) => p.CurrentPrice).filter((p): p is number => p !== null && p > 0)),
      color: "#4f46e5",
    };

    return [ours, ...competitors].filter((d) => d.avg > 0);
  }, [products]);

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <ChartCard title="Average Pricing" subtitle="Our mean price vs. each competitor" data={data}>
      {(height) =>
        data.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-ink-muted">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(79,70,229,0.04)" }} />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]} maxBarSize={36} animationDuration={600} name="Avg. price">
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      }
    </ChartCard>
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
    <ChartCard title="Missing Products" subtitle="Available vs. missing listings per competitor" data={data}>
      {(height) => (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "rgba(79,70,229,0.04)" }} />
            <Legend iconSize={8} iconType="circle" />
            <Bar dataKey="Available" stackId="a" fill="#10b981" animationDuration={600} />
            <Bar dataKey="Missing" stackId="a" fill="#e5e7eb" radius={[6, 6, 0, 0]} animationDuration={600} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
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

  return (
    <ChartCard title="Competitor Performance" subtitle="Products won per competitor" data={data}>
      {(height) =>
        data.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-ink-muted">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_STROKE} />
              <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(79,70,229,0.04)" }} formatter={(v) => [v, "Products won"]} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={18} animationDuration={600}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      }
    </ChartCard>
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

  return (
    <ChartCard title="Price Distribution" subtitle="Individual prices per product across competitors" data={data}>
      {(height) =>
        data.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-ink-muted">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={height + 40}>
            <ScatterChart margin={{ top: 10, right: 20, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="product" tick={{ fontSize: 9, fill: "#6b7280" }} angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis dataKey="price" tick={AXIS_TICK} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip />
              <Scatter data={data} fill="#4f46e5" opacity={0.55} animationDuration={600} />
            </ScatterChart>
          </ResponsiveContainer>
        )
      }
    </ChartCard>
  );
}

export function PriceGapAnalysisChart() {
  const { products, isLoading, isError, refetch } = useChartData();
  const data = useMemo(() => {
    if (!products) return [];
    // Our price against the cheapest competitor, so the gap line reads as
    // "how far above/below the market we are" rather than competitor spread.
    return products
      .slice(0, 20)
      .map((p) => ({
        name: p.ItemName.length > 15 ? p.ItemName.slice(0, 15) + "..." : p.ItemName,
        ourPrice: p.CurrentPrice ?? 0,
        bestCompetitor: p.lowestPrice ?? 0,
        gap: p.priceGap ?? 0,
      }))
      .filter((d) => d.ourPrice > 0 || d.bestCompetitor > 0);
  }, [products]);

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <ChartCard title="Price Gap Analysis" subtitle="Our price vs. cheapest competitor" data={data}>
      {(height) =>
        data.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-ink-muted">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={height + 40}>
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#6b7280" }} angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis tick={AXIS_TICK} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(79,70,229,0.04)" }} />
              <Legend iconSize={8} iconType="circle" />
              <Bar dataKey="ourPrice" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={18} name="Our Price" animationDuration={600} />
              <Bar dataKey="bestCompetitor" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={18} name="Best Competitor" animationDuration={600} />
              <Line dataKey="gap" stroke="#ef4444" strokeWidth={2} name="Gap vs Best" dot={false} animationDuration={600} />
            </ComposedChart>
          </ResponsiveContainer>
        )
      }
    </ChartCard>
  );
}
