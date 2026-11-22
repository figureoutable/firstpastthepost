import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Team", template: "%s · Figures team" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-stone-50">{children}</div>;
}
