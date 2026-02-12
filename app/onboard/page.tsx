"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { Tilt } from "@/components/ui/tilt";
import { BusinessForm } from "@/components/onboarding/business-form";
import { SelfAssessmentForm } from "@/components/onboarding/self-assessment-form";
import { CombinedOnboardingForm } from "@/components/onboarding/combined-onboarding-form";

export default function OnboardPage() {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [onboardingType, setOnboardingType] = useState<"business" | "self-assessment" | "both" | null>(null);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const submittingRef = useRef(false);

    // Warm up API routes when form is shown so first Submit doesn't hang on "Compiling..."
    useEffect(() => {
        if (step !== 2) return;
        fetch("/api/aml-check", { method: "GET" }).catch(() => {});
        fetch("/api/upload", { method: "GET" }).catch(() => {});
    }, [step]);

    // We'll keep a minimal initial data state if we want to pre-fill standard fields from Step 1 in the future, 
    // but for now the sub-forms handle their own state mostly.
    const [baseData, setBaseData] = useState({
        // Common
        email: "",
        fullName: "",
        photoId: null,
        proofOfAddress: null,

        // Self Assessment
        fullNamePassport: "",
        phoneNumber: "",
        niNumber: "",
        personalUtr: "",
        incomeTypes: [],

        // Business
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
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s for uploads
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

            // Handle file uploads to Vercel Blob
            if (data.photoId instanceof File) {
                submissionData.photoId = await uploadFile(data.photoId);
            }
            if (data.proofOfAddress instanceof File) {
                submissionData.proofOfAddress = await uploadFile(data.proofOfAddress);
            }

            // Call AML check and submission API (with 30s timeout so it never hangs)
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
            setStep(3); // Success Step
        } catch (error: any) {
            setStatus("error");
            setErrorMessage(error.name === "AbortError" ? "Request took too long. Please try again." : error.message);
        } finally {
            setLoading(false);
            submittingRef.current = false;
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-3xl z-10"
            >
                {/* Wrap in Tilt only for Step 1 or Success, avoiding it for complex forms to prevent interaction issues */}
                {step !== 2 ? (
                    <Tilt rotationFactor={20} isRevese>
                        <MainCardContent
                            step={step}
                            onboardingType={onboardingType}
                            setOnboardingType={setOnboardingType}
                            setStep={setStep}
                            status={status}
                            errorMessage={errorMessage}
                            updateData={setBaseData}
                        />
                    </Tilt>
                ) : (
                    <Card className="border-border/50 shadow-2xl backdrop-blur-xl bg-card/80">
                        <MainCardContent
                            step={step}
                            onboardingType={onboardingType}
                            setOnboardingType={setOnboardingType}
                            setStep={setStep}
                            status={status}
                            errorMessage={errorMessage}
                            // Form Props
                            baseData={baseData}
                            updateData={setBaseData}
                            handleFinalSubmit={handleFinalSubmit}
                            loading={loading}
                        />
                    </Card>
                )}
            </motion.div>
        </div>
    );
}

// Extracted Content Component to re-use inside/outside Tilt
function MainCardContent({ step, onboardingType, setOnboardingType, setStep, status, errorMessage, baseData, updateData, handleFinalSubmit, loading }: any) {
    return (
        <Card className={`border-border/50 shadow-2xl backdrop-blur-xl bg-card/80 ${step !== 2 ? "" : "border-0 shadow-none bg-transparent"}`}>
            {step !== 1 && (
                <CardHeader className={step === 3 ? "text-center" : ""}>
                    <CardTitle>
                        {step === 2 ? (onboardingType === 'business' || onboardingType === 'both' ? "Business" : "Self Assessment") : "All Set!"}
                    </CardTitle>
                    <CardDescription>
                        {step === 2 && "Please provide the details requested."}
                        {step === 3 && "Thank you for providing your information and completing the onboarding process."}
                    </CardDescription>
                </CardHeader>
            )}
            <CardContent>
                {step === 1 && (
                    <div className="space-y-6 pt-6 px-4">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">Select the services you need</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ServiceButton
                                title="Business"
                                desc="Business Limited Companies"
                                onClick={() => { setOnboardingType('business'); setStep(2); }}
                            />
                            <ServiceButton
                                title="Self Assessment"
                                desc="Sole Traders"
                                onClick={() => { setOnboardingType('self-assessment'); setStep(2); }}
                            />
                            <ServiceButton
                                title="Both"
                                desc="Limited Companies and Self-Assessment"
                                onClick={() => { setOnboardingType('both'); setStep(2); }}
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        {status === "error" && (
                            <div className="mb-4 p-3 bg-destructive/15 text-destructive rounded-lg flex items-center gap-2 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {errorMessage}
                            </div>
                        )}

                        {onboardingType === 'business' && (
                            <BusinessForm
                                data={baseData}
                                updateData={updateData}
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
                                updateData={updateData}
                                onSubmit={handleFinalSubmit}
                                onBack={() => setStep(1)}
                                loading={loading}
                            />
                        )}
                    </div>
                )}

                {step === 3 && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center justify-center pt-0 pb-6 text-center space-y-6"
                    >
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                        </div>

                        <p className="text-muted-foreground text-sm max-w-[350px]">
                            We have securely received your details and our team is now performing the final administrative reviews to set up your account.
                        </p>
                    </motion.div>
                )}
            </CardContent>
            <CardFooter className="flex justify-center text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Encrypted & Secure
                </span>
            </CardFooter>
        </Card>
    );
}

function ServiceButton({ title, desc, onClick }: { title: string, desc: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full h-full p-6 rounded-2xl border border-border/50 bg-card/50 hover:bg-card/80 hover:border-primary/50 transition-all text-left flex flex-col justify-between group h-[180px]"
        >
            <div className="space-y-1">
                <div className="font-semibold text-lg group-hover:text-primary transition-colors leading-tight">{title}</div>
                <div className="text-sm text-muted-foreground line-clamp-3 leading-tight">{desc}</div>
            </div>
        </button>
    );
}
