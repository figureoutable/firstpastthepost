"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
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

interface SelfAssessmentFormProps {
    initialData: any;
    onSubmit: (data: any) => Promise<void>;
    onBack: () => void;
    loading: boolean;
}

export function SelfAssessmentForm({ initialData, onSubmit, onBack, loading }: SelfAssessmentFormProps) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        utrNumber: initialData.utrNumber || "",
        niNumber: initialData.niNumber || "",
        photoId: null as File | null,
        proofOfAddress: null as File | null,
        incomeTypes: [] as string[],
        otherIncome: "",
        expectsForeignIncome: "",
        foreignIncomeDetails: "",
        fullNamePassport: initialData.fullName || "",
        homeAddress: "",
        phoneNumber: "",
        isPep: "",
        hasHighRiskIncome: "",
        highRiskDetails: "",
        financialDifficulty: "",
        financialDifficultyDetails: "",
        confirmed: false
    });

    const handleIncomeToggle = (type: string) => {
        setFormData(prev => ({
            ...prev,
            incomeTypes: prev.incomeTypes.includes(type)
                ? prev.incomeTypes.filter(t => t !== type)
                : [...prev.incomeTypes, type]
        }));
    };

    const nextStep = () => setStep(s => Math.min(s + 1, 3));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (step < 3) {
            nextStep();
        } else {
            onSubmit(formData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
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
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-3">
                                        <Label htmlFor="utrNumber" className="text-stone-900 text-sm">Unique Tax Reference (UTR) *</Label>
                                        <Input
                                            id="utrNumber"
                                            value={formData.utrNumber}
                                            onChange={(e) => setFormData({ ...formData, utrNumber: e.target.value })}
                                            placeholder="Your 10-digit tax number"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="niNumber" className="text-stone-900 text-sm">National Insurance Number *</Label>
                                        <Input
                                            id="niNumber"
                                            value={formData.niNumber}
                                            onChange={(e) => setFormData({ ...formData, niNumber: e.target.value })}
                                            placeholder="QQ 12 34 56 C"
                                            required
                                        />
                                    </div>
                                </div>
                            </Section>

                            <Section title="Essential Document Uploads">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <FileUpload
                                        label="Photo ID"
                                        desc="Passport or Driving License"
                                        required
                                        value={formData.photoId}
                                        onChange={(file) => setFormData({ ...formData, photoId: file })}
                                    />
                                    <FileUpload
                                        label="Proof of Address"
                                        desc="Utility bill or bank statement (<3 months)"
                                        required
                                        value={formData.proofOfAddress}
                                        onChange={(file) => setFormData({ ...formData, proofOfAddress: file })}
                                    />
                                </div>
                            </Section>
                        </>
                    )}

                    {step === 2 && (
                        <>
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
                                                    onClick={() => setFormData({ ...formData, expectsForeignIncome: value })}
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
                                                onChange={(e) => setFormData({ ...formData, foreignIncomeDetails: e.target.value })}
                                            />
                                        </motion.div>
                                    )}
                                </div>
                            </Section>

                            <Section title="Contact Information">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-stone-900 text-sm">Full Name * (As shown on passport)</Label>
                                        <Input
                                            value={formData.fullNamePassport}
                                            onChange={(e) => setFormData({ ...formData, fullNamePassport: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-stone-900 text-sm">Home Address *</Label>
                                        <Textarea
                                            value={formData.homeAddress}
                                            onChange={(e) => setFormData({ ...formData, homeAddress: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-stone-900 text-sm">Phone Number *</Label>
                                        <Input
                                            type="tel"
                                            value={formData.phoneNumber}
                                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                            required
                                        />
                                    </div>
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
                                                            onClick={() => setFormData({ ...formData, [field]: value })}
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
                                                    onChange={(e) => setFormData({ ...formData, highRiskDetails: e.target.value })}
                                                />
                                            )}
                                            {detailField === "financialDifficultyDetails" && formData.financialDifficulty === "Yes" && (
                                                <Textarea
                                                    placeholder="Provide detail..."
                                                    value={formData.financialDifficultyDetails}
                                                    onChange={(e) => setFormData({ ...formData, financialDifficultyDetails: e.target.value })}
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
                                            onClick={() => setFormData({ ...formData, confirmed: value === "Yes" })}
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
                        type="submit"
                        disabled={loading || (step === 1 && (!formData.utrNumber || !formData.niNumber || !formData.photoId || !formData.proofOfAddress))}
                        className="flex-1"
                        variant="purple"
                    >
                        <span className="flex items-center gap-2">Next <ArrowRight className="w-4 h-4" /></span>
                    </GradientButton>
                ) : (
                    <GradientButton
                        type="submit"
                        disabled={loading || !formData.confirmed}
                        className="flex-1"
                        variant="emerald"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Application"}
                    </GradientButton>
                )}
            </div>
        </form>
    );
}
