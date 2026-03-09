"use client";

import { cn } from "@/lib/utils";

interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "emerald" | "purple" | "default";
}

const colorMap = {
  default: {
    border: "from-[#6B46C1] via-[#0C1F21] to-[#553C9A]",
    overlay: "from-[#7E22CE]/40 via-[#0C1F21] to-[#6B46C1]/30",
    accent: "from-[#E9D8FD]/10 via-[#0C1F21] to-[#44337A]/50",
    text: "from-[#E9D8FD] to-[#D6BCFA]",
    glow: "rgba(159,122,234,0.1)",
    textGlow: "rgba(159,122,234,0.4)",
    hover: "from-[#44337A]/20 via-[#B794F4]/10 to-[#44337A]/20",
  },
  emerald: {
    border: "from-[#336C4F] via-[#0C1F21] to-[#0D6437]",
    overlay: "from-[#347B52]/40 via-[#0C1F21] to-[#0D6437]/30",
    accent: "from-[#87F6B7]/10 via-[#0C1F21] to-[#17362A]/50",
    text: "from-[#8AEECA] to-[#73F8A8]",
    glow: "rgba(135,246,183,0.1)",
    textGlow: "rgba(135,246,183,0.4)",
    hover: "from-[#17362A]/20 via-[#87F6B7]/10 to-[#17362A]/20",
  },
  purple: {
    border: "from-[#6B46C1] via-[#0C1F21] to-[#553C9A]",
    overlay: "from-[#7E22CE]/40 via-[#0C1F21] to-[#6B46C1]/30",
    accent: "from-[#E9D8FD]/10 via-[#0C1F21] to-[#44337A]/50",
    text: "from-[#E9D8FD] to-[#D6BCFA]",
    glow: "rgba(159,122,234,0.1)",
    textGlow: "rgba(159,122,234,0.4)",
    hover: "from-[#44337A]/20 via-[#B794F4]/10 to-[#44337A]/20",
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
        "group relative h-12 overflow-hidden rounded-lg px-6 transition-all duration-500",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled}
      {...props}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-lg bg-gradient-to-b p-[2px]",
          colors.border
        )}
      >
        <div className="absolute inset-0 rounded-lg opacity-90 bg-[#0C1F21]" />
      </div>

      <div className="absolute inset-[2px] rounded-lg opacity-95 bg-[#0C1F21]" />

      <div
        className={cn(
          "absolute inset-[2px] rounded-lg bg-gradient-to-r opacity-90",
          "from-[#0C1F21] via-[#0C1F21] to-[#0C1F21]"
        )}
      />
      <div
        className={cn(
          "absolute inset-[2px] rounded-lg bg-gradient-to-b opacity-80",
          colors.overlay
        )}
      />
      <div
        className={cn(
          "absolute inset-[2px] rounded-lg bg-gradient-to-br",
          colors.accent
        )}
      />

      <div
        className="absolute inset-[2px] rounded-lg"
        style={{ boxShadow: `inset 0 0 10px ${colors.glow}` }}
      />

      <div className="relative flex items-center justify-center gap-2">
        <span
          className={cn(
            "bg-gradient-to-b bg-clip-text font-medium text-base text-transparent tracking-tight",
            colors.text
          )}
          style={{ filter: `drop-shadow(0 0 12px ${colors.textGlow})` }}
        >
          {children}
        </span>
      </div>

      <div
        className={cn(
          "absolute inset-[2px] rounded-lg bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          colors.hover
        )}
      />
    </button>
  );
}
