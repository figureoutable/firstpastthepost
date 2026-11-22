"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { IncorporationWizard, type WizardLinkMode } from "@/components/incorporation/IncorporationWizard";

/** The company formation form, inside the client's link. Progress saves to the link itself. */
export function FormationStep({ token, onDone }: { token: string; onDone: () => void }) {
  const [draft, setDraft] = useState<WizardLinkMode["draft"] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/start/${token}/onboarding`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.formation) throw new Error(data.error || "We could not load your form. Please refresh.");
        if (!cancelled) setDraft({ code: data.code, step: data.step || 1, phase: data.phase === "form" ? "form" : "banner", state: data.state });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "We could not load your form. Please refresh.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
      </p>
    );
  }
  if (!draft) return <Loader2 className="mx-auto my-14 h-7 w-7 animate-spin text-clay-500" />;
  return <IncorporationWizard link={{ token, draft, onDone }} />;
}
