"use client";
import { useMemo } from "react";
import Link from "next/link";
import {
  Trophy,
  AlertTriangle,
  ArrowRight,
  Package,
  ArrowUpRight,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { useDashboardFilters } from "@/components/dashboard/DashboardFilters";
import {
  competitorPrices,
  positionOf,
  priorityOf,
  type Priority,
  type Position,
} from "@/lib/metrics";
import {
  POSITION_BADGE,
  POSITION_DOT,
  POSITION_PILL,
  PRIORITY_COPY,
  PRIORITY_PILL,
  rupees,
} from "@/lib/viz";
import type { MergedProduct } from "@/types";

/**
 * Both panels are framed around our own price: the left says where we already
 * win, the right says what it costs us not to. No panel is named after a
 * competitor — a competitor only ever appears as the evidence for our position.
 */

const THUMB_TINTS = [
  "bg-indigo-50 text-indigo-600",
  "bg-emerald-50 text-emerald-600",
  "bg-amber-50 text-amber-600",
  "bg-sky-50 text-sky-600",
  "bg-rose-50 text-rose-600",
  "bg-violet-50 text-violet-600",
];

/**
 * The API carries no product imagery, so the thumbnail is a brand monogram
 * rather than a stock photo — it gives the card a scannable anchor without
 * implying a picture we do not have.
 */
function ProductThumb({ product }: { product: MergedProduct }) {
  const brand = product.Brand?.trim() || product.ItemName?.trim() || "?";
  const initials = brand.slice(0, 2).toUpperCase();
  const tint =
    THUMB_TINTS[
      [...brand].reduce((a, c) => a + c.charCodeAt(0), 0) % THUMB_TINTS.length
    ];

  return (
    <div
      aria-hidden
      className={`w-12 h-12 rounded-xl ${tint} flex items-center justify-center shrink-0 text-sm font-semibold tracking-tight`}
    >
      {initials || <Package size={18} />}
    </div>
  );
}

function StatusBadge({ position }: { position: Position }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset ${POSITION_PILL[position]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${POSITION_DOT[position]}`} />
      {POSITION_BADGE[position]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset shrink-0 ${PRIORITY_PILL[priority]}`}
    >
      {priority === "high" && <AlertTriangle size={9} className="-mt-px" />}
      {PRIORITY_COPY[priority]}
    </span>
  );
}

/** Panel chrome: heading, count, and the question the list answers. */
function Panel({
  tone,
  title,
  count,
  subtitle,
  children,
}: {
  tone: "good" | "bad";
  title: string;
  count: number;
  subtitle: string;
  children: React.ReactNode;
}) {
  const accent =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : "bg-red-50 text-red-700 ring-red-200";

  return (
    <section
      aria-label={title}
      className="bg-card border border-line rounded-2xl shadow-card flex flex-col"
    >
      <header className="px-6 pt-6 pb-4 border-b border-line">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-ink tracking-tight">{title}</h2>
          <span
            className={`text-[11px] font-semibold tnum px-2 py-0.5 rounded-md ring-1 ring-inset ${accent}`}
          >
            {count}
          </span>
        </div>
        <p className="text-xs text-ink-muted mt-1 leading-relaxed">{subtitle}</p>
      </header>
      <div className="p-6 flex-1">{children}</div>
    </section>
  );
}

/** Label over figure — the same two-line unit everywhere a price appears. */
function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  const color =
    tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-600" : "text-ink";
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className={`text-sm font-semibold tnum mt-0.5 truncate ${color}`}>{value}</div>
    </div>
  );
}

