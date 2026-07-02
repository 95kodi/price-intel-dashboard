import { cn } from "@/lib/utils";
import type { PriceStatus } from "@/types";

interface BadgeProps {
  status: PriceStatus;
  className?: string;
}

export function StatusBadge({ status, className }: BadgeProps) {
  const configs: Record<PriceStatus, { label: string; className: string }> = {
    winning: { label: "Winning", className: "bg-green-50 text-green-700 border-green-200" },
    losing: { label: "Losing", className: "bg-red-50 text-red-700 border-red-200" },
    matching: { label: "Matching", className: "bg-blue-50 text-blue-700 border-blue-200" },
    active: { label: "Active", className: "bg-green-50 text-green-700 border-green-200" },
    inactive: { label: "Inactive", className: "bg-gray-100 text-gray-600 border-gray-200" },
  };
  const config = configs[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", config.className, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", {
        "bg-green-500": status === "winning" || status === "active",
        "bg-red-500": status === "losing",
        "bg-blue-500": status === "matching",
        "bg-gray-400": status === "inactive",
      })} />
      {config.label}
    </span>
  );
}

interface GenericBadgeProps {
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "success" | "destructive";
  className?: string;
}

export function Badge({ children, variant = "default", className }: GenericBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      variant === "default" && "bg-gray-100 text-gray-700",
      variant === "outline" && "border border-gray-200 text-gray-600",
      variant === "secondary" && "bg-blue-50 text-blue-700",
      variant === "success" && "bg-green-50 text-green-700",
      variant === "destructive" && "bg-red-50 text-red-700",
      className
    )}>
      {children}
    </span>
  );
}
