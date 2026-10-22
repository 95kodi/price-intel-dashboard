"use client";
import { useMemo } from "react";
import Link from "next/link";
import { productHref } from "@/lib/utils";
import { AlertTriangle, PackageX, EyeOff, CheckCircle2, ArrowRight } from "lucide-react";
import { useDashboardFilters } from "./DashboardFilters";
import { computeMetrics, missingOn, ACTION_THRESHOLD, positionOf } from "@/lib/metrics";
import { rupees } from "@/lib/viz";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";

type Severity = "critical" | "warning" | "info";

interface Alert {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  productId?: number;
  cta?: string;
}

const SEV_STYLE: Record<Severity, { ring: string; icon: string; Icon: typeof AlertTriangle }> = {
  critical: { ring: "ring-red-200 bg-red-50/60", icon: "text-red-600", Icon: AlertTriangle },
  warning: { ring: "ring-amber-200 bg-amber-50/60", icon: "text-amber-600", Icon: PackageX },
  info: { ring: "ring-slate-200 bg-slate-50/60", icon: "text-slate-500", Icon: EyeOff },
};

/**
 * Only alerts that can be stated truthfully from the current API.
 *
 * Deliberately absent: "competitor dropped price by X" and "failed scrape".
 * Both need a timestamped history or a scan log; `platform-price-history`
 * returns repeat observations with no capture time or guaranteed ordering, so a
 * "recent drop" could not be dated or even signed correctly.
 */
export function AlertsPanel() {
  const { products, isLoading, isError, refetch } = useDashboardFilters();

  const alerts = useMemo<Alert[]>(() => {
    const m = computeMetrics(products);
    const out: Alert[] = [];

    for (const row of m.biggestGaps.filter((r) => r.gap > ACTION_THRESHOLD).slice(0, 5)) {
      out.push({
        id: `gap-${row.product.ProductID}`,
        severity: row.priority === "high" ? "critical" : "warning",
        title: row.product.ItemName,
        detail: `${rupees(row.gap)} above ${row.cheapestAt}`,
        productId: row.product.ProductID,
        cta: "Update price",
      });
    }

    // Worst coverage hole, as one aggregate row rather than one per product.
    if (m.worstMissing) {
      out.push({
        id: `missing-${m.worstMissing.label}`,
        severity: "warning",
        title: `Missing on ${m.worstMissing.label}`,
        detail: `${m.worstMissing.count} product${m.worstMissing.count === 1 ? "" : "s"} have no ${m.worstMissing.label} listing to compare against`,
      });
    }

    for (const p of products.filter((x) => positionOf(x) === "unlisted").slice(0, 3)) {
      const missing = missingOn(p);
      out.push({
        id: `unlisted-${p.ProductID}`,
        severity: "info",
        title: p.ItemName,
        detail:
          missing.length === 8
            ? "No competitor price on any marketplace — nothing to benchmark"
            : `No comparable competitor price recorded`,
        productId: p.ProductID,
      });
    }

    return out;
  }, [products]);

  if (isLoading) return <ChartSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <section
      aria-label="Alerts"
      className="bg-card border border-line rounded-2xl shadow-card flex flex-col"
    >
      <div className="px-6 pt-6 pb-4 flex items-start gap-2">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-ink tracking-tight">Alerts</h3>
          <p className="text-xs text-ink-muted mt-0.5">What needs a decision today</p>
        </div>
        {alerts.length > 0 && (
          <span className="text-[11px] font-semibold text-ink-muted bg-gray-100 rounded-full px-2 py-0.5 tnum">
            {alerts.length}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-6 py-12">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-ink">Nothing needs attention</p>
          <p className="text-xs text-ink-muted mt-1">
            No product in this slice is more than {rupees(ACTION_THRESHOLD)} above the market.
          </p>
        </div>
      ) : (
        <ul className="px-4 pb-4 space-y-2 max-h-[420px] overflow-y-auto">
          {alerts.map((a) => {
            const s = SEV_STYLE[a.severity];
            const inner = (
              <div className={`flex items-start gap-3 p-3 rounded-xl ring-1 ring-inset ${s.ring}`}>
                <s.Icon size={15} className={`${s.icon} shrink-0 mt-0.5`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink truncate" title={a.title}>
                    {a.title}
                  </p>
                  <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">{a.detail}</p>
                  {a.cta && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary mt-1.5">
                      {a.cta} <ArrowRight size={10} />
                    </span>
                  )}
                </div>
              </div>
            );
            return (
              <li key={a.id}>
                {a.productId ? (
                  <Link href={productHref(a.productId)} className="block hover:opacity-80 transition-opacity">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="px-6 py-3 border-t border-line text-[10px] text-ink-muted leading-relaxed">
        Price-drop and failed-scrape alerts need timestamped scan history, which the API does not
        expose yet.
      </p>
    </section>
  );
}
