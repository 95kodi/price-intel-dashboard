"use client";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  meta?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, meta, subtitle, children, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "bg-card/80 backdrop-blur-sm border-b border-line px-8 py-4 flex items-center gap-4 sticky top-0 z-20",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink tracking-tight leading-tight truncate">{title}</h1>
        {(subtitle || meta) && (
          <p className="text-xs text-ink-muted mt-0.5 truncate">{subtitle || meta}</p>
        )}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
