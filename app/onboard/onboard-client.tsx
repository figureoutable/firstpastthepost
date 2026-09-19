"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ShieldCheck, Copy, Check } from "lucide-react";
import { VideoCard, type VideoCardHandle } from "@/components/kokonutui/video-card";
import ShimmerText from "@/components/kokonutui/shimmer-text";
import { BusinessForm } from "@/components/onboarding/business-form";
import { SelfAssessmentForm } from "@/components/onboarding/self-assessment-form";
import { CombinedOnboardingForm } from "@/components/onboarding/combined-onboarding-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OnboardingType = "business" | "self-assessment" | "both";

const RESUME_CODE_KEY = "onboarding-resume-code";

const emptyBaseData = () => ({
    email: "",
    fullName: "",
    photoId: null as File | string | null,
    proofOfAddress: null as File | string | null,
    fullNamePassport: "",
    phoneNumber: "",
    niNumber: "",
    personalUtr: "",
    utrNumber: "",
    incomeTypes: [] as string[],
    otherIncome: "",
    expectsForeignIncome: "",
    foreignIncomeDetails: "",
    homeAddress: "",
    isPep: "",
    hasHighRiskIncome: "",
    highRiskDetails: "",
    financialDifficulty: "",
    financialDifficultyDetails: "",
    confirmed: false,
    companyName: "",
    registrationNumber: "",
    businessUtr: "",
    utrNumberBusiness: "",
    companyAuthCode: "",
    directors: [] as unknown[],
    hasPaye: "no",
    isVatRegistered: "no",
    natureOfBusiness: "",
    sourceOfFunds: "",
    servicesRequired: [] as string[],
});

function parseOnboardingType(value: string | null): OnboardingType | null {
    if (value === "business" || value === "self-assessment" || value === "both") {
        return value;
    }
    return null;
}

function persistResumeCode(code: string) {
    try {
        sessionStorage.setItem(RESUME_CODE_KEY, code);
    } catch {
        /* ignore */
    }
}

function readResumeCode(): string {
    try {
        return sessionStorage.getItem(RESUME_CODE_KEY) || "";
    } catch {
        return "";
    }
}

function clearResumeCode() {
    try {
        sessionStorage.removeItem(RESUME_CODE_KEY);
    } catch {
        /* ignore */
    }
}

function ServiceVideoCard({
    label,
    src,
    startAt,
    onClick,
    disabled,
}: {
    label: string;
    src: string;
    startAt?: number;
    onClick: () => void;
    disabled?: boolean;
}) {
    const videoRef = useRef<VideoCardHandle>(null);

    return (
        <button
            type="button"
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className="flex h-full w-full flex-col bg-transparent text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 focus-visible:ring-offset-2 disabled:opacity-60"
            onMouseEnter={() => videoRef.current?.play()}
            onMouseLeave={() => videoRef.current?.pause()}
            onFocus={() => videoRef.current?.play()}
            onBlur={() => videoRef.current?.pause()}
        >
            <motion.div
                className="h-full min-h-0 w-full flex-1 leading-none"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
            >
                <VideoCard
                    ref={videoRef}
                    src={src}
                    startAt={startAt}
                    className="h-full min-h-[180px] rounded-none bg-transparent"
                />
            </motion.div>
        </button>
    );
}

