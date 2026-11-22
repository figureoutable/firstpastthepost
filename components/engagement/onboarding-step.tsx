"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { OnboardingForm, type DocKind } from "@/components/onboarding/onboarding-form";
import { sanitizeDraftState } from "@/lib/onboarding-validation";
import type { OnboardingType } from "@/lib/onboarding-fields";
import { isTooLarge, prepareUpload } from "@/lib/compress-image";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Data = Record<string, any>;

const emptyData = (): Data => ({
  photoId: null,
  proofOfAddress: null,
  incomeTypes: [],
  directors: [],
  servicesRequired: [],
  confirmed: false,
});

/** The existing onboarding form, inside the client's link. Progress saves to the link itself. */
export function OnboardingStep({ token, onDone }: { token: string; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<OnboardingType | null>(null);
  const [data, setData] = useState<Data>(emptyData);
  const [formStep, setFormStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const skipAutosave = useRef(true);
  const submitting = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/start/${token}/onboarding`, { method: "POST" });
        const draft = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(draft.error || "We could not load your form. Please refresh.");
        if (cancelled) return;
        setCode(draft.code);
        setType(draft.onboardingType);
        setData({ ...emptyData(), ...sanitizeDraftState(draft.state || {}) });
        setFormStep(draft.formStep || 1);
        setReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "We could not load your form. Please refresh.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!ready || !code || !type) return;
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetch("/api/onboarding/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, onboardingType: type, outerStep: 2, formStep, state: sanitizeDraftState(data) }),
      }).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [ready, code, type, formStep, data]);

  const uploadFile = useCallback(
    async (original: File, kind: DocKind): Promise<string> => {
      const file = await prepareUpload(original);
      if (isTooLarge(file)) {
        throw new Error(`Your ${kind === "photoId" ? "photo ID" : "proof of address"} is over 4 MB. Please upload a smaller file or a photo of it.`);
      }
      const res = await fetch(`/api/upload?kind=${kind}`, {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream", "x-resume-code": code },
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.pathname) throw new Error(result.error || "Upload failed. Please try again.");
      return result.pathname as string;
    },
    [code]
  );

  const submit = async (formData: Data) => {
    if (submitting.current || !type) return;
    submitting.current = true;
    setLoading(true);
    setError("");
    try {
      const body: Data = { ...formData };
      if (formData.photoId instanceof File) body.photoId = await uploadFile(formData.photoId, "photoId");
      if (formData.proofOfAddress instanceof File) body.proofOfAddress = await uploadFile(formData.proofOfAddress, "proofOfAddress");
      const res = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, onboardingType: type, resumeCode: code, engagementToken: token }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.message || "Something went wrong. Please try again.");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  if (!ready) {
    return error ? (
      <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
      </p>
    ) : (
      <p className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your form…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}
      <OnboardingForm
        type={type!}
        data={data}
        updateData={setData}
        onSubmit={submit}
        loading={loading}
        formStep={formStep}
        onFormStepChange={setFormStep}
        onUpload={(kind, file) => uploadFile(file, kind)}
      />
    </div>
  );
}
