"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminNav({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = [
    { href: "/admin", label: "Clients", active: pathname === "/admin" || pathname.startsWith("/admin/clients") },
    ...(isAdmin ? [{ href: "/admin/settings", label: "Settings", active: pathname.startsWith("/admin/settings") }] : []),
  ];

  const signOut = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="flex flex-1 items-center justify-between gap-3">
      <nav className="flex items-center gap-0.5 sm:gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3",
              l.active ? "bg-stone-100 text-stone-900" : "text-stone-500 hover:text-stone-900"
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <Link
          href="/admin/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-clay-500 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-clay-600"
        >
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New client</span>
        </Link>
        <span className="hidden text-sm text-stone-500 md:inline">{email}</span>
        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
