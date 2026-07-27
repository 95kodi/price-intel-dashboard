"use client";
import { useState, type ReactNode } from "react";
import { Download, Maximize2, X, Clock, type LucideIcon } from "lucide-react";

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
  /** The business question this widget answers. Every widget must have one. */
  question: string;
  /** Rows behind the visual — becomes the CSV export (the table-view twin). */
  data?: Array<object>;
  /** Dimmed while a refetch is in flight, so there is no skeleton flash. */
  stale?: boolean;
  action?: ReactNode;
  className?: string;
  children: (expanded: boolean) => ReactNode;
}

export function ChartCard({
  title,
  question,
  data,
  stale,
  action,
  className,
  children,
}: ChartCardProps) {
  const [expanded, setExpanded] = useState(false);

  const header = (
    <div className="flex items-start gap-2 mb-5">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-ink tracking-tight">{title}</h3>
        <p className="text-xs text-ink-muted mt-0.5">{question}</p>
      </div>
      {action}
      {data && data.length > 0 && (
        <button
          onClick={() => downloadCsv(title, data)}
          title="Download data (CSV)"
          aria-label={`Download ${title} data as CSV`}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-ink hover:bg-gray-50 transition-colors shrink-0"
        >
          <Download size={14} />
        </button>
      )}
      <button
        onClick={() => setExpanded(true)}
        title="Expand"
        aria-label={`Expand ${title}`}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-ink hover:bg-gray-50 transition-colors shrink-0"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );

  return (
    <>
      <section
        aria-label={title}
        className={`bg-card border border-line rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow duration-200 flex flex-col ${className ?? ""}`}
      >
        {header}
        <div className={`flex-1 transition-opacity duration-200 ${stale ? "opacity-50" : ""}`}>
          {children(false)}
        </div>
      </section>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6"
          onClick={() => setExpanded(false)}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div
            className="bg-card rounded-2xl border border-line w-full max-w-5xl max-h-[88vh] overflow-y-auto p-8 shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-2 mb-6">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-ink tracking-tight">{title}</h3>
                <p className="text-sm text-ink-muted mt-0.5">{question}</p>
              </div>
              <button
                onClick={() => setExpanded(false)}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-ink hover:bg-gray-50 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            {children(true)}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Shown where the metric is real and wanted but the API exposes no data for it
 * yet. Deliberately states what is missing instead of rendering a plausible
 * number — a pricing manager acting on invented history is a business risk.
 */
export function AwaitingData({
  icon: Icon = Clock,
  headline,
  detail,
  requires,
}: {
  icon?: LucideIcon;
  headline: string;
  detail: string;
  requires?: string;
}) {
  return (
    <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center px-6 py-8 rounded-xl border border-dashed border-line bg-gray-50/50">
      <div className="w-10 h-10 rounded-full bg-white border border-line flex items-center justify-center mb-3">
        <Icon size={17} className="text-gray-400" />
      </div>
      <p className="text-sm font-medium text-ink">{headline}</p>
      <p className="text-xs text-ink-muted mt-1 max-w-xs leading-relaxed">{detail}</p>
      {requires && (
        <code className="mt-3 text-[10px] text-ink-muted bg-white border border-line rounded-md px-2 py-1">
          {requires}
        </code>
      )}
    </div>
  );
}

export function NoData({ message = "No products match the current filters" }: { message?: string }) {
  return (
    <div className="h-full min-h-[180px] flex items-center justify-center text-sm text-ink-muted text-center px-6">
      {message}
    </div>
  );
}
