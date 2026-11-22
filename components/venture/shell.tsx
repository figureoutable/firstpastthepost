"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, LayoutGrid, Menu, RotateCcw, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ModuleIcon, StatusDot } from "@/components/venture/motion-bits";
import { GROUPS, MODULES, moduleFor } from "@/lib/venture/modules";
import { useVenture } from "@/lib/venture/store";
import { cn } from "@/lib/utils";

function companyName(name: string | undefined) {
  return (name || "").trim() || "Your company";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { state } = useVenture();
  const overviewActive = pathname === "/venture";

  const item = (href: string, active: boolean, content: React.ReactNode, key: string) => (
    <Link
      key={key}
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/40",
        active ? "text-stone-900" : "text-stone-600 hover:bg-stone-100/80 hover:text-stone-900"
      )}
    >
      {active && (
        <motion.span
          layoutId="venture-nav-active"
          className="absolute inset-0 rounded-xl bg-white shadow-sm ring-1 ring-stone-200"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <span className="relative flex flex-1 items-center gap-3">{content}</span>
    </Link>
  );

  return (
    <nav aria-label="Venture" className="space-y-5">
      <div>
        {item(
          "/venture",
          overviewActive,
          <>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
              <LayoutGrid className="h-4 w-4" />
            </span>
            Overview
          </>,
          "overview"
        )}
      </div>
      {GROUPS.map((group) => (
        <div key={group}>
          <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{group}</p>
          <div className="space-y-0.5">
            {MODULES.filter((m) => m.group === group).map((m) => {
              const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
              return item(
                m.href,
                active,
                <>
                  <ModuleIcon module={m} size="sm" />
                  <span className="flex-1">{m.title}</span>
                  <StatusDot status={m.status(state)} />
                </>,
                m.href
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function CompanyCard() {
  const { state } = useVenture();
  const name = companyName(state.seisEis.companyName);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-clay-400 to-clay-600 text-sm font-semibold text-white">
        {initials(name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-stone-900">{name}</p>
        <p className="text-xs text-stone-500">Sample data</p>
      </div>
    </div>
  );
}

function SidebarFooter({ onReset }: { onReset: () => void }) {
  return (
    <div className="space-y-1 border-t border-stone-200/80 pt-4">
      <button
        type="button"
        onClick={onReset}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
      >
        <RotateCcw className="h-4 w-4" /> Reset sample data
      </button>
      <Link
        href="/"
        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Figures
      </Link>
    </div>
  );
}

export function VentureShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resetDemoData } = useVenture();
  // The phone menu remembers the page it was opened on, so it closes by itself when the page changes.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const setMenuOpen = (open: boolean) => setMenuPath(open ? pathname : null);
  const [confirmReset, setConfirmReset] = useState(false);
  const current = moduleFor(pathname);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuPath(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col gap-6 overflow-y-auto border-r border-stone-200/80 bg-stone-50/80 px-4 py-6 backdrop-blur lg:flex">
        <Link href="/" className="flex items-baseline gap-2 px-2.5" aria-label="Figures home">
          <Image src="/figures-logo.png" alt="Figures" width={693} height={206} className="h-5 w-auto" />
          <span className="text-sm font-medium text-stone-400">Venture</span>
        </Link>
        <CompanyCard />
        <div className="flex-1">
          <NavLinks />
        </div>
        <SidebarFooter onReset={() => setConfirmReset(true)} />
      </aside>

      {/* Phone and tablet top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200/80 bg-white/85 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-stone-700 hover:bg-stone-100"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="truncate text-sm font-semibold text-stone-900">{current?.title ?? "Overview"}</p>
        <Link href="/" aria-label="Figures home" className="flex h-10 items-center">
          <Image src="/figures-logo.png" alt="Figures" width={693} height={206} className="h-4 w-auto" />
        </Link>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="overlay"
              className="fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              key="drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Venture menu"
              className="fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-xs flex-col gap-6 overflow-y-auto bg-stone-50 px-4 py-5 shadow-2xl lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <div className="flex items-center justify-between px-1">
                <span className="flex items-baseline gap-2">
                  <Image src="/figures-logo.png" alt="Figures" width={693} height={206} className="h-5 w-auto" />
                  <span className="text-sm font-medium text-stone-400">Venture</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <CompanyCard />
              <div className="flex-1">
                <NavLinks onNavigate={() => setMenuOpen(false)} />
              </div>
              <SidebarFooter onReset={() => setConfirmReset(true)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="lg:pl-72">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div>
      </main>

      <ConfirmDialog
        open={confirmReset}
        title="Reset the sample data?"
        description="This puts every module back to the sample company. Anything you have changed in this browser will be lost."
        confirmLabel="Reset"
        onConfirm={() => {
          resetDemoData();
          setConfirmReset(false);
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
