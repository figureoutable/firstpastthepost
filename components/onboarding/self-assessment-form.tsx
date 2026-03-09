"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import GradientButton from "@/components/kokonutui/gradient-button";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-6 space-y-4">
            <h3 className="text-base font-semibold text-zinc-900 tracking-tight">{title}</h3>
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
                        i < current ? "bg-purple-500" : i === current ? "bg-purple-300" : "bg-zinc-200"
                    }`} />
                </div>
            ))}
            <span className="text-[11px] text-zinc-400 ml-1 tabular-nums whitespace-nowrap">
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
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="utrNumber" className="text-zinc-600 text-sm">Unique Tax Reference (UTR) *</Label>
                                        <Input
                                            id="utrNumber"
                                            value={formData.utrNumber}
                                            onChange={(e) => setFormData({ ...formData, utrNumber: e.target.value })}
                                            placeholder="12345 67890"
                                            required
                                        />
                                        <p className="text-xs text-zinc-400">Your 10-digit tax number</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="niNumber" className="text-zinc-600 text-sm">National Insurance Number *</Label>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FileUpload
                                        label="Photo ID *"
                                        desc="Passport or Driving License"
                                        required
                                        value={formData.photoId}
                                        onChange={(file) => setFormData({ ...formData, photoId: file })}
                                    />
                                    <FileUpload
                                        label="Proof of Address *"
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
                                <p className="text-sm text-zinc-400">Select all that apply.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        "Employment (PAYE)",
                                        "Self-employment / Sole Trader",
                                        "Rental Income",
                                        "Dividends",
                                        "Bank Interest",
                                        "Capital Gains (Shares, Crypto, Property)",
                                        "Foreign Income",
                                        "Other (Pensions, Benefits, etc.)"
                                    ].map((type) => (
                                        <div key={type} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={type}
                                                checked={formData.incomeTypes.includes(type)}
                                                onCheckedChange={() => handleIncomeToggle(type)}
                                            />
                                            <Label htmlFor={type} className="text-sm font-normal text-zinc-700 cursor-pointer">{type}</Label>
                                        </div>
                                    ))}
                                </div>
                            </Section>

                            <Section title="Foreign Income Detail">
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <Label className="text-zinc-600 text-sm">Do you expect to receive income from outside the UK? *</Label>
                                        <RadioGroup
                                            value={formData.expectsForeignIncome}
                                            onValueChange={(val) => setFormData({ ...formData, expectsForeignIncome: val })}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="Yes" id="foreign-yes" /><Label htmlFor="foreign-yes" className="text-sm">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="No" id="foreign-no" /><Label htmlFor="foreign-no" className="text-sm">No</Label></div>
                                        </RadioGroup>
                                    </div>
                                    {formData.expectsForeignIncome === "Yes" && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                                            <Label className="text-zinc-600 text-sm">List the countries and nature of income.</Label>
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
                                        <Label className="text-zinc-600 text-sm">Full Name * (As shown on passport)</Label>
                                        <Input
                                            value={formData.fullNamePassport}
                                            onChange={(e) => setFormData({ ...formData, fullNamePassport: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-600 text-sm">Home Address *</Label>
                                        <Textarea
                                            value={formData.homeAddress}
                                            onChange={(e) => setFormData({ ...formData, homeAddress: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-600 text-sm">Phone Number *</Label>
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
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-zinc-600 text-sm">Are you a Politically Exposed Person (PEP)? *</Label>
                                        <RadioGroup value={formData.isPep} onValueChange={(val) => setFormData({ ...formData, isPep: val })} className="flex gap-6">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="Yes" id="pep-yes" /><Label htmlFor="pep-yes" className="text-sm">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="No" id="pep-no" /><Label htmlFor="pep-no" className="text-sm">No</Label></div>
                                        </RadioGroup>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-zinc-600 text-sm">Do you have income or links to sanctioned/high-risk countries? *</Label>
                                        <RadioGroup value={formData.hasHighRiskIncome} onValueChange={(val) => setFormData({ ...formData, hasHighRiskIncome: val })} className="flex gap-6">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="Yes" id="highrisk-yes" /><Label htmlFor="highrisk-yes" className="text-sm">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="No" id="highrisk-no" /><Label htmlFor="highrisk-no" className="text-sm">No</Label></div>
                                        </RadioGroup>
                                        {formData.hasHighRiskIncome === "Yes" && (
                                            <Input
                                                placeholder="Please specify details..."
                                                value={formData.highRiskDetails}
                                                onChange={(e) => setFormData({ ...formData, highRiskDetails: e.target.value })}
                                            />
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-zinc-600 text-sm">Have you ever been bankrupt or in serious financial difficulty? *</Label>
                                        <RadioGroup value={formData.financialDifficulty} onValueChange={(val) => setFormData({ ...formData, financialDifficulty: val })} className="flex gap-6">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="Yes" id="bankrupt-yes" /><Label htmlFor="bankrupt-yes" className="text-sm">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="No" id="bankrupt-no" /><Label htmlFor="bankrupt-no" className="text-sm">No</Label></div>
                                        </RadioGroup>
                                        {formData.financialDifficulty === "Yes" && (
                                            <Textarea
                                                placeholder="Provide detail..."
                                                value={formData.financialDifficultyDetails}
                                                onChange={(e) => setFormData({ ...formData, financialDifficultyDetails: e.target.value })}
                                            />
                                        )}
                                    </div>
                                </div>
                            </Section>

                            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="confirm"
                                        checked={formData.confirmed}
                                        onCheckedChange={(c) => setFormData({ ...formData, confirmed: c as boolean })}
                                    />
                                    <Label htmlFor="confirm" className="text-sm font-normal text-zinc-700 leading-tight cursor-pointer">
                                        I confirm the information provided is accurate.
                                    </Label>
                                </div>
                            </div>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>

            <div className="flex gap-3 pt-6 border-t border-zinc-200">
                <Button
                    variant="outline"
                    onClick={step === 1 ? onBack : prevStep}
                    disabled={loading}
                    className="flex-1 border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                    type="button"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> {step === 1 ? "Back" : "Previous"}
                </Button>

                {step < 3 ? (
                    <GradientButton
                        type="submit"
                        disabled={loading || (step === 1 && (!formData.utrNumber || !formData.niNumber))}
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
