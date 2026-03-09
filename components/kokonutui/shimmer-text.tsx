"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ShimmerTextProps {
  text: string;
  className?: string;
}

export default function ShimmerText({ text, className }: ShimmerTextProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h1
        animate={{
          backgroundPosition: ["200% center", "-200% center"],
        }}
        className={cn(
          "bg-[length:200%_100%] bg-gradient-to-r from-white via-neutral-400 to-white bg-clip-text font-bold text-transparent",
          className
        )}
        transition={{
          duration: 2.5,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        {text}
      </motion.h1>
    </motion.div>
  );
}
