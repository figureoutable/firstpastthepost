"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GradientButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children?: React.ReactNode;
  variant?: "emerald" | "purple" | "default";
  appearance?: "solid" | "outline";
  loading?: boolean;
}

export default function GradientButton({
  children,
  className,
  variant: _variant = "default",
  appearance = "solid",
  disabled,
  loading = false,
  ...props
}: GradientButtonProps) {
  const isDisabled = !!disabled || loading;
  const isOutline = appearance === "outline";

  return (
    <motion.button
      {...props}
      disabled={isDisabled}
      className={cn(
        "group relative h-11 overflow-hidden rounded-lg px-5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/40 focus-visible:ring-offset-2",
        isOutline
          ? "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900"
          : "bg-clay-500 text-white hover:bg-clay-600",
        isDisabled && "cursor-not-allowed opacity-50 pointer-events-none",
        className
      )}
    >
      <span
        className={cn(
          "relative z-10 flex items-center justify-center gap-2 [&_svg]:transition-transform [&_svg]:duration-300",
          isOutline
            ? "group-hover:[&_svg]:-translate-x-1.5"
            : "group-hover:[&_svg]:translate-x-1.5"
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      </span>
    </motion.button>
  );
}
