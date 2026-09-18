"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  LayoutGrid,
  ShieldCheck,
  FlaskConical,
  PieChart,
  FileSignature,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MODULES: {
  href: string;
  icon: typeof ShieldCheck;
  title: string;
  color: string;
}[] = [
  {
    href: "/venture/seis-eis",
    icon: ShieldCheck,
    title: "SEIS / EIS",
    color: "#4C8DFF",
  },
  {
    href: "/venture/safe",
    icon: FileSignature,
    title: "Future Equity Agreements",
    color: "#D2795A",
  },
  {
    href: "/venture/cap-table",
    icon: PieChart,
    title: "Cap Table Management",
    color: "#8B7FD6",
  },
  {
    href: "/venture/emi",
    icon: Gift,
    title: "EMI Share Options",
    color: "#E0A458",
  },
  {
    href: "/venture/rd",
    icon: FlaskConical,
    title: "R&D Tax Relief",
    color: "#3DBE7A",
  },
];

export function VentureSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 md:sticky md:top-6 md:w-64">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 px-1 text-sm font-medium text-forest-700 hover:text-forest-800"
      >
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      <div className="mb-2 mt-2 hidden md:block">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
          Modules
        </p>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:gap-1 md:overflow-visible md:pb-0">
        <NavItem
          href="/venture"
          icon={LayoutGrid}
          title="Overview"
          color="#57534e"
          active={pathname === "/venture"}
        />
        {MODULES.map((m) => (
          <NavItem
            key={m.href}
            href={m.href}
            icon={m.icon}
            title={m.title}
            color={m.color}
            active={pathname === m.href}
          />
        ))}
      </nav>
    </aside>
  );
}

function NavItem({
  href,
  icon: Icon,
  title,
  color,
  active,
}: {
  href: string;
  icon: typeof ShieldCheck;
  title: string;
  color: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors md:shrink md:w-full",
        active
          ? "bg-stone-900 text-white shadow-sm"
          : "text-stone-600 hover:bg-stone-100"
      )}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
        style={{
          backgroundColor: active ? "rgba(255,255,255,0.15)" : `${color}1F`,
          color: active ? "#ffffff" : color,
        }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 whitespace-nowrap font-medium md:whitespace-normal">
        {title}
      </span>
    </Link>
  );
}
