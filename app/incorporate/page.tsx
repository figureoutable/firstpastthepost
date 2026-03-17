import Link from "next/link";
import { IncorporationWizard } from "@/components/incorporation/IncorporationWizard";

export default function IncorporatePage() {
  return (
    <div className="min-h-screen bg-zinc-50 py-6 md:py-10">
      <div className="mb-4 px-4 text-center">
        <Link href="/" className="text-sm text-purple-600 underline">
          ← Home
        </Link>
      </div>
      <IncorporationWizard />
    </div>
  );
}