export default function OnboardClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const typeFromUrl = parseOnboardingType(searchParams.get("type"));
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [formStep, setFormStep] = useState(1);
    const [onboardingType, setOnboardingType] = useState<OnboardingType | null>(null);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [baseData, setBaseData] = useState(emptyBaseData);
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

    const handleBack = () => {
        if (typeFromUrl) {
            router.push("/");
            return;
        }
        setStep(1);
        setBannerError("");
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const code = readResumeCode();
            if (!code) {
                if (!cancelled) setHydrating(false);
                return;
            }
            try {
                const res = await fetch(`/api/onboarding/draft?code=${encodeURIComponent(code)}`);
                if (!res.ok) {
                    if (!cancelled) setHydrating(false);
                    return;
                }
                const draft = await res.json();
                if (cancelled) return;
                skipNextAutosave.current = true;
                setResumeCode(draft.code);
                persistResumeCode(draft.code);
                setOnboardingType(draft.onboardingType);
                setBaseData({ ...emptyBaseData(), ...(draft.state || {}) });
                setFormStep(draft.formStep || 1);
                setStep(2);
            } catch {
                /* keep selector */
            } finally {
                if (!cancelled) setHydrating(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (hydrating) return;
        const nextType = parseOnboardingType(searchParams.get("type"));
        if (!nextType || urlDraftStarted.current || resumeCode) return;
        urlDraftStarted.current = true;
        (async () => {
            setStarting(true);
            setBannerError("");
            try {
                const res = await fetch("/api/onboarding/draft", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ onboardingType: nextType }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.code) {
                    setBannerError(data.error || "Could not create a resume code. Please try again.");
                    setOnboardingType(nextType);
                    setStep(2);
                    return;
                }
                skipNextAutosave.current = true;
                setResumeCode(data.code);
                persistResumeCode(data.code);
                setOnboardingType(nextType);
                setFormStep(1);
                setBaseData(emptyBaseData());
                setStep(2);
            } catch {
                setBannerError("Could not create a resume code. Please try again.");
                setOnboardingType(nextType);
                setStep(2);
            } finally {
                setStarting(false);
            }
        })();
    }, [searchParams, hydrating, resumeCode]);

    useEffect(() => {
        if (step !== 2) return;
        fetch("/api/aml-check", { method: "GET" }).catch(() => {});
        fetch("/api/upload", { method: "GET" }).catch(() => {});
    }, [step]);

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
                    state: baseData,
                }),
            }).catch(() => {});
        }, 1000);
        return () => clearTimeout(timer);
    }, [resumeCode, onboardingType, step, formStep, baseData, hydrating]);

    const uploadFile = async (file: File) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
            method: "POST",
            body: file,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to upload file");
        }
        const newBlob = await response.json();
        return newBlob.url;
    };

    const handleFinalSubmit = async (data: any) => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setLoading(true);
        setStatus("idle");
        setErrorMessage("");

        try {
            const submissionData = { ...data };

            if (data.photoId instanceof File) {
                submissionData.photoId = await uploadFile(data.photoId);
            }
            if (data.proofOfAddress instanceof File) {
                submissionData.proofOfAddress = await uploadFile(data.proofOfAddress);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            const res = await fetch("/api/aml-check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...submissionData, onboardingType }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            let result: { message?: string };
            try {
                result = await res.json();
            } catch {
                throw new Error("Invalid response from server. Please try again.");
            }

            if (!res.ok) {
                throw new Error(result.message || "Something went wrong");
            }

            clearResumeCode();
            setResumeCode("");
            setStatus("success");
            router.push("/onboard/success");
        } catch (error: any) {
            setStatus("error");
            setErrorMessage(
                error.name === "AbortError"
                    ? "Request took too long. Please try again."
                    : error.message
            );
        } finally {
            setLoading(false);
            submittingRef.current = false;
        }
    };

    const handleServiceSelect = async (type: OnboardingType) => {
        setBannerError("");
        setStarting(true);
        try {
            const res = await fetch("/api/onboarding/draft", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ onboardingType: type }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.code) {
                setBannerError(data.error || "Could not create a resume code. Please try again.");
                return;
            }
            skipNextAutosave.current = true;
            setResumeCode(data.code);
            persistResumeCode(data.code);
            setOnboardingType(type);
            setFormStep(1);
            setBaseData(emptyBaseData());
            setStep(2);
        } catch {
            setBannerError("Could not create a resume code. Please try again.");
        } finally {
            setStarting(false);
        }
    };

    const handleResume = async () => {
        setBannerError("");
        const code = resumeInput.trim().toUpperCase();
        if (!code) {
            setBannerError("Enter your resume code.");
            return;
        }
        setResuming(true);
        try {
            const res = await fetch(`/api/onboarding/draft?code=${encodeURIComponent(code)}`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setBannerError(data.error || "No draft found for that code.");
                return;
            }
            skipNextAutosave.current = true;
            setResumeCode(data.code);
            persistResumeCode(data.code);
            setOnboardingType(data.onboardingType);
            setBaseData({ ...emptyBaseData(), ...(data.state || {}) });
            setFormStep(data.formStep || 1);
            setStep(2);
            setStatus("idle");
            setErrorMessage("");
        } catch {
            setBannerError("Could not load your draft. Please try again.");
        } finally {
            setResuming(false);
        }
    };

    const copyResumeCode = useCallback(async () => {
        if (!resumeCode) return;
        try {
            await navigator.clipboard.writeText(resumeCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* ignore */
        }
    }, [resumeCode]);

    if (hydrating) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <p className="text-sm text-stone-600">Loading your saved progress…</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-clay-50/80 rounded-full blur-[120px]" />
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        className="w-full max-w-3xl z-10"
                    >
                        <div className="text-center mb-6">
                            <ShimmerText
                                text="Select Your Service"
                                className="text-3xl sm:text-4xl tracking-tight"
                            />
                        </div>

                        {bannerError && (
                            <p className="mb-4 rounded-none border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {bannerError}
                            </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-10 items-stretch">
                            <ServiceVideoCard
                                label="Self Assessment"
                                src="/videos/self-assessment.mp4"
                                startAt={0.5}
                                disabled={starting || resuming}
                                onClick={() => handleServiceSelect("self-assessment")}
                            />
                            <ServiceVideoCard
                                label="Business"
                                src="/videos/business.mp4"
                                startAt={0.5}
                                disabled={starting || resuming}
                                onClick={() => handleServiceSelect("business")}
                            />
                            <ServiceVideoCard
                                label="Both"
                                src="/videos/both.mp4"
                                startAt={0}
                                disabled={starting || resuming}
                                onClick={() => handleServiceSelect("both")}
                            />
                        </div>

                        <div className="mt-8 flex w-full justify-center">
                            <div className="w-fit max-w-full rounded-none border border-stone-200 bg-card px-4 py-3">
                                <Label htmlFor="onboarding-resume-code" className="mb-2 block whitespace-nowrap text-stone-900 leading-none">
                                    Already started? Resume with your code
                                </Label>
                                <div className="flex w-fit gap-2">
                                    <Input
                                        id="onboarding-resume-code"
                                        value={resumeInput}
                                        onChange={(e) =>
                                            setResumeInput(
                                                e.target.value
                                                    .toUpperCase()
                                                    .replace(/[^A-Z0-9]/g, "")
                                                    .slice(0, 8)
                                            )
                                        }
                                        placeholder="e.g. AB3K7MPQ"
                                        className="w-44 shrink-0 font-mono tracking-wider uppercase"
                                        maxLength={8}
                                        disabled={starting || resuming}
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={handleResume}
                                        disabled={starting || resuming}
                                        className="shrink-0 border-stone-300"
                                    >
                                        {resuming ? "Loading…" : "Resume"}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center mt-8">
                            <span className="flex items-center gap-1 text-xs text-stone-400">
                                <ShieldCheck className="w-3 h-3" /> Encrypted & Secure
                            </span>
                        </div>
                    </motion.div>
                )}

                {step === 2 && onboardingType && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        className="w-full max-w-3xl z-10"
                    >
                        {resumeCode && (
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-none border border-clay-200 bg-clay-50 px-3 py-2">
                                <div className="min-w-0 text-xs text-stone-700 sm:text-sm">
                                    <span className="font-medium text-stone-900">Resume code: </span>
                                    <span className="font-mono tracking-wider text-clay-800">
                                        {resumeCode}
                                    </span>
                                    <span className="mt-0.5 block text-stone-500 sm:mt-0 sm:ml-2 sm:inline">
                                        Keep this code to continue later on any device.
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={copyResumeCode}
                                    className="h-8 shrink-0 border-stone-300 bg-white px-2.5"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="mr-1.5 h-3.5 w-3.5" /> Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}

                        <div className="rounded-none border border-border bg-card p-6 sm:p-10">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-foreground tracking-tight">
                                    {onboardingType === "business"
                                        ? "Business Onboarding"
                                        : onboardingType === "self-assessment"
                                          ? "Self Assessment"
                                          : "Combined Onboarding"}
                                </h2>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Please provide the details requested below.
                                </p>
                            </div>

                            {status === "error" && (
                                <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-none flex items-center gap-2 text-sm">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {errorMessage}
                                </div>
                            )}

                            {onboardingType === "business" && (
                                <BusinessForm
                                    data={baseData}
                                    updateData={setBaseData}
                                    onSubmit={handleFinalSubmit}
                                    onBack={handleBack}
                                    loading={loading}
                                    formStep={formStep}
                                    onFormStepChange={setFormStep}
                                />
                            )}
                            {onboardingType === "self-assessment" && (
                                <SelfAssessmentForm
                                    data={baseData}
                                    updateData={setBaseData}
                                    onSubmit={handleFinalSubmit}
                                    onBack={handleBack}
                                    loading={loading}
                                    formStep={formStep}
                                    onFormStepChange={setFormStep}
                                />
                            )}
                            {onboardingType === "both" && (
                                <CombinedOnboardingForm
                                    data={baseData}
                                    updateData={setBaseData}
                                    onSubmit={handleFinalSubmit}
                                    onBack={handleBack}
                                    loading={loading}
                                    formStep={formStep}
                                    onFormStepChange={setFormStep}
                                />
                            )}
                        </div>

                        <div className="flex justify-center mt-6">
                            <span className="flex items-center gap-1 text-xs text-stone-400">
                                <ShieldCheck className="w-3 h-3" /> Encrypted & Secure
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
