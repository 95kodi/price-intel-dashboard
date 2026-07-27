"use client";
import {
  IndianRupee,
  TrendingDown,
  ArrowLeftRight,
  Store,
  Medal,
  Clock,
  ExternalLink,
  Pencil,
  Plus,
  PackageX,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { LISTING_COPY, LISTING_DOT, LISTING_PILL, rupees } from "@/lib/viz";
import type { MarketRow, ProductInsights } from "@/lib/product-detail";

/** Marketplace monogram — no logo assets ship with the app. */
const MARK_TINT: Record<string, string> = {
  Amazon: "bg-amber-50 text-amber-700",
  Flipkart: "bg-sky-50 text-sky-700",
  Poorvika: "bg-rose-50 text-rose-700",
  Croma: "bg-violet-50 text-violet-700",
  "Reliance Digital": "bg-indigo-50 text-indigo-700",
  Sangeetha: "bg-emerald-50 text-emerald-700",
  "The Chennai Mobiles": "bg-teal-50 text-teal-700",
  Sathya: "bg-orange-50 text-orange-700",
};

export function MarketplaceMark({ label, size = 32 }: { label: string; size?: number }) {
  const tint = MARK_TINT[label] ?? "bg-gray-100 text-gray-600";
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={`${tint} rounded-lg flex items-center justify-center shrink-0 font-semibold tracking-tight`}
    >
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}

function StatusPill({ row }: { row: MarketRow }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset ${LISTING_PILL[row.status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${LISTING_DOT[row.status]}`} />
      {LISTING_COPY[row.status]}
    </span>
  );
}

/** Their price against ours, signed from our seat. */
function GapCell({ gap }: { gap: number | null }) {
  if (gap === null) return <span className="text-ink-muted">—</span>;
  if (gap === 0) return <span className="text-ink-muted tnum">Level</span>;
  const theyUndercut = gap < 0;
  return (
    <span className={`tnum font-medium ${theyUndercut ? "text-red-600" : "text-emerald-700"}`}>
      {theyUndercut ? "−" : "+"}
      {rupees(Math.abs(gap))}
    </span>
  );
}

interface TileProps {
  label: string;
  value: string;
  detail: React.ReactNode;
  icon: LucideIcon;
  tone?: "neutral" | "good" | "bad";
}

function Tile({ label, value, detail, icon: Icon, tone = "neutral" }: TileProps) {
  const iconTone =
    tone === "good"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "bad"
        ? "bg-red-50 text-red-500"
        : "bg-indigo-50 text-primary";
  const valueTone =
    tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-600" : "text-ink";

  return (
    <div className="bg-card border border-line rounded-2xl p-5 shadow-card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-ink-muted leading-snug">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${iconTone} flex items-center justify-center shrink-0`}>
          <Icon size={15} />
        </div>
      </div>
      <div className={`text-2xl font-semibold tracking-tight tnum ${valueTone}`}>{value}</div>
      <div className="text-[11px] text-ink-muted mt-1 leading-relaxed">{detail}</div>
    </div>
  );
}

/**
 * The six numbers that answer "are we competitive?" before any table is read.
 * The sixth is the catalog price date rather than a scan time — the API exposes
 * no scan log, and an invented "2 mins ago" is worse than an honest date.
 */
export function ProductKpis({
  insights,
  lastUpdated,
}: {
  insights: ProductInsights;
  lastUpdated: string | null;
}) {
  const { ourPrice, lowest, gapToCheapest, listed, rows, rank, spread } = insights;
  const losing = gapToCheapest !== null && gapToCheapest > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-6">
      <Tile
        label="Our price"
        value={ourPrice !== null ? rupees(ourPrice) : "—"}
        detail={ourPrice !== null ? "Listed in our catalog" : "No catalog price set"}
        icon={IndianRupee}
      />
      <Tile
        label="Lowest market price"
        value={lowest?.price != null ? rupees(lowest.price) : "—"}
        detail={lowest ? lowest.label : "No competitor price collected"}
        icon={TrendingDown}
        tone="good"
      />
      <Tile
        label="Price gap"
        value={gapToCheapest !== null ? rupees(Math.abs(gapToCheapest)) : "—"}
        detail={
          gapToCheapest === null
            ? "Needs our price and one competitor price"
            : gapToCheapest > 0
              ? "Higher than the cheapest seller"
              : gapToCheapest < 0
                ? "Below the cheapest competitor"
                : "Level with the cheapest seller"
        }
        icon={ArrowLeftRight}
        tone={gapToCheapest === null ? "neutral" : losing ? "bad" : "good"}
      />
      <Tile
        label="Competitors listed"
        value={`${listed.length}`}
        detail={`of ${rows.length} marketplaces tracked`}
        icon={Store}
        tone={listed.length === 0 ? "bad" : "neutral"}
      />
      <Tile
        label="Market position"
        value={rank ? `#${rank.rank}` : "—"}
        detail={rank ? `of ${rank.of} sellers, cheapest first` : "Not comparable yet"}
        icon={Medal}
        tone={rank ? (rank.rank === 1 ? "good" : rank.rank > rank.of / 2 ? "bad" : "neutral") : "neutral"}
      />
      <Tile
        label="Price updated"
        value={lastUpdated ? formatDate(lastUpdated) : "Never"}
        detail={
          // A spread needs two listings to mean anything; one listing is always ₹0.
          spread !== null && listed.length > 1
            ? `Market spread ${rupees(spread)} across ${listed.length} listings`
            : "Date our catalog price last changed"
        }
        icon={Clock}
      />
    </div>
  );
}

