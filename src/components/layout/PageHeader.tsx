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
        "bg-card/80 backdrop-blur-sm border-b border-line px-5 sm:px-8 py-4 flex flex-wrap items-center gap-x-4 gap-y-3 sticky top-0 z-20",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl sm:text-[28px] leading-tight sm:leading-9 font-semibold text-ink tracking-tight truncate">
          {title}
        </h1>
        {(subtitle || meta) && (
          <p className="text-xs text-ink-muted mt-0.5 truncate">{subtitle || meta}</p>
        )}
      </div>
      {/* Actions wrap rather than pushing the page into horizontal scroll. */}
      <div className="flex items-center gap-2 flex-wrap justify-end">{children}</div>
    </div>
  );
}
