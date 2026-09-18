import { VentureProvider } from "@/lib/venture/store";
import { VentureSidebar } from "@/components/venture/sidebar-nav";

export default function VentureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VentureProvider>
      <div className="min-h-screen bg-background py-6 md:py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-start md:gap-8">
          <VentureSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </VentureProvider>
  );
}
