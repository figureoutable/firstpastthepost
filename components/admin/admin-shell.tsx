import Link from "next/link";
import Image from "next/image";
import type { TeamMember } from "@/lib/admin/team";
import { AdminNav } from "./admin-nav";

export function AdminShell({ member, children }: { member: TeamMember; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Link href="/admin" className="flex shrink-0 items-baseline gap-2" aria-label="Status board">
            <Image src="/figures-logo.png" alt="Figures" width={693} height={206} className="h-5 w-auto" priority />
            <span className="hidden text-sm font-medium text-stone-400 sm:inline">Team</span>
          </Link>
          <AdminNav email={member.email} isAdmin={member.role === "admin"} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

export function AdminTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-stone-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export const card = "rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]";
