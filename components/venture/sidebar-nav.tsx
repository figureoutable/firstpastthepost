"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, BadgeCheck, FileSignature, LayoutGrid, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const MODULES: {
  href: string;
  imageSrc: string;
  title: string;
  color: string;
}[] = [
  {
    href: "/venture/seis-eis",
    imageSrc: "/icons/seis-eis.png",
    title: "SEIS / EIS",
    color: "#4C8DFF",
  },
  {
    href: "/venture/safe",
    imageSrc: "/icons/future-equity.png",
    title: "Future Equity Agreements",
    color: "#D2795A",
  },
  {
    href: "/venture/cap-table",
    imageSrc: "/icons/cap-table.png",
    title: "Cap Table Management",
    color: "#8B7FD6",
  },
  {
    href: "/venture/emi",
    imageSrc: "/icons/emi.png",
    title: "EMI Share Options",
    color: "#E0A458",
  },
  {
    href: "/venture/rd",
    imageSrc: "/icons/rd.png",
    title: "R&D Tax Relief",
    color: "#3DBE7A",
  },
];

/** Tools that sit alongside the modules. */
const TOOLS: { href: string; title: string; icon: typeof BadgeCheck }[] = [
  { href: "/venture/eligibility", title: "Eligibility checker", icon: BadgeCheck },
  { href: "/venture/term-sheets", title: "Term sheets", icon: FileSignature },
  { href: "/venture/funding-round", title: "Funding rounds", icon: TrendingUp },
];

export function VentureSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-stone-200 bg-white px-4 py-5 sm:px-6 md:sticky md:top-0 md:h-screen md:w-64 md:overflow-y-auto md:border-b-0 md:border-r md:px-4 md:py-6 lg:w-72">
      <Link href="/" className="mb-6 hidden px-2 md:block" aria-label="Figures home">
        <Image src="/figures-logo.png" alt="Figures" width={693} height={206} className="h-5 w-auto" />
        <span className="mt-1 block text-xs font-medium text-stone-500">Venture</span>
      </Link>
      <div className="mb-2 hidden md:block">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
          Modules
        </p>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:gap-1 md:overflow-visible md:pb-0">
        <NavItem
          href="/venture"
          title="Overview"
          color="#57534e"
          active={pathname === "/venture"}
        />
        {MODULES.map((m) => (
          <NavItem
            key={m.href}
            href={m.href}
            imageSrc={m.imageSrc}
            title={m.title}
            color={m.color}
            active={pathname === m.href || (m.href !== "/venture" && pathname.startsWith(m.href))}
          />
        ))}
        <p className="mt-5 hidden px-2 text-xs font-semibold uppercase tracking-wide text-stone-400 md:block">
          Tools
        </p>
        {TOOLS.map((t) => (
          <NavItem
            key={t.href}
            href={t.href}
            icon={t.icon}
            title={t.title}
            color="#57534e"
            active={pathname.startsWith(t.href)}
          />
        ))}
      </nav>

      <Link
        href="/"
        className="mt-4 inline-flex items-center gap-1.5 px-2 text-sm font-medium text-stone-500 hover:text-stone-900 md:mt-auto md:pt-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Figures
      </Link>
    </aside>
  );
}

function NavItem({
  href,
  imageSrc,
  icon: Icon,
  title,
  active,
}: {
  href: string;
  imageSrc?: string;
  icon?: typeof BadgeCheck;
  title: string;
  color: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors md:shrink md:w-full",
        active
          ? "bg-clay-50 text-clay-900 ring-1 ring-inset ring-clay-200"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt="" className="h-[22px] w-[22px] object-contain" />
        ) : Icon ? (
          <Icon className="h-4 w-4" />
        ) : (
          <LayoutGrid className="h-4 w-4" />
        )}
      </span>
      <span className="flex-1 whitespace-nowrap font-medium md:whitespace-normal">
        {title}
      </span>
    </Link>
  );
}
