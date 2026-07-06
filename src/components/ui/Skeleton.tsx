import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-gray-200/80 rounded-md", className)} />;
}

export function TableSkeleton({ rows = 6, cols = 8 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-6 py-3.5 border-b border-gray-100">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="bg-card border border-line rounded-2xl p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-32 mb-3" />
      <Skeleton className="h-4 w-14" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-card border border-line rounded-2xl p-6 shadow-card">
      <Skeleton className="h-4 w-44 mb-2" />
      <Skeleton className="h-3 w-64 mb-5" />
      <Skeleton className="h-52 w-full rounded-xl" />
    </div>
  );
}
