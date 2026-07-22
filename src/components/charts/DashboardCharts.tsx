"use client";
import { useMemo, useState, type ReactNode } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LabelList,
} from "recharts";
import { Download, Maximize2, X } from "lucide-react";
import { useProductsWithPrices, useCompetitorCoverage } from "@/hooks/useQueries";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";

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

// Two-series categorical pair, validated (normal ΔE 37.1, worst CVD 21.0).
const SERIES_OURS = "#4f46e5";
const SERIES_MARKET = "#10b981";

const rupees = (v: number) => `₹${v.toLocaleString("en-IN")}`;
const rupeesShort = (v: number) => `₹${Math.round(v / 1000)}k`;
const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

function NoData() {
  return <div className="h-40 flex items-center justify-center text-sm text-ink-muted">No data</div>;
}

/**
 * Where each competitor stands: how much of our catalog they list, and how
 * often they undercut everyone. Both series count products, so they share one
 * axis — this replaces the separate coverage / missing / winner charts.
 */
export function CompetitorBenchmarkChart() {
  const { products, coverage, isLoading, isError, refetch } = useChartData();
  const data = useMemo(() => {
    if (!coverage) return [];
    const wins: Record<string, number> = {};
    for (const p of products ?? []) {
      if (p.lowestPlatform) wins[p.lowestPlatform] = (wins[p.lowestPlatform] || 0) + 1;
    }
    return coverage
      .map((c) => ({ name: c.competitor, Listed: c.count, Cheapest: wins[c.competitor] ?? 0 }))
      .sort((a, b) => b.Listed - a.Listed || b.Cheapest - a.Cheapest);
  }, [products, coverage]);

  if (isLoading) return <ChartSkeleton />;
  if (isError || !coverage) return <ErrorState onRetry={() => refetch()} />;

  return (
    <ChartCard title="Competitor Benchmark" subtitle="Products listed vs. times cheapest" data={data}>
      {(height) =>
        data.length === 0 ? (
          <NoData />
        ) : (
          <ResponsiveContainer width="100%" height={height + 40}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_STROKE} />
              <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(79,70,229,0.04)" }} />
              <Legend iconSize={8} iconType="circle" />
              <Bar dataKey="Listed" fill={SERIES_OURS} radius={[0, 4, 4, 0]} maxBarSize={12} animationDuration={600} />
              <Bar dataKey="Cheapest" fill={SERIES_MARKET} radius={[0, 4, 4, 0]} maxBarSize={12} animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        )
      }
    </ChartCard>
  );
}

// Status palette. Slice order matters: green and red must not touch (deutan
// ΔE 5.8), so the neutral "matching" slice always sits between them.
const POSITION_SLICES = [
  { key: "winning" as const, label: "Cheaper than market", color: "#059669" },
  { key: "matching" as const, label: "Matching cheapest", color: "#94a3b8" },
  { key: "losing" as const, label: "Above market", color: "#e11d48" },
  { key: "unknown" as const, label: "Not listed anywhere", color: "#e2e8f0" },
];

/** The headline question: on how many products are we actually competitive? */
export function PricePositionChart() {
  const { products, isLoading, isError, refetch } = useChartData();
  const data = useMemo(() => {
    if (!products) return [];
    return POSITION_SLICES.map(({ key, label, color }) => ({
      name: label,
      value: products.filter((p) => p.status === key).length,
      color,
    })).filter((d) => d.value > 0);
  }, [products]);

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <ChartCard title="Price Position" subtitle="How our price compares to the cheapest competitor" data={data}>
      {(height) =>
        data.length === 0 ? (
          <NoData />
        ) : (
          <ResponsiveContainer width="100%" height={height + 40}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={3}
                cornerRadius={4}
                animationDuration={600}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={{ stroke: "#cbd5e1" }}
                style={{ fontSize: 11, fill: "#6b7280" }}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [v, "Products"]} />
              <Legend iconSize={8} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )
      }
    </ChartCard>
  );
}

/** The action list: which products are costing us the most versus the market. */
export function BiggestPriceGapsChart() {
  const { products, isLoading, isError, refetch } = useChartData();
  const data = useMemo(() => {
    if (!products) return [];
    return products
      .filter((p) => (p.priceGap ?? 0) > 0)
      .sort((a, b) => (b.priceGap ?? 0) - (a.priceGap ?? 0))
      .slice(0, 8)
      .map((p) => ({
        name: truncate(p.ItemName, 26),
        gap: p.priceGap ?? 0,
        cheapestAt: p.lowestPlatform ?? "—",
      }));
  }, [products]);

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <ChartCard title="Biggest Price Gaps" subtitle="Products where we are furthest above the cheapest competitor" data={data}>
      {(height) =>
        data.length === 0 ? (
          <NoData />
        ) : (
          <ResponsiveContainer width="100%" height={height + 40}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_STROKE} />
              <XAxis type="number" tick={AXIS_TICK} tickFormatter={rupeesShort} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={170} tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(225,29,72,0.04)" }}
                formatter={(v, _n, item) => [`${rupees(Number(v))} above ${item.payload.cheapestAt}`, "Gap"]}
              />
              <Bar dataKey="gap" fill="#e11d48" radius={[0, 4, 4, 0]} maxBarSize={14} animationDuration={600} name="Gap vs cheapest">
                <LabelList dataKey="gap" position="right" formatter={(v) => rupees(Number(v))} style={{ fontSize: 10, fill: "#6b7280" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      }
    </ChartCard>
  );
}

/** Per-product detail behind the position split: our price against the market. */
export function PriceVsMarketChart() {
  const { products, isLoading, isError, refetch } = useChartData();
  const data = useMemo(() => {
    if (!products) return [];
    return products
      .filter((p) => p.CurrentPrice !== null && p.lowestPrice !== null)
      .slice(0, 12)
      .map((p) => ({
        name: truncate(p.ItemName, 18),
        "Our price": p.CurrentPrice ?? 0,
        "Cheapest competitor": p.lowestPrice ?? 0,
      }));
  }, [products]);

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <ChartCard title="Our Price vs. the Market" subtitle="Side by side with the cheapest competitor" data={data}>
      {(height) =>
        data.length === 0 ? (
          <NoData />
        ) : (
          <ResponsiveContainer width="100%" height={height + 40}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 60 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#6b7280" }} angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis tick={AXIS_TICK} tickFormatter={rupeesShort} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(79,70,229,0.04)" }} formatter={(v) => rupees(Number(v))} />
              <Legend iconSize={8} iconType="circle" />
              <Bar dataKey="Our price" fill={SERIES_OURS} radius={[4, 4, 0, 0]} maxBarSize={16} animationDuration={600} />
              <Bar dataKey="Cheapest competitor" fill={SERIES_MARKET} radius={[4, 4, 0, 0]} maxBarSize={16} animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        )
      }
    </ChartCard>
  );
}
