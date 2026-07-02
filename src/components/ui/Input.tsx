import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, type SelectHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, ...props }, ref) => {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-600">{label}</label>}
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50",
          error && "border-red-300 focus:ring-red-400",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

Input.displayName = "Input";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, label, error, children, ...props }, ref) => {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-600">{label}</label>}
      <select
        ref={ref}
        className={cn(
          "h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all",
          error && "border-red-300 focus:ring-red-400",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

Select.displayName = "Select";
