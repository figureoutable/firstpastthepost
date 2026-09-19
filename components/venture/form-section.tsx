export function FormSection({
  title,
  description,
  step,
  children,
}: {
  title: string;
  description?: string;
  step?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        {step != null && (
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-none bg-stone-900 text-xs font-bold text-white">
            {step}
          </span>
        )}
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold tracking-tight text-stone-900">
            {title}
          </h3>
          {description && (
            <p className="text-sm leading-relaxed text-stone-500">{description}</p>
          )}
        </div>
      </div>
      <div className={step != null ? "pl-9" : undefined}>{children}</div>
    </div>
  );
}

export function FormSubGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-none border border-stone-200 bg-stone-50/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
        {label}
      </p>
      {children}
    </div>
  );
}
