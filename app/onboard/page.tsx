import { Suspense } from "react";
import OnboardClient from "./onboard-client";

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <OnboardClient />
    </Suspense>
  );
}
