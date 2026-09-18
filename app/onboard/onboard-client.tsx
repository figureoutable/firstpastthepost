"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { VideoCard, type VideoCardHandle } from "@/components/kokonutui/video-card";
import ShimmerText from "@/components/kokonutui/shimmer-text";
import { BusinessForm } from "@/components/onboarding/business-form";
import { SelfAssessmentForm } from "@/components/onboarding/self-assessment-form";
import { CombinedOnboardingForm } from "@/components/onboarding/combined-onboarding-form";

type OnboardingType = "business" | "self-assessment" | "both";

function parseOnboardingType(value: string | null): OnboardingType | null {
    if (value === "business" || value === "self-assessment" || value === "both") {
        return value;
    }
    return null;
}

function ServiceVideoCard({
    label,
    src,
    startAt,
    onClick,
}: {
    label: string;
    src: string;
    startAt?: number;
    onClick: () => void;
}) {
    const videoRef = useRef<VideoCardHandle>(null);

    return (
        <button
            type="button"
            aria-label={label}
            onClick={onClick}
            className="flex h-full w-full flex-col bg-transparent text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 focus-visible:ring-offset-2"
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
    const [step, setStep] = useState(typeFromUrl ? 2 : 1);
    const [onboardingType, setOnboardingType] = useState<OnboardingType | null>(typeFromUrl);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const submittingRef = useRef(false);

    const handleBack = () => {
        if (typeFromUrl) {
            router.push("/");
            return;
        }
        setStep(1);
    };

    useEffect(() => {
        const nextType = parseOnboardingType(searchParams.get("type"));
        if (!nextType) return;
        setOnboardingType(nextType);
        setStep(2);
    }, [searchParams]);

    useEffect(() => {
        if (step !== 2) return;
        fetch("/api/aml-check", { method: "GET" }).catch(() => {});
        fetch("/api/upload", { method: "GET" }).catch(() => {});
    }, [step]);

    const [baseData, setBaseData] = useState({
        email: "",
        fullName: "",
        photoId: null,
        proofOfAddress: null,
        fullNamePassport: "",
        phoneNumber: "",
        niNumber: "",
        personalUtr: "",
        incomeTypes: [],
        companyName: "",
        registrationNumber: "",
        businessUtr: "",
        companyAuthCode: "",
        directors: [],
        hasPaye: "no",
        isVatRegistered: "no",
        natureOfBusiness: "",
        sourceOfFunds: ""
    });

    const uploadFile = async (file: File) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
            method: 'POST',
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

            setStatus("success");
            setStep(3);
        } catch (error: any) {
            setStatus("error");
            setErrorMessage(error.name === "AbortError" ? "Request took too long. Please try again." : error.message);
        } finally {
            setLoading(false);
            submittingRef.current = false;
        }
    };

    const handleServiceSelect = (type: OnboardingType) => {
        setOnboardingType(type);
        setStep(2);
    };

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
                        <div className="text-center mb-10">
                            <ShimmerText
                                text="Select Your Service"
                                className="text-3xl sm:text-4xl tracking-tight"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-10 items-stretch">
                            <ServiceVideoCard
                                label="Self Assessment"
                                src="/videos/self-assessment.mp4"
                                startAt={0.5}
                                onClick={() => handleServiceSelect("self-assessment")}
                            />
                            <ServiceVideoCard
                                label="Business"
                                src="/videos/business.mp4"
                                startAt={0.5}
                                onClick={() => handleServiceSelect("business")}
                            />
                            <ServiceVideoCard
                                label="Both"
                                src="/videos/both.mp4"
                                startAt={0.5}
                                onClick={() => handleServiceSelect("both")}
                            />
                        </div>

                        <div className="flex justify-center mt-8">
                            <span className="flex items-center gap-1 text-xs text-stone-400">
                                <ShieldCheck className="w-3 h-3" /> Encrypted & Secure
                            </span>
                        </div>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        className="w-full max-w-3xl z-10"
                    >
                        <div className="rounded-none border border-border bg-card p-6 sm:p-10">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-foreground tracking-tight">
                                    {onboardingType === 'business' ? 'Business Onboarding' :
                                     onboardingType === 'self-assessment' ? 'Self Assessment' :
                                     'Combined Onboarding'}
                                </h2>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Please provide the details requested below.
                                </p>
                            </div>

                            {status === "error" && (
                                <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {errorMessage}
                                </div>
                            )}

                            {onboardingType === 'business' && (
                                <BusinessForm
                                    data={baseData}
                                    updateData={setBaseData}
                                    onSubmit={handleFinalSubmit}
                                    onBack={handleBack}
                                    loading={loading}
                                />
                            )}
                            {onboardingType === 'self-assessment' && (
                                <SelfAssessmentForm
                                    initialData={baseData}
                                    onSubmit={handleFinalSubmit}
                                    onBack={handleBack}
                                    loading={loading}
                                />
                            )}
                            {onboardingType === 'both' && (
                                <CombinedOnboardingForm
                                    data={baseData}
                                    updateData={setBaseData}
                                    onSubmit={handleFinalSubmit}
                                    onBack={handleBack}
                                    loading={loading}
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

                {step === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full max-w-lg z-10"
                    >
                        <div className="rounded-none border border-border bg-card p-10 text-center">
                            <div className="w-20 h-20 bg-clay-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-clay-600" />
                            </div>

                            <h2 className="text-2xl font-semibold text-foreground mb-3">All Set!</h2>
                            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                                We have securely received your details and our team is now performing the final administrative reviews to set up your account.
                            </p>
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
