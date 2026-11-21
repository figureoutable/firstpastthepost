import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VentureProvider } from "@/lib/venture/store";
import { VentureSidebar } from "@/components/venture/sidebar-nav";
import { isVentureEnabled } from "@/lib/env";

export const metadata: Metadata = { title: "Venture" };

export default function VentureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hidden on the live site until NEXT_PUBLIC_VENTURE_ENABLED=true is set in Vercel.
  if (!isVentureEnabled()) notFound();

  return (
    <VentureProvider>
      <div className="min-h-screen bg-stone-50">
        <div className="flex w-full flex-col md:flex-row md:items-stretch">
          <VentureSidebar />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:py-10 lg:px-10">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </VentureProvider>
  );
}
