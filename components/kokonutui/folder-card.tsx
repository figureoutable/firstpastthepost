"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface FolderCardProps {
  number: number;
  title: string;
  subtitle: string;
  color: string;
  className?: string;
}

export function FolderCard({
  number,
  title,
  subtitle,
  color,
  className,
}: FolderCardProps) {
  return (
    <motion.div
      className={cn(
        "group relative h-full min-h-[260px] w-full select-none",
        className
      )}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full drop-shadow-[0_10px_22px_rgba(42,37,33,0.16)] transition-transform duration-300 ease-out group-hover:-translate-y-0.5"
        preserveAspectRatio="none"
        viewBox="0 0 300 232"
      >
        <path
          d="M24 0
             H120
             C132 0 143 5 150 14
             L156 22
             C163 31 174 36 186 36
             H276
             C289 36 300 47 300 60
             V208
             C300 221 289 232 276 232
             H24
             C11 232 0 221 0 208
             V24
             C0 11 11 0 24 0
             Z"
          fill={color}
        />
      </svg>

      <div className="absolute left-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-base font-bold text-white shadow-[0_4px_10px_rgba(42,37,33,0.28)]">
        {number}
      </div>

      <div className="relative z-10 flex h-full flex-col items-start gap-5 px-6 pb-6 pt-20 text-left">
        <h3 className="text-2xl font-bold leading-tight tracking-tight text-stone-900">
          {title}
        </h3>
        <p className="text-base leading-relaxed text-stone-900/65">{subtitle}</p>
      </div>
    </motion.div>
  );
}
