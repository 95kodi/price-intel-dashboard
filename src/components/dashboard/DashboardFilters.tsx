"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { useProductsWithPrices } from "@/hooks/useQueries";
import { MARKETPLACES, positionOf, priceOf, type Position } from "@/lib/metrics";
import type { MergedProduct } from "@/types";

export type GapRange = "" | "over5000" | "over2000" | "under2000" | "winning";

interface FilterState {
  search: string;
  brand: string;
  marketplace: string;
  position: Position | "";
  gapRange: GapRange;
}

const EMPTY: FilterState = { search: "", brand: "", marketplace: "", position: "", gapRange: "" };

interface FilterContextValue extends FilterState {
  /** Every widget renders from this one slice, so the whole view agrees. */
  products: MergedProduct[];
  /** Unfiltered total, for "showing X of Y" affordances. */
  totalCount: number;
  brands: string[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
  activeCount: number;
  set: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  reset: () => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function useDashboardFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useDashboardFilters must be used inside <DashboardFilterProvider>");
  return ctx;
}

/**
 * Fetches the catalog once and filters in memory. Filtering server-side per
 * widget would re-walk the paginated catalog for every filter permutation.
 */
export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(EMPTY);
  const { data, isLoading, isError, isFetching, refetch } = useProductsWithPrices();

  // Stable reference: `data ?? []` would mint a new array every render and
  // invalidate every memo downstream.
  const all = useMemo(() => data ?? [], [data]);

  const brands = useMemo(
    () => [...new Set(all.map((p) => p.Brand).filter(Boolean))].sort(),
    [all]
  );

  const products = useMemo(() => {
    const marketplace = MARKETPLACES.find((m) => m.label === filters.marketplace);
    const term = filters.search.trim().toLowerCase();

    return all.filter((p) => {
      if (term && !`${p.ItemName} ${p.Brand}`.toLowerCase().includes(term)) return false;
      if (filters.brand && p.Brand !== filters.brand) return false;
      if (marketplace && priceOf(p, marketplace) === null) return false;
      if (filters.position && positionOf(p) !== filters.position) return false;

      const gap = p.priceGap;
      switch (filters.gapRange) {
        case "over5000":
          return gap !== null && gap >= 5000;
        case "over2000":
          return gap !== null && gap >= 2000;
        case "under2000":
          return gap !== null && gap > 0 && gap < 2000;
        case "winning":
          return gap !== null && gap < 0;
        default:
          return true;
      }
    });
  }, [all, filters]);

  const activeCount = (Object.keys(EMPTY) as Array<keyof FilterState>).filter(
    (k) => filters[k] !== EMPTY[k]
  ).length;

  const value: FilterContextValue = {
    ...filters,
    products,
    totalCount: all.length,
    brands,
    isLoading,
    isError,
    isFetching,
    refetch,
    activeCount,
    set: (key, v) => setFilters((f) => ({ ...f, [key]: v })),
    reset: () => setFilters(EMPTY),
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

/** One filter row, above everything it scopes. */
export function DashboardFilterBar() {
  const f = useDashboardFilters();

  return (
    <div className="bg-card border border-line rounded-2xl px-4 py-3 shadow-card flex flex-wrap items-center gap-2">
      <div className="relative w-full lg:flex-1 lg:w-auto lg:min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
        <Input
          placeholder="Search products or brands..."
          className="pl-9"
          value={f.search}
          onChange={(e) => f.set("search", e.target.value)}
          aria-label="Search products"
        />
      </div>

      <Select
        value={f.brand}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => f.set("brand", e.target.value)}
        className="w-[calc(50%-0.25rem)] sm:w-auto sm:min-w-[9rem] lg:w-36"
        aria-label="Filter by brand"
      >
        <option value="">All brands</option>
        {f.brands.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </Select>

      <Select
        value={f.marketplace}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => f.set("marketplace", e.target.value)}
        className="w-[calc(50%-0.25rem)] sm:w-auto sm:min-w-[9rem] lg:w-44"
        aria-label="Filter by marketplace"
      >
        <option value="">All marketplaces</option>
        {MARKETPLACES.map((m) => (
          <option key={m.label} value={m.label}>Listed on {m.label}</option>
        ))}
      </Select>

      <Select
        value={f.position}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          f.set("position", e.target.value as Position | "")
        }
        className="w-[calc(50%-0.25rem)] sm:w-auto sm:min-w-[9rem] lg:w-44"
        aria-label="Filter by price position"
      >
        <option value="">Any position</option>
        <option value="cheapest">Cheapest in market</option>
        <option value="matching">Matching cheapest</option>
        <option value="above">Above market</option>
        <option value="unlisted">No competitor price</option>
      </Select>

      <Select
        value={f.gapRange}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          f.set("gapRange", e.target.value as GapRange)
        }
        className="w-[calc(50%-0.25rem)] sm:w-auto sm:min-w-[9rem] lg:w-40"
        aria-label="Filter by price gap"
      >
        <option value="">Any gap</option>
        <option value="over5000">Gap ≥ ₹5,000</option>
        <option value="over2000">Gap ≥ ₹2,000</option>
        <option value="under2000">Gap under ₹2,000</option>
        <option value="winning">We undercut market</option>
      </Select>

      {f.activeCount > 0 && (
        <button
          onClick={f.reset}
          className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X size={13} />
          Clear {f.activeCount}
        </button>
      )}

      <span className="text-xs text-ink-muted tnum ml-auto pl-2">
        {f.products.length === f.totalCount
          ? `${f.totalCount} products`
          : `${f.products.length} of ${f.totalCount}`}
      </span>
    </div>
  );
}
