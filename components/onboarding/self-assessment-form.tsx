"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import GradientButton from "@/components/kokonutui/gradient-button";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-none border border-stone-200 bg-stone-50/50 p-3 space-y-3 sm:p-4">
            <h3 className="text-base font-semibold text-stone-900 tracking-tight">{title}</h3>
            {children}
        </div>
    );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: total }, (_, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                    <div className={`h-1 w-full rounded-full transition-all duration-500 ${
                        i < current ? "bg-clay-500" : i === current ? "bg-clay-300" : "bg-stone-200"
                    }`} />
                </div>
            ))}
            <span className="text-[11px] text-stone-400 ml-1 tabular-nums whitespace-nowrap">
                {current + 1}/{total}
            </span>
        </div>
    );
}

function hasUpload(value: unknown): boolean {
    if (!value) return false;
    if (typeof File !== "undefined" && value instanceof File) return true;
    if (typeof value === "string") return value.trim().length > 0;
    return false;
}

function isValidUtr(value: string): boolean {
    return /^\d{10}$/.test((value || "").trim());
}

function isValidNi(value: string): boolean {
    // Exact length/shape only (2 letters + 6 digits + 1 letter). Letter exclusions are not enforced here.
    const cleaned = (value || "").replace(/\s/g, "").toUpperCase();
    return cleaned.length === 9 && /^[A-Z]{2}\d{6}[A-Z]$/.test(cleaned);
}

interface SelfAssessmentFormProps {
    data: any;
    updateData: (data: any) => void;
    onSubmit: (data: any) => Promise<void>;
    onBack: () => void;
    loading: boolean;
    formStep?: number;
    onFormStepChange?: (step: number) => void;
}

