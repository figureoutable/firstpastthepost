"use client";

import { cn } from "@/lib/utils";

interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "emerald" | "purple" | "default";
}

export default function GradientButton({
  children,
  className,
  variant: _variant = "default",
  disabled,
  ...props
}: GradientButtonProps) {
  return (
    <button
      className={cn(
        "relative h-12 overflow-hidden rounded-none px-6 transition-colors duration-200",
        "bg-clay-500 text-sm font-medium text-white hover:bg-clay-600",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      disabled={disabled}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}
