import Link from "next/link";
import Image from "next/image";
import { FIRM } from "@/lib/figures-config";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/40"
          aria-label="Figures home"
        >
          <Image src="/figures-logo.png" alt="Figures" width={693} height={206} className="h-6 w-auto" priority />
        </Link>
        <a
          href={`mailto:${FIRM.contactEmail}`}
          className="text-sm text-stone-600 transition-colors hover:text-stone-900"
        >
          Need help? <span className="hidden font-medium text-stone-900 sm:inline">{FIRM.contactEmail}</span>
          <span className="font-medium text-stone-900 sm:hidden">Email us</span>
        </a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200/80 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-5 text-xs text-stone-500 sm:px-6">
        <span>© {new Date().getFullYear()} {FIRM.tradingName}</span>
        <nav className="flex gap-4">
          <Link href="/privacy" className="hover:text-stone-900">
            Privacy notice
          </Link>
          <a href={FIRM.website} className="hover:text-stone-900">
            tryfigures.com
          </a>
        </nav>
      </div>
    </footer>
  );
}

/** Standard page frame for client-facing pages. */
export function PageShell({
  children,
  className,
  width = "default",
}: {
  children: React.ReactNode;
  className?: string;
  width?: "default" | "narrow" | "wide";
}) {
  const max = width === "narrow" ? "max-w-2xl" : width === "wide" ? "max-w-5xl" : "max-w-3xl";
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <SiteHeader />
      <main className={cn("mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-12", max, className)}>{children}</main>
      <SiteFooter />
    </div>
  );
}

/** White panel used for forms and content blocks. */
export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:p-8", className)}>
      {children}
    </div>
  );
}

export function PageTitle({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 sm:mb-8", className)}>
      {eyebrow && <p className="mb-2 text-sm font-medium text-clay-700">{eyebrow}</p>}
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-stone-600">{description}</p>}
    </div>
  );
}
