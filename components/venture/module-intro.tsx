"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ModuleStatus } from "@/lib/venture/types";

export interface ModuleIntroStat {
  label: string;
  value: string;
}

export function ModuleIntro({
  icon: _Icon,
  eyebrow,
  title,
  description,
  color: _color,
  status: _status,
  stats,
  visual,
  ctaLabel,
  onStart,
  ctaDisabled,
  secondaryCtaLabel,
  onSecondaryStart,
  hideIcon: _hideIcon,
  hideStatus: _hideStatus,
  logoSrc,
}: {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  color?: string;
  status?: ModuleStatus;
  stats?: ModuleIntroStat[];
  visual?: ReactNode;
  ctaLabel?: string;
  onStart?: () => void;
  ctaDisabled?: boolean;
  secondaryCtaLabel?: string;
  onSecondaryStart?: () => void;
  hideIcon?: boolean;
  hideStatus?: boolean;
  logoSrc?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full overflow-hidden rounded-2xl border border-stone-200 bg-card"
    >
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <span className="-mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">
                {eyebrow}
              </span>
            )}
            <h2 className="mt-1 flex items-center gap-3 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              {logoSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${logoSrc}?v=3`} alt="" className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14" />
              )}
              {title}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-stone-600">
              {description}
            </p>
          </div>

          {(ctaLabel || secondaryCtaLabel) && (
            <div className="flex shrink-0 flex-col items-end gap-2">
              {secondaryCtaLabel && onSecondaryStart && (
                <Button
                  size="default"
                  className="w-48 rounded-md"
                  onClick={onSecondaryStart}
                >
                  {secondaryCtaLabel}
                </Button>
              )}
              {ctaLabel && onStart && (
                <Button
                  size="default"
                  className="w-48 rounded-md"
                  onClick={onStart}
                  disabled={ctaDisabled}
                >
                  {ctaLabel}
                </Button>
              )}
            </div>
          )}
        </div>

        {visual}

        {!visual && stats && stats.length > 0 ? (
          <div className="flex min-w-0 flex-wrap items-end gap-12 sm:gap-16">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0">
                <div className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                  {s.value}
                </div>
                <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
