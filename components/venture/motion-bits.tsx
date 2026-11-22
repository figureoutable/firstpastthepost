"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { BadgeCheck, FileSignature, LayoutGrid, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModuleStatus } from "@/lib/venture/types";
import type { VentureModule } from "@/lib/venture/modules";

/** Counts up to a number the first time it scrolls into view. */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString("en-GB"),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => setDisplay(n),
    });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(display)}
    </span>
  );
}

/** Circular progress that draws itself in. */
export function ProgressRing({
  value,
  total,
  size = 120,
  stroke = 10,
  children,
}: {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const radius = (size - stroke) / 2;
  const fraction = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f5f5f4" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f97316"
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: reduce ? fraction : 0 }}
          animate={{ pathLength: fraction }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

const ICONS = {
  "badge-check": BadgeCheck,
  "file-signature": FileSignature,
  "trending-up": TrendingUp,
} as const;

/** A module's icon in a soft tile. */
export function ModuleIcon({
  module,
  size = "md",
  className,
}: {
  module?: Pick<VentureModule, "image" | "icon">;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box = size === "sm" ? "h-8 w-8 rounded-lg" : size === "lg" ? "h-14 w-14 rounded-2xl" : "h-11 w-11 rounded-xl";
  const img = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-9 w-9" : "h-7 w-7";
  const Icon = module?.icon ? ICONS[module.icon] : LayoutGrid;
  return (
    <span className={cn("flex shrink-0 items-center justify-center bg-clay-50 text-clay-700 ring-1 ring-inset ring-clay-100", box, className)}>
      {module?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={module.image} alt="" className={cn("object-contain", img)} />
      ) : (
        <Icon className={size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-5 w-5"} />
      )}
    </span>
  );
}

const DOT: Record<ModuleStatus, string> = {
  not_started: "bg-stone-300",
  in_progress: "bg-amber-400",
  complete: "bg-forest-500",
};

const DOT_LABEL: Record<ModuleStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Done",
};

export function StatusDot({ status, className }: { status: ModuleStatus; className?: string }) {
  return (
    <span className={cn("relative inline-flex h-2 w-2 shrink-0", className)} title={DOT_LABEL[status]}>
      {status === "in_progress" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-40 motion-reduce:hidden" />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", DOT[status])} />
      <span className="sr-only">{DOT_LABEL[status]}</span>
    </span>
  );
}

/** Staggered entrance for a list of children. */
export const stagger = {
  container: {
    hidden: {},
    show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
  },
  item: {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
  },
};
