import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VentureProvider } from "@/lib/venture/store";
import { VentureShell } from "@/components/venture/shell";
import { isVentureEnabled } from "@/lib/env";

export const metadata: Metadata = { title: "Venture" };

export default function VentureLayout({ children }: { children: React.ReactNode }) {
  // Hidden on the live site until NEXT_PUBLIC_VENTURE_ENABLED=true is set in Vercel.
  if (!isVentureEnabled()) notFound();

  return (
    <VentureProvider>
      <VentureShell>{children}</VentureShell>
    </VentureProvider>
  );
}
