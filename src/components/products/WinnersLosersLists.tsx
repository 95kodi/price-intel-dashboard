"use client";
import { Trophy, AlertTriangle } from "lucide-react";
import { useProductsWithPrices } from "@/hooks/useQueries";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { formatPrice } from "@/lib/utils";

export function WinnersLosersLists() {
  const { data: products, isLoading, isError, refetch } = useProductsWithPrices();

  const sangeethaCheapest = (products ?? []).filter(
    (p) => p.lowestPlatform === "Sangeetha" || (p.lowestPlatform === "Sangeetha Mobiles")
  );
  const othersCheapest = (products ?? []).filter(
    (p) => p.lowestPlatform !== null && p.lowestPlatform !== "Sangeetha" && p.lowestPlatform !== "Sangeetha Mobiles"
  );

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
          <h2 className="text-sm font-semibold text-gray-900">Best on Sangeetha — {sangeethaCheapest.length} products</h2>
        </div>
        {!sangeethaCheapest.length ? (
          <EmptyState icon={Trophy} title="No products" description="Sangeetha is not the cheapest for any product." />
        ) : (
          <div className="space-y-2">
            {sangeethaCheapest.slice(0, 10).map((p) => (
              <div key={p.ProductID} className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Trophy size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{p.ItemName}</div>
                  <div className="text-xs text-gray-500">{p.Brand}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-green-700">{formatPrice(p.lowestPrice)}</div>
                  <span className="inline-block mt-0.5 text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                    Lowest price
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
          <h2 className="text-sm font-semibold text-gray-900">Cheaper Elsewhere — {othersCheapest.length} products</h2>
        </div>
        {!othersCheapest.length ? (
          <EmptyState icon={AlertTriangle} title="No products" description="Sangeetha is the cheapest for all products." />
        ) : (
          <div className="space-y-2">
            {othersCheapest.slice(0, 10).map((p) => (
              <div key={p.ProductID} className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={16} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{p.ItemName}</div>
                  <div className="text-xs text-gray-500">{p.Brand} · Best on {p.lowestPlatform}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-red-700">{formatPrice(p.lowestPrice)}</div>
                  <span className="inline-block mt-0.5 text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                    Lowest on {p.lowestPlatform}
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
