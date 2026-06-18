"use client";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  meta?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, meta, children, className }: PageHeaderProps) {
  return (
    <div className={cn("bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10", className)}>
      <h1 className="text-[15px] font-semibold text-gray-900">{title}</h1>
      {meta && <span className="text-xs text-gray-400">{meta}</span>}
      <div className="flex-1" />
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
