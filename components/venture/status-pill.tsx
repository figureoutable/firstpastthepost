import { cn } from "@/lib/utils";

type KnownStatus =
  | "not_started"
  | "in_progress"
  | "complete"
  | "pass"
  | "fail"
  | "borderline"
  | "outstanding"
  | "converted"
  | "draft"
  | "accepted"
  | "declined"
  | "documents_generated"
  | "applied_to_cap_table"
  | "granted"
  | "exercised"
  | "lapsed"
  | "not_sent"
  | "sent"
  | "signed";

const STYLES: Record<KnownStatus, string> = {
  not_started: "bg-stone-100 text-stone-500 border-stone-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  complete: "bg-forest-50 text-forest-700 border-forest-200",
  pass: "bg-forest-50 text-forest-700 border-forest-200",
  fail: "bg-red-50 text-red-600 border-red-200",
  borderline: "bg-amber-50 text-amber-700 border-amber-200",
  outstanding: "bg-blue-50 text-blue-700 border-blue-200",
  converted: "bg-forest-50 text-forest-700 border-forest-200",
  draft: "bg-stone-100 text-stone-500 border-stone-200",
  accepted: "bg-forest-50 text-forest-700 border-forest-200",
  declined: "bg-red-50 text-red-600 border-red-200",
  documents_generated: "bg-amber-50 text-amber-700 border-amber-200",
  applied_to_cap_table: "bg-forest-50 text-forest-700 border-forest-200",
  granted: "bg-blue-50 text-blue-700 border-blue-200",
  exercised: "bg-forest-50 text-forest-700 border-forest-200",
  lapsed: "bg-stone-100 text-stone-500 border-stone-200",
  not_sent: "bg-stone-100 text-stone-500 border-stone-200",
  sent: "bg-amber-50 text-amber-700 border-amber-200",
  signed: "bg-forest-50 text-forest-700 border-forest-200",
};

const LABELS: Record<KnownStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
  pass: "Pass",
  fail: "Fail",
  borderline: "Borderline",
  outstanding: "Outstanding",
  converted: "Converted",
  draft: "Draft",
  accepted: "Accepted",
  declined: "Declined",
  documents_generated: "Documents generated",
  applied_to_cap_table: "Applied to cap table",
  granted: "Granted",
  exercised: "Exercised",
  lapsed: "Lapsed",
  not_sent: "Not sent",
  sent: "Sent",
  signed: "Signed",
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const key = (status in STYLES ? status : "not_started") as KnownStatus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-none border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        STYLES[key],
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-none",
          key === "fail" || key === "declined"
            ? "bg-red-500"
            : key === "in_progress" || key === "borderline" || key === "sent" || key === "documents_generated"
              ? "bg-amber-500"
              : key === "not_started" || key === "draft" || key === "not_sent" || key === "lapsed"
                ? "bg-stone-400"
                : key === "outstanding" || key === "granted"
                  ? "bg-blue-500"
                  : "bg-forest-500"
        )}
      />
      {label ?? LABELS[key]}
    </span>
  );
}
