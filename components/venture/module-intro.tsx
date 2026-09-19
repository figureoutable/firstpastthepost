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
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full overflow-hidden rounded-none border border-stone-200 bg-card"
    >
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        {eyebrow && (
          <span className="-mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
            {eyebrow}
          </span>
        )}
        <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          {title}
        </h2>
        <p className="text-base leading-relaxed text-stone-600">
          {description}
        </p>

        {visual}

        <div className="flex flex-wrap items-end justify-between gap-3">
          {!visual && stats && stats.length > 0 ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-end gap-8">
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
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {secondaryCtaLabel && onSecondaryStart && (
              <Button
                size="default"
                className="rounded-none"
                onClick={onSecondaryStart}
              >
                {secondaryCtaLabel}
              </Button>
            )}
            {ctaLabel && onStart && (
              <Button
                size="default"
                className="rounded-none"
                onClick={onStart}
                disabled={ctaDisabled}
              >
                {ctaLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
