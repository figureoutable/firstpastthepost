"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Expandable } from "@/components/ui/expandable";

/**
 * A button for a step Figures does for the client (filing, signatures, valuations).
 * In this demo it explains what would happen next instead of sending anything.
 */
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
      <Button
        type="button"
        variant={emphasized ? "default" : variant}
        className="w-full sm:w-auto"
        onClick={() => {
          setActivated(true);
          onActivated?.();
        }}
      >
        {label}
      </Button>
      <Expandable show={activated} contentKey="stub-activated">
        <div className="flex items-start gap-2 rounded-xl border border-clay-100 bg-clay-50/70 px-3 py-2.5 text-sm text-clay-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-clay-600" />
          <span>{placeholderText}</span>
        </div>
      </Expandable>
    </div>
  );
}