function WinnerCard({ product }: { product: MergedProduct }) {
  const ours = product.CurrentPrice ?? 0;
  const beaten = competitorPrices(product).filter((v) => v > ours).length;
  const saving = product.lowestPrice !== null ? product.lowestPrice - ours : null;

  return (
    <Link
      href={`/products/${product.ProductID}`}
      className="group block rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <ProductThumb product={product} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-ink truncate" title={product.ItemName}>
            {product.ItemName}
          </div>
          <div className="text-xs text-ink-muted mt-0.5 truncate">{product.Brand || "—"}</div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <StatusBadge position="cheapest" />
            <span className="text-[11px] text-ink-muted">
              Beats {beaten} {beaten === 1 ? "competitor" : "competitors"}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wide text-ink-muted">Our price</div>
          <div className="text-base font-semibold tnum text-emerald-700 mt-0.5">
            {rupees(ours)}
          </div>
          {saving !== null && saving > 0 && (
            <div className="text-[11px] text-emerald-700 tnum mt-0.5">
              {rupees(saving)} under market
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function LoserCard({ product }: { product: MergedProduct }) {
  const gap = product.priceGap ?? 0;
  const priority = priorityOf(gap);

  return (
    <div className="rounded-xl border border-red-100 bg-red-50/30 p-4 hover:border-red-200 transition-colors">
      <div className="flex items-start gap-3">
        <ProductThumb product={product} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/products/${product.ProductID}`}
            className="text-[13px] font-medium text-ink truncate block hover:text-primary transition-colors"
            title={product.ItemName}
          >
            {product.ItemName}
          </Link>
          <div className="text-xs text-ink-muted mt-0.5 truncate">{product.Brand || "—"}</div>
        </div>
        <PriorityBadge priority={priority} />
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-red-100">
        <Metric label="Our price" value={rupees(product.CurrentPrice ?? 0)} />
        <Metric
          label="Lowest market"
          value={product.lowestPrice !== null ? rupees(product.lowestPrice) : "—"}
        />
        <Metric label="Gap" value={`+${rupees(gap)}`} tone="bad" />
      </div>

      <div className="flex items-center justify-between gap-3 mt-3">
        <div className="text-[11px] text-ink-muted min-w-0 truncate">
          Lowest on{" "}
          <span className="font-medium text-ink">{product.lowestPlatform ?? "—"}</span>
        </div>
        <Link href={`/products/${product.ProductID}`} className="shrink-0">
          <Button variant="primary" size="sm">
            Update price
            <ArrowUpRight size={13} />
          </Button>
        </Link>
      </div>
    </div>
  );
}

/** Empty states carry the next action, not just the absence of rows. */
function PanelEmpty({
  icon: Icon,
  tint,
  title,
  lines,
  cta,
}: {
  icon: LucideIcon;
  /** An empty winners list is bad news; an empty losers list is good news. */
  tint: "good" | "warn";
  title: string;
  lines: string[];
  cta?: { label: string; href: string };
}) {
  const ring = tint === "good" ? "bg-emerald-100/60" : "bg-amber-100/60";
  const face = tint === "good" ? "bg-emerald-50" : "bg-amber-50";
  const mark = tint === "good" ? "text-emerald-500" : "text-amber-500";

  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className={`relative w-20 h-20 rounded-full ${face} flex items-center justify-center mb-4`}>
        <span className={`absolute inset-0 rounded-full ${ring} scale-75`} />
        <Icon size={28} className={`relative ${mark}`} />
      </div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {lines.map((l) => (
        <p key={l} className="text-xs text-ink-muted mt-1 max-w-xs leading-relaxed">
          {l}
        </p>
      ))}
      {cta && (
        <Link href={cta.href} className="mt-4">
          <Button variant="outline" size="sm">
            {cta.label}
            <ArrowRight size={13} />
          </Button>
        </Link>
      )}
    </div>
  );
}

const PAGE_SIZE = 12;

export function WinnersLosersLists() {
  const { products, isLoading, isError, refetch } = useDashboardFilters();

  const { winners, losers } = useMemo(() => {
    const winners: MergedProduct[] = [];
    const losers: MergedProduct[] = [];
    for (const p of products) {
      const position = positionOf(p);
      if (position === "cheapest") winners.push(p);
      else if (position === "above") losers.push(p);
    }
    // Widest margin first on the left, most expensive mistake first on the right.
    winners.sort((a, b) => (a.priceGap ?? 0) - (b.priceGap ?? 0));
    losers.sort((a, b) => (b.priceGap ?? 0) - (a.priceGap ?? 0));
    return { winners, losers };
  }, [products]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TableSkeleton rows={5} cols={1} />
        <TableSkeleton rows={5} cols={1} />
      </div>
    );
  }

  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Panel
        tone="good"
        title="🏆 Winning Products"
        count={winners.length}
        subtitle="Products where our price is the lowest across all competitors."
      >
        {winners.length === 0 ? (
          <PanelEmpty
            icon={Trophy}
            tint="warn"
            title="No Winning Products"
            lines={[
              "None of our products currently have the lowest price in the market.",
              "Review pricing to become more competitive.",
            ]}
            cta={{ label: "View price comparison", href: "/dashboard" }}
          />
        ) : (
          <div className="space-y-3">
            {winners.slice(0, PAGE_SIZE).map((p) => (
              <WinnerCard key={p.ProductID} product={p} />
            ))}
            {winners.length > PAGE_SIZE && (
              <p className="text-xs text-ink-muted pt-1">
                {winners.length - PAGE_SIZE} more winning products — narrow the filters to see them.
              </p>
            )}
          </div>
        )}
      </Panel>

      <Panel
        tone="bad"
        title="🔴 Needs Price Attention"
        count={losers.length}
        subtitle="Products where competitors are offering a lower price."
      >
        {losers.length === 0 ? (
          <PanelEmpty
            icon={CheckCircle2}
            tint="good"
            title="Nothing needs a price change"
            lines={[
              "No product in this selection is priced above the cheapest competitor.",
            ]}
            cta={{ label: "View price comparison", href: "/dashboard" }}
          />
        ) : (
          <div className="space-y-3">
            {losers.slice(0, PAGE_SIZE).map((p) => (
              <LoserCard key={p.ProductID} product={p} />
            ))}
            {losers.length > PAGE_SIZE && (
              <p className="text-xs text-ink-muted pt-1">
                {losers.length - PAGE_SIZE} more above market — narrow the filters to see them.
              </p>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
