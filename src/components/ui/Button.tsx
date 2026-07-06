import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-[0.98]": variant === "default",
            "bg-primary border-primary text-white hover:bg-primary-hover shadow-card hover:shadow-card-hover active:scale-[0.98]": variant === "primary",
            "bg-red-50 border-red-200 text-red-700 hover:bg-red-100 active:scale-[0.98]": variant === "danger",
            "bg-transparent border-transparent text-gray-600 hover:bg-gray-100": variant === "ghost",
            "bg-transparent border-gray-200 text-gray-700 hover:bg-gray-50": variant === "outline",
          },
          {
            "px-2.5 py-1.5 text-xs": size === "sm",
            "px-3.5 py-2 text-sm": size === "md",
            "px-5 py-2.5 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
