"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDot, stagger } from "@/components/venture/motion-bits";
import type { ModuleStatus } from "@/lib/venture/types";

export interface ModuleIntroStat {
  label: string;
  value: string;
}

const STATUS_LABEL: Record<ModuleStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Done",
};

/**
 * The header at the top of every Venture module: icon, title, one line on what it does,
 * a few key numbers and optional actions. It sits above the module's working area.
 */
export function ModuleIntro({
  icon: Icon,
  eyebrow,
  title,
  description,
  status,
  stats,
  visual,
  ctaLabel,
  onStart,
  ctaDisabled,
  secondaryCtaLabel,
  onSecondaryStart,
  hideStatus,
  logoSrc,
  actions,
}: {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  /** Kept for older callers; the header now uses the Figures palette. */
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
  actions?: ReactNode;
}) {
  const hasButtons = Boolean((ctaLabel && onStart) || (secondaryCtaLabel && onSecondaryStart) || actions);

  return (
    <motion.header
      variants={stagger.container}
      initial="hidden"
      animate="show"
      className="mb-6 space-y-5 sm:mb-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <motion.div variants={stagger.item} className="flex min-w-0 items-start gap-4">
          {(logoSrc || Icon) && (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${logoSrc}?v=3`} alt="" className="h-9 w-9 object-contain" />
              ) : Icon ? (
                <Icon className="h-6 w-6 text-clay-600" />
              ) : null}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {eyebrow && (
                <span className="text-xs font-semibold uppercase tracking-wider text-clay-700">{eyebrow}</span>
              )}
              {status && !hideStatus && (
                <span className="inline-flex items-center gap-1.5 text-xs text-stone-500">
                  <StatusDot status={status} /> {STATUS_LABEL[status]}
                </span>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 sm:text-[28px]">{title}</h1>
            <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-stone-600">{description}</p>
          </div>
        </motion.div>

        {hasButtons && (
          <motion.div variants={stagger.item} className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            {actions}
            {secondaryCtaLabel && onSecondaryStart && (
              <Button variant="outline" onClick={onSecondaryStart}>
                {secondaryCtaLabel}
              </Button>
            )}
            {ctaLabel && onStart && (
              <Button onClick={onStart} disabled={ctaDisabled}>
                {ctaLabel}
              </Button>
            )}
          </motion.div>
        )}
      </div>

      {visual && <motion.div variants={stagger.item}>{visual}</motion.div>}

      {!visual && stats && stats.length > 0 && (
        <motion.dl variants={stagger.item} className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          {stats.map((s) => (
            <div
              key={s.label}
              className="min-w-0 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:min-w-40"
            >
              <dt className="text-xs font-medium text-stone-500">{s.label}</dt>
              <dd className="mt-0.5 truncate text-lg font-semibold tabular-nums tracking-tight text-stone-900">{s.value}</dd>
            </div>
          ))}
        </motion.dl>
      )}
    </motion.header>
  );
}
