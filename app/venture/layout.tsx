import { VentureProvider } from "@/lib/venture/store";
import { VentureSidebar } from "@/components/venture/sidebar-nav";

export default function VentureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VentureProvider>
      <div className="min-h-screen bg-background">
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
