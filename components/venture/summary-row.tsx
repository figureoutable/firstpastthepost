export function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-100 py-2.5 last:border-0">
      <span className="text-sm text-stone-500">{label}</span>
      <span className="text-right text-sm font-semibold text-stone-900">
        {value}
      </span>
    </div>
  );
}