export function SelfAssessmentForm({
    data,
    updateData,
    onSubmit,
    onBack,
    loading,
    formStep = 1,
    onFormStepChange,
}: SelfAssessmentFormProps) {
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const step = formStep;
    const setStep = (next: number | ((prev: number) => number)) => {
        const value = typeof next === "function" ? next(step) : next;
        onFormStepChange?.(value);
    };

    const formData = {
        utrNumber: data.utrNumber || "",
        niNumber: data.niNumber || "",
        photoId: data.photoId ?? null,
        proofOfAddress: data.proofOfAddress ?? null,
        incomeTypes: data.incomeTypes || [],
        otherIncome: data.otherIncome || "",
        expectsForeignIncome: data.expectsForeignIncome || "",
        foreignIncomeDetails: data.foreignIncomeDetails || "",
        fullNamePassport: data.fullNamePassport || data.fullName || "",
        homeAddress: data.homeAddress || "",
        phoneNumber: data.phoneNumber || "",
        isPep: data.isPep || "",
        hasHighRiskIncome: data.hasHighRiskIncome || "",
        highRiskDetails: data.highRiskDetails || "",
        financialDifficulty: data.financialDifficulty || "",
        financialDifficultyDetails: data.financialDifficultyDetails || "",
        confirmed: !!data.confirmed,
    };

    const setFormData = (updater: any) => {
        updateData((prev: any) => {
            const current = {
                utrNumber: prev.utrNumber || "",
                niNumber: prev.niNumber || "",
                photoId: prev.photoId ?? null,
                proofOfAddress: prev.proofOfAddress ?? null,
                incomeTypes: prev.incomeTypes || [],
                otherIncome: prev.otherIncome || "",
                expectsForeignIncome: prev.expectsForeignIncome || "",
                foreignIncomeDetails: prev.foreignIncomeDetails || "",
                fullNamePassport: prev.fullNamePassport || prev.fullName || "",
                homeAddress: prev.homeAddress || "",
                phoneNumber: prev.phoneNumber || "",
                isPep: prev.isPep || "",
                hasHighRiskIncome: prev.hasHighRiskIncome || "",
                highRiskDetails: prev.highRiskDetails || "",
                financialDifficulty: prev.financialDifficulty || "",
                financialDifficultyDetails: prev.financialDifficultyDetails || "",
                confirmed: !!prev.confirmed,
            };
            const next = typeof updater === "function" ? updater(current) : updater;
            return { ...prev, ...next };
        });
    };

    const utrOk = isValidUtr(formData.utrNumber);
    const niOk = isValidNi(formData.niNumber);
    const canProceedStep1 =
        utrOk && niOk && hasUpload(formData.photoId) && hasUpload(formData.proofOfAddress);

    const canProceedStep2 = !!(
        (formData.incomeTypes || []).length >= 1
        && (formData.expectsForeignIncome === "Yes" || formData.expectsForeignIncome === "No")
        && (formData.expectsForeignIncome !== "Yes" || (formData.foreignIncomeDetails || "").trim())
        && (formData.fullNamePassport || "").trim()
        && (formData.homeAddress || "").trim()
        && (formData.phoneNumber || "").trim()
    );

    const canProceed = step === 1 ? canProceedStep1 : step === 2 ? canProceedStep2 : formData.confirmed;

    const handleIncomeToggle = (type: string) => {
        setFormData((prev: typeof formData) => ({
            ...prev,
            incomeTypes: prev.incomeTypes.includes(type)
                ? prev.incomeTypes.filter((t: string) => t !== type)
                : [...prev.incomeTypes, type]
        }));
    };

    const nextStep = () => setStep((s) => Math.min(s + 1, 3));
    const prevStep = () => setStep((s) => Math.max(s - 1, 1));

    const tryGoNext = () => {
        if (step === 1) {
            const errors: Record<string, string> = {};
            if (!utrOk) errors.utrNumber = "Enter exactly 10 digits";
            if (!niOk) errors.niNumber = "Enter exactly 9 characters (e.g. QQ123456C)";
            if (!hasUpload(formData.photoId)) errors.photoId = "Photo ID is required";
            if (!hasUpload(formData.proofOfAddress)) errors.proofOfAddress = "Proof of address is required";
            setFieldErrors(errors);
            if (Object.keys(errors).length > 0) return;
        }
        if (step === 2 && !canProceedStep2) {
            setFieldErrors({ step2: "Complete income types, foreign income, and contact details" });
            return;
        }
        setFieldErrors({});
        nextStep();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (step < 3) {
            tryGoNext();
        } else if (formData.confirmed) {
            onSubmit(formData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <StepIndicator current={step - 1} total={3} />

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                >
                    {step === 1 && (
                        <>
                            <Section title="Personal Tax Identifiers">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-3">
                                        <Label htmlFor="utrNumber" className="text-stone-900 text-sm">Unique Tax Reference (UTR) *</Label>
                                        <Input
                                            id="utrNumber"
                                            value={formData.utrNumber}
                                            onChange={(e) => {
                                                setFieldErrors((prev) => ({ ...prev, utrNumber: "" }));
                                                setFormData({ utrNumber: e.target.value.replace(/\D/g, "").slice(0, 10) });
                                            }}
                                            placeholder="Exactly 10 digits"
                                            inputMode="numeric"
                                            minLength={10}
                                            maxLength={10}
                                            aria-invalid={!!fieldErrors.utrNumber}
                                        />
                                        <p className={`text-xs ${fieldErrors.utrNumber ? "text-red-600" : "text-stone-500"}`}>
                                            {fieldErrors.utrNumber || `Exactly 10 digits${formData.utrNumber ? ` (${formData.utrNumber.length}/10)` : ""}`}
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="niNumber" className="text-stone-900 text-sm">National Insurance Number *</Label>
                                        <Input
                                            id="niNumber"
                                            value={formData.niNumber}
                                            onChange={(e) => {
                                                setFieldErrors((prev) => ({ ...prev, niNumber: "" }));
                                                const cleaned = e.target.value
                                                    .toUpperCase()
                                                    .replace(/[^A-Z0-9]/g, "")
                                                    .slice(0, 9);
                                                setFormData({ niNumber: cleaned });
                                            }}
                                            placeholder="QQ123456C"
                                            minLength={9}
                                            maxLength={9}
                                            aria-invalid={!!fieldErrors.niNumber}
                                        />
                                        <p className={`text-xs ${fieldErrors.niNumber ? "text-red-600" : "text-stone-500"}`}>
                                            {fieldErrors.niNumber || `Exactly 9 characters${formData.niNumber ? ` (${formData.niNumber.length}/9)` : " (e.g. QQ123456C)"}`}
                                        </p>
                                    </div>
                                </div>
                            </Section>

                            <Section title="Essential Document Uploads">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <FileUpload
                                            label="Photo ID"
                                            desc="Passport or Driving License"
                                            required
                                            value={formData.photoId instanceof File ? formData.photoId : null}
                                            onChange={(file) => {
                                                setFieldErrors((prev) => ({ ...prev, photoId: "" }));
                                                setFormData({ photoId: file });
                                            }}
                                        />
                                        {fieldErrors.photoId && (
                                            <p className="text-xs text-red-600">{fieldErrors.photoId}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <FileUpload
                                            label="Proof of Address"
                                            desc="Utility bill or bank statement (<3 months)"
                                            required
                                            value={formData.proofOfAddress instanceof File ? formData.proofOfAddress : null}
                                            onChange={(file) => {
                                                setFieldErrors((prev) => ({ ...prev, proofOfAddress: "" }));
                                                setFormData({ proofOfAddress: file });
                                            }}
                                        />
                                        {fieldErrors.proofOfAddress && (
                                            <p className="text-xs text-red-600">{fieldErrors.proofOfAddress}</p>
                                        )}
                                    </div>
                                </div>
                            </Section>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Section title="Contact Information">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-stone-900 text-sm">Full Name * (As shown on passport)</Label>
                                        <Input
                                            value={formData.fullNamePassport}
                                            onChange={(e) => setFormData({ fullNamePassport: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-stone-900 text-sm">Home Address *</Label>
                                        <Textarea
                                            value={formData.homeAddress}
                                            onChange={(e) => setFormData({ homeAddress: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-stone-900 text-sm">Phone Number *</Label>
                                        <Input
                                            type="tel"
                                            value={formData.phoneNumber}
                                            onChange={(e) => setFormData({ phoneNumber: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </Section>

                            <Section title="Income Types">
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                    {[
                                        "Employment (PAYE)",
                                        "Self-employment / Sole Trader",
                                        "Rental Income",
                                        "Dividends",
                                        "Bank Interest",
                                        "Capital Gains (Shares, Crypto, Property)",
                                        "Foreign Income",
                                        "Other (Pensions, Benefits, etc.)"
                                    ].map((type) => {
                                        const selected = formData.incomeTypes.includes(type);
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => handleIncomeToggle(type)}
                                                className={`flex min-h-12 items-center justify-center rounded-none border px-3 py-2 text-center text-sm font-medium transition ${
                                                    selected
                                                        ? "border-clay-500 bg-clay-50 text-clay-800"
                                                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                                                }`}
                                            >
                                                {type}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Section>

                            <Section title="Foreign Income Detail">
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                        <Label className="text-stone-900 text-sm shrink-0">Do you expect to receive income from outside the UK? *</Label>
                                        <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
                                            {(["Yes", "No"] as const).map((value) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    onClick={() => setFormData({ expectsForeignIncome: value })}
                                                    className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium transition ${
                                                        formData.expectsForeignIncome === value
                                                            ? "border-clay-500 bg-clay-50 text-clay-800"
                                                            : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                                                    }`}
                                                >
                                                    {value}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {formData.expectsForeignIncome === "Yes" && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                                            <Label className="text-stone-900 text-sm">List the countries and nature of income.</Label>
                                            <Textarea
                                                placeholder="e.g. USA - Dividends"
                                                value={formData.foreignIncomeDetails}
                                                onChange={(e) => setFormData({ foreignIncomeDetails: e.target.value })}
                                            />
                                        </motion.div>
                                    )}
                                </div>
                            </Section>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <Section title="Compliance Questions">
                                <div className="space-y-4">
                                    {(
                                        [
                                            ["isPep", "Are you a Politically Exposed Person (PEP)? *", null],
                                            ["hasHighRiskIncome", "Do you have income or links to sanctioned/high-risk countries? *", "highRiskDetails"],
                                            ["financialDifficulty", "Have you ever been bankrupt or in serious financial difficulty? *", "financialDifficultyDetails"],
                                        ] as const
                                    ).map(([field, label, detailField]) => (
                                        <div key={field} className="space-y-3">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                                <Label className="text-stone-900 text-sm">{label}</Label>
                                                <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
                                                    {(["Yes", "No"] as const).map((value) => (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            onClick={() => setFormData({ [field]: value })}
                                                            className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium transition ${
                                                                formData[field] === value
                                                                    ? "border-clay-500 bg-clay-50 text-clay-800"
                                                                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                                                            }`}
                                                        >
                                                            {value}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            {detailField === "highRiskDetails" && formData.hasHighRiskIncome === "Yes" && (
                                                <Input
                                                    placeholder="Please specify details..."
                                                    value={formData.highRiskDetails}
                                                    onChange={(e) => setFormData({ highRiskDetails: e.target.value })}
                                                />
                                            )}
                                            {detailField === "financialDifficultyDetails" && formData.financialDifficulty === "Yes" && (
                                                <Textarea
                                                    placeholder="Provide detail..."
                                                    value={formData.financialDifficultyDetails}
                                                    onChange={(e) => setFormData({ financialDifficultyDetails: e.target.value })}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Section>

                            <div className="flex flex-col gap-3 rounded-none border border-stone-200 bg-stone-50/50 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
                                <Label className="min-w-0 flex-1 font-normal text-sm text-stone-800 leading-snug">
                                    I confirm the information provided is accurate.
                                </Label>
                                <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
                                    {(["Yes", "No"] as const).map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setFormData({ confirmed: value === "Yes" })}
                                            className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium transition ${
                                                (formData.confirmed ? "Yes" : "No") === value
                                                    ? "border-clay-500 bg-clay-50 text-clay-800"
                                                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                                            }`}
                                        >
                                            {value}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>

            <div className="flex gap-3 pt-6 border-t border-stone-200">
                <Button
                    variant="outline"
                    onClick={step === 1 ? onBack : prevStep}
                    disabled={loading}
                    className="flex-1 border-stone-300 bg-card text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                    type="button"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> {step === 1 ? "Back" : "Previous"}
                </Button>

                {step < 3 ? (
                    <GradientButton
                        type="button"
                        onClick={tryGoNext}
                        disabled={loading || !canProceed}
                        className="flex-1"
                        variant="purple"
                    >
                        <span className="flex items-center gap-2">Next <ArrowRight className="w-4 h-4" /></span>
                    </GradientButton>
                ) : (
                    <GradientButton
                        type="submit"
                        disabled={loading || !formData.confirmed}
                        loading={loading}
                        className="flex-1"
                        variant="emerald"
                    >
                        Submit Application
                    </GradientButton>
                )}
            </div>
        </form>
    );
}
