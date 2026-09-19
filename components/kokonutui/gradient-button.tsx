"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "emerald" | "purple" | "default";
  loading?: boolean;
}

export default function GradientButton({
  children,
  className,
  variant: _variant = "default",
  disabled,
  loading = false,
  ...props
}: GradientButtonProps) {
  const isDisabled = !!disabled || loading;

  return (
    <motion.button
      {...props}
      disabled={isDisabled}
      whileHover={isDisabled ? undefined : { scale: 1.015 }}
      whileTap={isDisabled ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "relative h-12 overflow-hidden rounded-none px-6 transition-colors duration-200",
        "bg-clay-500 text-sm font-medium text-white hover:bg-clay-600",
        isDisabled && "cursor-not-allowed opacity-50 pointer-events-none",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={loading ? "loading" : "content"}
          initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="relative z-10 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
