"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Expandable({
  show,
  children,
  className,
  contentKey = "expandable",
}: {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  contentKey?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key={contentKey}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