interface TableProps {
  insights: ProductInsights;
  onEditUrl: (row: MarketRow) => void;
  onAddUrl: () => void;
}

/** Every tracked marketplace, cheapest first — including the ones with no price. */
export function MarketplaceTable({ insights, onEditUrl, onAddUrl }: TableProps) {
  return (
    <section
      aria-label="Price comparison"
      className="bg-card border border-line rounded-2xl shadow-card overflow-hidden"
    >
      <header className="px-6 pt-6 pb-4">
        <h2 className="text-sm font-semibold text-ink tracking-tight">Price comparison</h2>
        <p className="text-xs text-ink-muted mt-0.5">
          Who sells this product, at what price, and how far that sits from ours.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/70 border-y border-line">
              <th className="text-left px-6 py-2.5 text-[10px] uppercase tracking-wide text-ink-muted font-medium">
                Marketplace
              </th>
              <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wide text-ink-muted font-medium">
                Price
              </th>
              <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wide text-ink-muted font-medium">
                Gap vs our price
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wide text-ink-muted font-medium">
                Status
              </th>
              <th className="text-right px-6 py-2.5 text-[10px] uppercase tracking-wide text-ink-muted font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {insights.rows.map((row) => (
              <tr
                key={row.label}
                className={`border-b border-line last:border-0 hover:bg-gray-50/60 transition-colors ${
                  row.price === null ? "opacity-70" : ""
                }`}
              >
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2.5">
                    <MarketplaceMark label={row.label} />
                    <span className="font-medium text-ink">{row.label}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold tnum text-ink">
                  {row.price !== null ? rupees(row.price) : <span className="text-ink-muted">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <GapCell gap={row.gap} />
                </td>
                <td className="px-4 py-3">
                  <StatusPill row={row} />
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center justify-end gap-3">
                    {row.url ? (
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Open <ExternalLink size={11} />
                      </a>
                    ) : null}
                    {row.productPlatformId !== null ? (
                      <button
                        onClick={() => onEditUrl(row)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
                      >
                        <Pencil size={11} /> Edit URL
                      </button>
                    ) : (
                      <button
                        onClick={onAddUrl}
                        className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
                      >
                        <Plus size={11} /> Add URL
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The same rows as cards — the touch-friendly view of the table above. */
export function MarketplaceCards({
  insights,
  onEditUrl,
  onAddUrl,
}: {
  insights: ProductInsights;
  onEditUrl: (row: MarketRow) => void;
  onAddUrl: () => void;
}) {
  if (insights.listed.length === 0) {
    return (
      <section className="bg-card border border-line rounded-2xl shadow-card">
        <div className="flex flex-col items-center justify-center text-center py-14 px-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <PackageX size={26} className="text-amber-500" />
          </div>
          <h3 className="text-sm font-semibold text-ink">No Competitor URLs Added</h3>
          <p className="text-xs text-ink-muted mt-1 max-w-xs leading-relaxed">
            Add marketplace URLs to start tracking prices for this product.
          </p>
          <Button variant="primary" size="sm" className="mt-4" onClick={onAddUrl}>
            <Plus size={14} /> Add competitor URL
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {insights.listed.map((row) => (
        <div key={row.label} className="bg-card border border-line rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-3">
            <MarketplaceMark label={row.label} size={40} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink truncate">{row.label}</div>
              <div className="mt-1">
                <StatusPill row={row} />
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-3 mt-4 pt-4 border-t border-line">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-ink-muted">Their price</div>
              <div className="text-xl font-semibold tnum text-ink mt-0.5">
                {rupees(row.price as number)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-ink-muted">
                vs our price
              </div>
              <div className="mt-0.5 text-sm">
                <GapCell gap={row.gap} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            {row.url && (
              <a
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink size={12} /> Open product
              </a>
            )}
            {row.productPlatformId !== null ? (
              <button
                onClick={() => onEditUrl(row)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink"
              >
                <Pencil size={12} /> Edit URL
              </button>
            ) : (
              <button
                onClick={onAddUrl}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink"
              >
                <Plus size={12} /> Add URL
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
