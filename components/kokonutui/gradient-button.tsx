"use client";

import { cn } from "@/lib/utils";

interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "emerald" | "purple" | "default";
}

const colorMap = {
  default: {
    bg: "from-purple-600 to-indigo-600",
    hover: "from-purple-700 to-indigo-700",
    shadow: "shadow-purple-500/25",
  },
  emerald: {
    bg: "from-emerald-500 to-emerald-600",
    hover: "from-emerald-600 to-emerald-700",
    shadow: "shadow-emerald-500/25",
  },
  purple: {
    bg: "from-purple-600 to-indigo-600",
    hover: "from-purple-700 to-indigo-700",
    shadow: "shadow-purple-500/25",
  },
};

export default function GradientButton({
  children,
  className,
  variant = "default",
  disabled,
  ...props
}: GradientButtonProps) {
  const colors = colorMap[variant];

  return (
    <button
      className={cn(
        "group relative h-12 overflow-hidden rounded-xl px-6 transition-all duration-300",
        "bg-gradient-to-r text-white font-medium text-sm",
        colors.bg,
        `hover:${colors.hover}`,
        `shadow-lg ${colors.shadow} hover:shadow-xl`,
        disabled && "opacity-50 cursor-not-allowed saturate-50",
        className
      )}
      disabled={disabled}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}
