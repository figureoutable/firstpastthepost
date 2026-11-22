"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CalendarDays, Check, Copy, ShieldCheck } from "lucide-react";
import { OnboardingForm, type DocKind, type StepId } from "@/components/onboarding/onboarding-form";
import { PageShell, PageTitle, Panel } from "@/components/site/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeDraftState } from "@/lib/onboarding-validation";
import { type OnboardingType } from "@/lib/onboarding-fields";
import { FIRM } from "@/lib/figures-config";
import { isTooLarge, prepareUpload } from "@/lib/compress-image";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Data = Record<string, any>;

const RESUME_CODE_KEY = "onboarding-resume-code";

const TITLES: Record<OnboardingType, string> = {
  "self-assessment": "Self Assessment",
  business: "Company onboarding",
  both: "Company and Self Assessment",
};

const emptyData = (): Data => ({
  photoId: null,
  proofOfAddress: null,
  incomeTypes: [],
  directors: [],
  servicesRequired: [],
  confirmed: false,
});

/** Brings drafts saved by the old forms into the new field names. */
function migrateDraft(type: OnboardingType, state: Data): Data {
  const next: Data = { ...state };
  if (next.utrNumber && !next.personalUtr && type === "self-assessment") next.personalUtr = next.utrNumber;
  if (next.utrNumber && !next.businessUtr && type === "business") next.businessUtr = next.utrNumber;
  for (const key of ["expectsForeignIncome", "isPep", "hasHighRiskIncome", "financialDifficulty"]) {
    if (typeof next[key] === "string") next[key] = next[key].toLowerCase();
  }
  if (!next.fullNamePassport && next.fullName) next.fullNamePassport = next.fullName;
  return next;
}

/** Loads a saved draft. The code goes in a header so it stays out of URLs and logs. */
function fetchDraft(code: string) {
  return fetch("/api/onboarding/draft", { headers: { "x-resume-code": code } });
}

function storage(action: "get" | "set" | "clear", value = ""): string {
  try {
    if (action === "get") return sessionStorage.getItem(RESUME_CODE_KEY) || "";
    if (action === "set") sessionStorage.setItem(RESUME_CODE_KEY, value);
    if (action === "clear") sessionStorage.removeItem(RESUME_CODE_KEY);
  } catch {
    /* private browsing */
  }
  return "";
}

