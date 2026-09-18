"use client";

import { useState } from "react";
import { Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import GradientButton from "@/components/kokonutui/gradient-button";
import { cn } from "@/lib/utils";

export function StubAction({
  label,
  placeholderText,
  variant = "outline",
  emphasized = false,
  className,
  onActivated,
}: {
  label: string;
  placeholderText: string;
  variant?: "default" | "outline" | "secondary";
  emphasized?: boolean;
  className?: string;
  onActivated?: () => void;
}) {
  const [activated, setActivated] = useState(false);

  return (
    <div className={cn("space-y-2", className)}>
      {emphasized ? (
        <GradientButton
          type="button"
          variant="emerald"
          className="w-full sm:w-auto"
          onClick={() => {
            setActivated(true);
            onActivated?.();
          }}
        >
          {label}
        </GradientButton>
      ) : (
        <Button
          type="button"
          variant={variant}
          className="w-full sm:w-auto"
          onClick={() => {
            setActivated(true);
            onActivated?.();
          }}
        >
          {label}
        </Button>
      )}
      {activated && (
        <div className="flex items-start gap-2 rounded-md border border-dashed border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-500">
          <Plug className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{placeholderText}</span>
        </div>
      )}
    </div>
  );
}
