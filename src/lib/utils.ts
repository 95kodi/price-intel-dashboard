import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PriceStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPriceGap(gap: number | null): string {
  if (gap === null) return "—";
  const abs = Math.abs(gap);
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(abs);
  if (gap > 0) return `+${formatted}`;
  if (gap < 0) return `-${formatted}`;
  return "₹0";
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  if (hours < 48) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusConfig(status: PriceStatus) {
  switch (status) {
    case "winning":
      return { label: "Winning", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-500" };
    case "losing":
      return { label: "Losing", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" };
    case "matching":
      return { label: "Matching", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" };
    case "active":
      return { label: "Active", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-500" };
    case "inactive":
      return { label: "Inactive", color: "text-gray-600", bg: "bg-gray-100", border: "border-gray-200", dot: "bg-gray-400" };
  }
}

export function getPriceColor(gap: number | null, status: PriceStatus): string {
  if (status === "winning") return "text-green-600 font-semibold";
  if (status === "losing") return "text-red-600 font-semibold";
  return "text-blue-600 font-semibold";
}

export function getCompetitorPriceColor(competitorPrice: number | null, ourPrice: number): string {
  if (!competitorPrice) return "text-gray-400";
  if (competitorPrice < ourPrice) return "text-red-600 font-medium";
  if (competitorPrice > ourPrice) return "text-green-600 font-medium";
  return "text-blue-600 font-medium";
}
