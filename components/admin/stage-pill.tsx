import { AlertTriangle, Check, Circle, Clock, Minus } from "lucide-react";
import type { StageState } from "@/lib/engagements/flow";
import { cn } from "@/lib/utils";

const STYLE: Record<StageState, { cls: string; Icon: typeof Check }> = {
  done: { cls: "bg-forest-50 text-forest-800 ring-forest-200", Icon: Check },
  current: { cls: "bg-amber-50 text-amber-800 ring-amber-200", Icon: Clock },
  waiting: { cls: "bg-stone-50 text-stone-500 ring-stone-200", Icon: Circle },
  skipped: { cls: "bg-stone-50 text-stone-400 ring-stone-200", Icon: Minus },
  problem: { cls: "bg-red-50 text-red-700 ring-red-200", Icon: AlertTriangle },
};

export function StagePill({ state, label, className }: { state: StageState; label: string; className?: string }) {
  const { cls, Icon } = STYLE[state];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", cls, className)}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

export function amlState(state: "not_started" | "in_progress" | "passed" | "flagged"): StageState {
  return state === "passed" ? "done" : state === "flagged" ? "problem" : state === "in_progress" ? "current" : "waiting";
}
