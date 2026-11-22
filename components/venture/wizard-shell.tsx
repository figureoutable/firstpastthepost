"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "./step-indicator";

export function WizardShell({
  step,
  totalSteps,
  stepLabel,
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Next",
  isLastStep = false,
  nextDisabled = false,
  loading = false,
  hideFooter = false,
  children,
}: {
  step: number;
  totalSteps: number;
  stepLabel?: string;
  onBack: () => void;
  onNext: () => void;
  backLabel?: string;
  nextLabel?: string;
  isLastStep?: boolean;
  nextDisabled?: boolean;
  loading?: boolean;
  hideFooter?: boolean;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:p-7">
      <StepIndicator current={step} total={totalSteps} label={stepLabel} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={reduce ? false : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="space-y-5"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {!hideFooter && (
        <div className="mt-7 flex gap-3 border-t border-stone-100 pt-5">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> {backLabel}
          </Button>
          <Button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || loading}
            className="ml-auto flex-1 sm:flex-none"
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              <>
                {nextLabel}
                {isLastStep ? <Check className="ml-1.5 h-4 w-4" /> : <ArrowRight className="ml-1.5 h-4 w-4" />}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
