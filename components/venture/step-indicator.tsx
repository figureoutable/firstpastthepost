export function StepIndicator({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label?: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <div
              className={`h-1 w-full rounded-none transition-all duration-500 ${
                i < current
                  ? "bg-forest-500"
                  : i === current
                    ? "bg-forest-300"
                    : "bg-stone-200"
              }`}
            />
          </div>
        ))}
        <span className="ml-1 whitespace-nowrap text-[11px] tabular-nums text-stone-400">
          {current + 1}/{total}
        </span>
      </div>
      {label && (
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
          {label}
        </p>
      )}
    </div>
  );
}
