import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  backHref,
  backLabel = "Back",
  title,
  subtitle,
  action,
}: {
  backHref?: string;
  backLabel?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:text-forest-800"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-stone-600">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}
