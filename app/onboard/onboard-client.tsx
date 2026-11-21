"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, Copy, ShieldCheck } from "lucide-react";
import { VideoCard, type VideoCardHandle } from "@/components/kokonutui/video-card";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { PageShell, PageTitle, Panel } from "@/components/site/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeDraftState } from "@/lib/onboarding-validation";
import { isOnboardingType, type OnboardingType } from "@/lib/onboarding-fields";
import { isTooLarge, prepareUpload } from "@/lib/compress-image";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Data = Record<string, any>;

const RESUME_CODE_KEY = "onboarding-resume-code";

const SERVICES: { type: OnboardingType; label: string; description: string; video: string; startAt: number }[] = [
  {
    type: "self-assessment",
    label: "Self Assessment",
    description: "Your personal tax return: employment, rental, dividends and more.",
    video: "/videos/self-assessment.mp4",
    startAt: 0.5,
  },
  {
    type: "business",
    label: "Company",
    description: "Accounts, corporation tax, VAT and payroll for your limited company.",
    video: "/videos/business.mp4",
    startAt: 0.5,
  },
  {
    type: "both",
    label: "Company and Self Assessment",
    description: "Both of the above, in one form.",
    video: "/videos/both.mp4",
    startAt: 0,
  },
];

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

function ServiceCard({
  service,
  onClick,
  disabled,
}: {
  service: (typeof SERVICES)[number];
  onClick: () => void;
  disabled?: boolean;
}) {
  const videoRef = useRef<VideoCardHandle>(null);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      onMouseEnter={() => videoRef.current?.play()}
      onMouseLeave={() => videoRef.current?.pause()}
      onFocus={() => videoRef.current?.play()}
      onBlur={() => videoRef.current?.pause()}
      className="group flex h-full flex-row overflow-hidden rounded-2xl border border-stone-200 bg-white text-left sm:flex-col shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-shadow hover:shadow-lg hover:shadow-stone-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/50 disabled:opacity-60"
    >
      <span className="block w-24 shrink-0 sm:w-full">
        <VideoCard ref={videoRef} src={service.video} startAt={service.startAt} className="aspect-[406/720] min-h-0" />
      </span>
      <span className="flex flex-1 flex-col justify-center gap-1 border-l border-stone-100 p-4 sm:justify-start sm:border-l-0 sm:border-t">
        <span className="font-semibold text-stone-900">{service.label}</span>
        <span className="text-sm leading-snug text-stone-500">{service.description}</span>
      </span>
    </motion.button>
  );
}

export default function OnboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeFromUrl = searchParams.get("type");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [formStep, setFormStep] = useState(1);
  const [onboardingType, setOnboardingType] = useState<OnboardingType | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [data, setData] = useState<Data>(emptyData);
  const [resumeCode, setResumeCode] = useState("");
  const [resumeInput, setResumeInput] = useState("");
  const [bannerError, setBannerError] = useState("");
  const [starting, setStarting] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const submittingRef = useRef(false);
  const skipNextAutosave = useRef(false);
  const urlDraftStarted = useRef(false);

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
        const res = await fetch(`/api/onboarding/draft?code=${encodeURIComponent(code)}`);
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

  const start = useCallback(async (type: OnboardingType) => {
    setBannerError("");
    setStarting(true);
    try {
      const res = await fetch("/api/onboarding/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingType: type }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.code) {
        setBannerError(result.error || "We could not start your form. Please try again.");
        return;
      }
      applyDraft({ code: result.code, onboardingType: type, formStep: 1, state: {} });
    } catch {
      setBannerError("We could not start your form. Please check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }, [applyDraft]);

  // Links like /onboard?type=business skip the picker.
  useEffect(() => {
    if (hydrating || resumeCode || urlDraftStarted.current) return;
    if (!isOnboardingType(typeFromUrl)) return;
    urlDraftStarted.current = true;
    void start(typeFromUrl);
  }, [hydrating, resumeCode, typeFromUrl, start]);

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

  const uploadFile = async (original: File, kind: "photoId" | "proofOfAddress"): Promise<string> => {
    const file = await prepareUpload(original);
    if (isTooLarge(file)) {
      throw new Error(`Your ${kind === "photoId" ? "photo ID" : "proof of address"} is over 4 MB. Please upload a smaller file or a photo of it.`);
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(
        `/api/upload?code=${encodeURIComponent(resumeCode)}&kind=${kind}`,
        { method: "POST", body: file, headers: { "Content-Type": file.type || "application/octet-stream" }, signal: controller.signal }
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.pathname) throw new Error(result.error || "Upload failed. Please try again.");
      return result.pathname as string;
    } finally {
      clearTimeout(timeoutId);
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
      const res = await fetch(`/api/onboarding/draft?code=${encodeURIComponent(code)}`);
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
    if (isOnboardingType(typeFromUrl)) {
      router.push("/");
      return;
    }
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
    <PageShell width={step === 1 ? "wide" : "default"}>
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="picker" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <PageTitle
              eyebrow="Become a client"
              title="What can we help you with?"
              description="Choose one to start. It takes about 10 minutes, and your progress saves as you go."
            />

            {bannerError && (
              <p role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {bannerError}
              </p>
            )}

            <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
              {SERVICES.map((service) => (
                <ServiceCard key={service.type} service={service} disabled={starting || resuming} onClick={() => start(service.type)} />
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1.5">
                <Label htmlFor="onboarding-resume-code">Already started?</Label>
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
                  disabled={starting || resuming}
                />
                <Button variant="outline" onClick={handleResume} disabled={starting || resuming}>
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
                  <span className="text-stone-500">Keep it to finish on any device.</span>
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
              />
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
