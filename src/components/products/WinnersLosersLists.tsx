"use client";
import { Trophy, AlertTriangle } from "lucide-react";
import { useProductsWithPrices } from "@/hooks/useQueries";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { formatPrice } from "@/lib/utils";

export function WinnersLosersLists() {
  const { data: products, isLoading, isError, refetch } = useProductsWithPrices();

  const winners = (products ?? []).filter((p) => p.status === "winning");
  const losers = (products ?? []).filter((p) => p.status === "losing");

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <h2 className="text-sm font-semibold text-gray-900">Winning — {winners.length} products</h2>
        </div>
        {!winners.length ? (
          <EmptyState icon={Trophy} title="No winning products" description="None of your products currently beat all competitors." />
        ) : (
          <div className="space-y-2">
            {winners.map((p) => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Trophy size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.brand}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-green-700">{formatPrice(p.ourPrice)}</div>
                  <div className="text-[11px] text-gray-500">
                    Saving {formatPrice(Math.abs(p.priceGap ?? 0))}
                  </div>
                  <span className="inline-block mt-0.5 text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                    Hold price
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <h2 className="text-sm font-semibold text-gray-900">Losing — {losers.length} products</h2>
        </div>
        {!losers.length ? (
          <EmptyState icon={AlertTriangle} title="No losing products" description="None of your products are currently priced above competitors." />
        ) : (
          <div className="space-y-2">
            {losers.map((p) => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={16} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.brand}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-red-700">{formatPrice(p.ourPrice)}</div>
                  <div className="text-[11px] text-gray-500">Lowest: {formatPrice(p.lowestCompetitorPrice)}</div>
                  <span className="inline-block mt-0.5 text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                    Reduce by {formatPrice(Math.abs(p.priceGap ?? 0))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
