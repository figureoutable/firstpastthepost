import { Suspense } from "react";
import { getSettings } from "@/lib/engagements/settings";
import OnboardClient from "./onboard-client";

export const dynamic = "force-dynamic";

export default async function OnboardPage() {
  const { oldOnboardingForm } = await getSettings();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <OnboardClient formOpen={oldOnboardingForm} />
    </Suspense>
  );
}
