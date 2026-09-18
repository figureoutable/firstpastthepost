"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import GradientButton from "@/components/kokonutui/gradient-button";
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
  return (
    <div className="rounded-sm border border-border bg-card p-4 sm:p-5">
      <StepIndicator current={step} total={totalSteps} label={stepLabel} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {!hideFooter && (
        <div className="mt-6 flex gap-3 border-t border-stone-200 pt-6">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> {backLabel}
          </Button>
          <GradientButton
            type="button"
            variant={isLastStep ? "emerald" : "purple"}
            onClick={onNext}
            disabled={nextDisabled || loading}
            className="ml-auto flex-1 sm:flex-none"
          >
            {loading ? "Saving…" : nextLabel}
            {!isLastStep && !loading && <ArrowRight className="h-4 w-4" />}
          </GradientButton>
        </div>
      )}
    </div>
  );
}
