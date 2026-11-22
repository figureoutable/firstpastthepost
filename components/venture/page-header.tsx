import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  backHref,
  backLabel = "Back",
  title,
  subtitle,
  logoSrc,
  action,
}: {
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
  logoSrc?: string;
  action?: React.ReactNode;
}) {
  if (!backHref && !title && !subtitle && !logoSrc && !action) {
    return null;
  }

  return (
    <div className="mb-6 sm:mb-8">
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {logoSrc && (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${logoSrc}?v=3`} alt="" className="h-9 w-9 object-contain" />
            </span>
          )}
          <div className="min-w-0">
            {title && <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-[28px]">{title}</h1>}
            {subtitle && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-stone-600">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}
