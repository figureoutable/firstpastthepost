"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const SLICE_COLORS = [
  "#8B7FD6",
  "#4C8DFF",
  "#3DBE7A",
  "#E0A458",
  "#D2795A",
  "#5FA8A0",
  "#4F677A",
  "#F5C542",
  "#A78BFA",
  "#38BDF8",
];

export interface OwnershipSlice {
  name: string;
  shares: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export function OwnershipPie({
  slices,
  className,
  size = 400,
}: {
  slices: OwnershipSlice[];
  className?: string;
  size?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = slices.reduce((sum, s) => sum + s.shares, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;
  const holeR = size * 0.22;

  let angle = 0;
  const arcs =
    total <= 0
      ? []
      : slices.map((slice, i) => {
          const sweep = (slice.shares / total) * 360;
          const start = angle;
          const end = angle + sweep;
          angle = end;
          const pct = (slice.shares / total) * 100;
          return {
            ...slice,
            start,
            end: Math.min(end, 359.999),
            pct,
            color: SLICE_COLORS[i % SLICE_COLORS.length],
            isFull: sweep >= 359.999,
          };
        });

  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-col items-center gap-8">
        <motion.svg
          key={arcs.length === 0 ? "empty" : "chart"}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="mx-auto h-auto w-full max-w-[380px] shrink-0 sm:max-w-[420px]"
          initial={{ opacity: 0, rotate: -12, scale: 0.9 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {arcs.length === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="#e7e5e4" />
          ) : arcs.length === 1 && arcs[0].isFull ? (
            <motion.circle
              cx={cx}
              cy={cy}
              r={r}
              fill={arcs[0].color}
              className="cursor-pointer"
              onMouseEnter={() => setHovered(arcs[0].name)}
              onMouseLeave={() => setHovered(null)}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          ) : (
            <AnimatePresence>
              {arcs.map((arc, i) => {
                const isActive = hovered === arc.name;
                const dimmed = hovered != null && !isActive;
                return (
                  <motion.path
                    key={arc.name}
                    d={describeArc(cx, cy, r, arc.start, arc.end)}
                    fill={arc.color}
                    className="cursor-pointer"
                    style={{ transformBox: "view-box" as never, transformOrigin: `${cx}px ${cy}px` }}
                    onMouseEnter={() => setHovered(arc.name)}
                    onMouseLeave={() => setHovered(null)}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: isActive ? 1.045 : 1,
                      opacity: dimmed ? 0.35 : 1,
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                      scale: { type: "spring", stiffness: 260, damping: 20, delay: isActive || dimmed ? 0 : i * 0.05 },
                      opacity: { duration: 0.2, delay: isActive || dimmed ? 0 : i * 0.05 },
                    }}
                  />
                );
              })}
            </AnimatePresence>
          )}
          <circle cx={cx} cy={cy} r={holeR} fill="white" />
          <motion.text
            x={cx}
            y={cy - size * 0.03}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-stone-900 font-bold"
            style={{ fontSize: size * 0.09 }}
            key={slices.length}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            {slices.length}
          </motion.text>
          <text
            x={cx}
            y={cy + size * 0.055}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-stone-400 uppercase tracking-wide"
            style={{ fontSize: size * 0.04 }}
          >
            holders
          </text>
        </motion.svg>

        <ul className="grid w-full grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
          {arcs.map((arc, i) => {
            const isActive = hovered === arc.name;
            const dimmed = hovered != null && !isActive;
            return (
              <motion.li
                key={arc.name}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: dimmed ? 0.4 : 1,
                  y: 0,
                  scale: isActive ? 1.03 : 1,
                }}
                transition={{
                  opacity: { duration: 0.2 },
                  y: { duration: 0.3, delay: i * 0.04 },
                  scale: { type: "spring", stiffness: 300, damping: 20 },
                }}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-none px-2 py-2 text-sm transition-colors",
                  isActive && "bg-stone-100 ring-1 ring-stone-200"
                )}
                onMouseEnter={() => setHovered(arc.name)}
                onMouseLeave={() => setHovered(null)}
              >
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-none"
                  style={{ backgroundColor: arc.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-stone-900">{arc.name}</div>
                  <div className="text-xs text-stone-500">
                    {arc.pct.toFixed(1)}% · {arc.shares.toLocaleString()}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
