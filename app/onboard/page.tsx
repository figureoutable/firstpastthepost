"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Building2, User, Layers, ShieldCheck } from "lucide-react";
import { SpotlightCard, type SpotlightItem } from "@/components/kokonutui/spotlight-card";
import GradientButton from "@/components/kokonutui/gradient-button";
import ShimmerText from "@/components/kokonutui/shimmer-text";
import { BusinessForm } from "@/components/onboarding/business-form";
import { SelfAssessmentForm } from "@/components/onboarding/self-assessment-form";
import { CombinedOnboardingForm } from "@/components/onboarding/combined-onboarding-form";

const SERVICE_OPTIONS: SpotlightItem[] = [
    {
        icon: Building2,
        title: "Business",
        description: "Limited Company accounts, corporation tax, VAT, and payroll services.",
        color: "#60a5fa",
    },
    {
        icon: User,
        title: "Self Assessment",
        description: "Personal tax returns for sole traders, freelancers, and individuals.",
        color: "#a78bfa",
    },
    {
        icon: Layers,
        title: "Both",
        description: "Combined Limited Company and Self Assessment tax services.",
        color: "#34d399",
    },
];

export default function OnboardPage() {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [onboardingType, setOnboardingType] = useState<"business" | "self-assessment" | "both" | null>(null);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const submittingRef = useRef(false);

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

    const handleServiceSelect = (type: "business" | "self-assessment" | "both") => {
        setOnboardingType(type);
        setStep(2);
    };

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
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
                                text="Select your service"
                                className="text-3xl sm:text-4xl tracking-tight"
                            />
                            <p className="text-white/40 mt-3 text-sm">
                                Choose the service that best fits your needs.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SpotlightCard
                                item={SERVICE_OPTIONS[0]}
                                onClick={() => handleServiceSelect("business")}
                            />
                            <SpotlightCard
                                item={SERVICE_OPTIONS[1]}
                                onClick={() => handleServiceSelect("self-assessment")}
                            />
                            <SpotlightCard
                                item={SERVICE_OPTIONS[2]}
                                onClick={() => handleServiceSelect("both")}
                            />
                        </div>

                        <div className="flex justify-center mt-8">
                            <span className="flex items-center gap-1 text-xs text-white/20">
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
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 sm:p-10">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-white tracking-tight">
                                    {onboardingType === 'business' ? 'Business Onboarding' :
                                     onboardingType === 'self-assessment' ? 'Self Assessment' :
                                     'Combined Onboarding'}
                                </h2>
                                <p className="text-white/40 text-sm mt-1">
                                    Please provide the details requested below.
                                </p>
                            </div>

                            {status === "error" && (
                                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-2 text-sm">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {errorMessage}
                                </div>
                            )}

                            {onboardingType === 'business' && (
                                <BusinessForm
                                    data={baseData}
                                    updateData={setBaseData}
                                    onSubmit={handleFinalSubmit}
                                    onBack={() => setStep(1)}
                                    loading={loading}
                                />
                            )}
                            {onboardingType === 'self-assessment' && (
                                <SelfAssessmentForm
                                    initialData={baseData}
                                    onSubmit={handleFinalSubmit}
                                    onBack={() => setStep(1)}
                                    loading={loading}
                                />
                            )}
                            {onboardingType === 'both' && (
                                <CombinedOnboardingForm
                                    data={baseData}
                                    updateData={setBaseData}
                                    onSubmit={handleFinalSubmit}
                                    onBack={() => setStep(1)}
                                    loading={loading}
                                />
                            )}
                        </div>

                        <div className="flex justify-center mt-6">
                            <span className="flex items-center gap-1 text-xs text-white/20">
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
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-10 text-center">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                            </div>

                            <h2 className="text-2xl font-semibold text-white mb-3">All Set!</h2>
                            <p className="text-white/40 text-sm max-w-sm mx-auto">
                                We have securely received your details and our team is now performing the final administrative reviews to set up your account.
                            </p>
                        </div>

                        <div className="flex justify-center mt-6">
                            <span className="flex items-center gap-1 text-xs text-white/20">
                                <ShieldCheck className="w-3 h-3" /> Encrypted & Secure
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