export default function OnboardClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [formStep, setFormStep] = useState(1);
  const [onboardingType, setOnboardingType] = useState<OnboardingType | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [data, setData] = useState<Data>(emptyData);
  const [resumeCode, setResumeCode] = useState("");
  const [resumeInput, setResumeInput] = useState("");
  const [bannerError, setBannerError] = useState("");
  const [resuming, setResuming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const submittingRef = useRef(false);
  const skipNextAutosave = useRef(false);

  const applyDraft = useCallback((draft: { code: string; onboardingType: OnboardingType; formStep?: number; state?: Data }) => {
    skipNextAutosave.current = true;
    setResumeCode(draft.code);
    storage("set", draft.code);
    setOnboardingType(draft.onboardingType);
    setData({ ...emptyData(), ...migrateDraft(draft.onboardingType, sanitizeDraftState(draft.state || {})) });
    setFormStep(draft.formStep || 1);
    setStep(2);
    setErrorMessage("");
  }, []);

  // Pick up a draft saved earlier in this browser tab.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const code = storage("get");
      if (!code) {
        setHydrating(false);
        return;
      }
      try {
        const res = await fetchDraft(code);
        if (!res.ok) {
          if (res.status === 404) storage("clear");
          else if (!cancelled) setBannerError("We could not load your saved progress. Please refresh to try again.");
          return;
        }
        const draft = await res.json();
        if (!cancelled) applyDraft(draft);
      } catch {
        if (!cancelled) setBannerError("We could not load your saved progress. Please refresh to try again.");
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyDraft]);

  // Autosave a second after each change.
  useEffect(() => {
    if (!resumeCode || !onboardingType || step !== 2 || hydrating) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetch("/api/onboarding/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: resumeCode,
          onboardingType,
          outerStep: step,
          formStep,
          state: sanitizeDraftState(data),
        }),
      }).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [resumeCode, onboardingType, step, formStep, data, hydrating]);

  const uploadFile = async (original: File, kind: DocKind): Promise<string> => {
    const file = await prepareUpload(original);
    if (isTooLarge(file)) {
      throw new Error(`Your ${kind === "photoId" ? "photo ID" : "proof of address"} is over 4 MB. Please upload a smaller file or a photo of it.`);
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(`/api/upload?kind=${kind}`, {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream", "x-resume-code": resumeCode },
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.pathname) throw new Error(result.error || "Upload failed. Please try again.");
      return result.pathname as string;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const reminderRequested = useRef(false);

  /** Saves straight away (skipping the autosave delay), then emails the resume code once. */
  const handleStepComplete = async (stepId: StepId, formData: Data) => {
    if (stepId !== "you" || reminderRequested.current || !resumeCode || !onboardingType) return;
    reminderRequested.current = true;
    try {
      await fetch("/api/onboarding/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: resumeCode, onboardingType, outerStep: 2, formStep: 2, state: sanitizeDraftState(formData) }),
      });
      await fetch("/api/onboarding/draft/remind", { method: "POST", headers: { "x-resume-code": resumeCode } });
    } catch {
      /* not essential */
    }
  };

  const handleSubmit = async (formData: Data) => {
    if (submittingRef.current || !onboardingType) return;
    submittingRef.current = true;
    setLoading(true);
    setErrorMessage("");
    try {
      const submission: Data = { ...formData };
      if (formData.photoId instanceof File) {
        submission.photoId = await uploadFile(formData.photoId, "photoId");
        setData((prev) => ({ ...prev, photoId: submission.photoId }));
      }
      if (formData.proofOfAddress instanceof File) {
        submission.proofOfAddress = await uploadFile(formData.proofOfAddress, "proofOfAddress");
        setData((prev) => ({ ...prev, proofOfAddress: submission.proofOfAddress }));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const res = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submission, onboardingType, resumeCode }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.message || "Something went wrong. Please try again.");

      storage("clear");
      setResumeCode("");
      const params = new URLSearchParams({ type: onboardingType });
      if (formData.previousAccountant === "yes") params.set("handover", "1");
      router.push(`/onboard/success?${params.toString()}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.name === "AbortError"
          ? "That took too long. Please check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Please try again."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleResume = async () => {
    setBannerError("");
    const code = resumeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length !== 8) {
      setBannerError(code ? "Resume codes are 8 characters." : "Enter your resume code.");
      return;
    }
    setResuming(true);
    try {
      const res = await fetchDraft(code);
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBannerError(res.status === 404 ? "We could not find a saved form with that code." : result.error || "Please try again.");
        return;
      }
      applyDraft(result);
    } catch {
      setBannerError("We could not load your form. Please try again.");
    } finally {
      setResuming(false);
    }
  };

  const copyResumeCode = async () => {
    try {
      await navigator.clipboard.writeText(resumeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const backToPicker = () => {
    setStep(1);
    setBannerError("");
  };

  if (hydrating) {
    return (
      <PageShell>
        <p className="py-24 text-center text-sm text-stone-500">Loading your saved progress…</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="picker" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <PageTitle
              eyebrow="Become a client"
              title="New clients get a personal link"
              description="We now set everything up in one link: your engagement letter, payment and onboarding. Book a free call and we'll send yours."
            />

            {bannerError && (
              <p role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {bannerError}
              </p>
            )}

            <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-stone-200 bg-white p-6 text-center">
              <CalendarDays className="h-6 w-6 text-clay-600" />
              <p className="text-sm text-stone-600">
                A short call to understand what you need. Prefer email? Write to{" "}
                <a href={`mailto:${FIRM.contactEmail}`} className="font-medium text-clay-700 underline underline-offset-2">
                  {FIRM.contactEmail}
                </a>
                .
              </p>
              <Button asChild>
                <a href={FIRM.bookingUrl} target="_blank" rel="noopener noreferrer">
                  Book a free call
                </a>
              </Button>
            </div>

            <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1.5">
                <Label htmlFor="onboarding-resume-code">Already started a form?</Label>
                <p className="text-sm text-stone-500">Enter the 8-character code we gave you to carry on where you left off.</p>
              </div>
              <div className="flex gap-2">
                <Input
                  id="onboarding-resume-code"
                  value={resumeInput}
                  onChange={(e) => setResumeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                  onKeyDown={(e) => e.key === "Enter" && handleResume()}
                  placeholder="AB3K7MPQ"
                  aria-label="Resume code"
                  className="w-40 font-mono uppercase tracking-wider"
                  disabled={resuming}
                />
                <Button variant="outline" onClick={handleResume} disabled={resuming}>
                  {resuming ? "Loading…" : "Resume"}
                </Button>
              </div>
            </div>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-stone-500">
              <ShieldCheck className="h-3.5 w-3.5" /> Your documents are stored privately and only our team can see them.
            </p>
          </motion.div>
        )}

        {step === 2 && onboardingType && (
          <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <PageTitle eyebrow="Become a client" title={TITLES[onboardingType]} className="mb-5" />

            {resumeCode && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3">
                <p className="text-sm text-stone-700">
                  Your resume code is <span className="font-mono font-semibold tracking-wider text-clay-800">{resumeCode}</span>.{" "}
                  <span className="text-stone-500">We also email it to you once you add your email address.</span>
                </p>
                <Button type="button" variant="outline" size="sm" onClick={copyResumeCode} className="bg-white">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            )}

            {(errorMessage || bannerError) && (
              <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {errorMessage || bannerError}
              </div>
            )}

            <Panel>
              <OnboardingForm
                type={onboardingType}
                data={data}
                updateData={setData}
                onSubmit={handleSubmit}
                onBack={backToPicker}
                loading={loading}
                formStep={formStep}
                onFormStepChange={setFormStep}
                onUpload={(kind, file) => uploadFile(file, kind)}
                onStepComplete={handleStepComplete}
              />
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
