"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Tilt } from "@/components/ui/tilt";
import { FileUpload } from "@/components/ui/file-upload";
import { Progress } from "@/components/ui/progress";

interface SelfAssessmentFormProps {
    initialData: any;
    onSubmit: (data: any) => Promise<void>;
    onBack: () => void;
    loading: boolean;
}

export function SelfAssessmentForm({ initialData, onSubmit, onBack, loading }: SelfAssessmentFormProps) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        // Page 1: Tax Identifiers & Documents
        utrNumber: initialData.utrNumber || "",
        niNumber: initialData.niNumber || "",
        photoId: null as File | null,
        proofOfAddress: null as File | null,

        // Page 2: Income & Contact
        incomeTypes: [] as string[],
        otherIncome: "",
        expectsForeignIncome: "",
        foreignIncomeDetails: "",
        fullNamePassport: initialData.fullName || "",
        homeAddress: "",
        phoneNumber: "",

        // Page 3: Compliance & Confirmation
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

    const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

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
            {/* Progress Bar */}
            <div className="mt-1 mb-6">
                <Progress
                    value={progress}
                    className="h-4 w-full rounded-none bg-neutral-200 dark:bg-neutral-700"
                    indicatorClassName="bg-black dark:bg-white"
                    segmented
                />
                <div className="flex justify-end mt-1">
                    <span className="text-[10px] font-medium text-muted-foreground">
                        {progress}%
                    </span>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                >
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">1. Personal Tax Identifiers</h3>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="utrNumber">Unique Tax Reference (UTR) *</Label>
                                        <p className="text-xs text-muted-foreground">Your 10-digit tax number.</p>
                                        <Input
                                            id="utrNumber"
                                            value={formData.utrNumber}
                                            onChange={(e) => setFormData({ ...formData, utrNumber: e.target.value })}
                                            placeholder="12345 67890"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="niNumber">National Insurance Number *</Label>
                                        <p className="text-xs text-muted-foreground">(e.g., QQ 12 34 56 C).</p>
                                        <Input
                                            id="niNumber"
                                            value={formData.niNumber}
                                            onChange={(e) => setFormData({ ...formData, niNumber: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">2. Essential Document Uploads</h3>
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
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">1. Select All Income Types That Apply *</h3>
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
                                            <Label htmlFor={type} className="text-sm font-normal cursor-pointer">{type}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">2. Foreign Income Detail</h3>
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <Label>Do you expect to receive income from outside the UK? *</Label>
                                        <RadioGroup
                                            value={formData.expectsForeignIncome}
                                            onValueChange={(val) => setFormData({ ...formData, expectsForeignIncome: val })}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2 text-sm"><RadioGroupItem value="Yes" id="foreign-yes" /><Label htmlFor="foreign-yes">Yes</Label></div>
                                            <div className="flex items-center space-x-2 text-sm"><RadioGroupItem value="No" id="foreign-no" /><Label htmlFor="foreign-no">No</Label></div>
                                        </RadioGroup>
                                    </div>
                                    {formData.expectsForeignIncome === "Yes" && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                            <Label>Please list the countries and the nature of that income.</Label>
                                            <Textarea
                                                placeholder="e.g. USA - Dividends"
                                                value={formData.foreignIncomeDetails}
                                                onChange={(e) => setFormData({ ...formData, foreignIncomeDetails: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">3. Contact Information</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Full Name * (As shown on passport)</Label>
                                        <Input
                                            value={formData.fullNamePassport}
                                            onChange={(e) => setFormData({ ...formData, fullNamePassport: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Home Address *</Label>
                                        <Textarea
                                            value={formData.homeAddress}
                                            onChange={(e) => setFormData({ ...formData, homeAddress: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Phone Number *</Label>
                                        <Input
                                            type="tel"
                                            value={formData.phoneNumber}
                                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">1. Compliance Questions</h3>
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <Label>Politically Exposed Person (PEP) *: Are you a PEP?</Label>
                                        <RadioGroup
                                            value={formData.isPep}
                                            onValueChange={(val) => setFormData({ ...formData, isPep: val })}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="Yes" id="pep-yes" /><Label htmlFor="pep-yes">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="No" id="pep-no" /><Label htmlFor="pep-no">No</Label></div>
                                        </RadioGroup>
                                    </div>

                                    <div className="space-y-4">
                                        <Label>High-Risk Jurisdictions *: Do you have income or links to sanctioned or high-risk countries?</Label>
                                        <RadioGroup
                                            value={formData.hasHighRiskIncome}
                                            onValueChange={(val) => setFormData({ ...formData, hasHighRiskIncome: val })}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="Yes" id="highrisk-yes" /><Label htmlFor="highrisk-yes">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="No" id="highrisk-no" /><Label htmlFor="highrisk-no">No</Label></div>
                                        </RadioGroup>
                                        {formData.hasHighRiskIncome === "Yes" && (
                                            <Input
                                                placeholder="Please specify details..."
                                                value={formData.highRiskDetails}
                                                onChange={(e) => setFormData({ ...formData, highRiskDetails: e.target.value })}
                                                className="animate-in fade-in slide-in-from-top-2"
                                            />
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <Label>Financial History *: Have you ever been bankrupt or involved in serious financial difficulty?</Label>
                                        <RadioGroup
                                            value={formData.financialDifficulty}
                                            onValueChange={(val) => setFormData({ ...formData, financialDifficulty: val })}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="Yes" id="bankrupt-yes" /><Label htmlFor="bankrupt-yes">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="No" id="bankrupt-no" /><Label htmlFor="bankrupt-no">No</Label></div>
                                        </RadioGroup>
                                        {formData.financialDifficulty === "Yes" && (
                                            <Textarea
                                                placeholder="Provide detail..."
                                                value={formData.financialDifficultyDetails}
                                                onChange={(e) => setFormData({ ...formData, financialDifficultyDetails: e.target.value })}
                                                className="animate-in fade-in slide-in-from-top-2"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">2. Final Confirmation</h3>
                                <div className="flex items-center space-x-3 pt-4">
                                    <Checkbox
                                        id="confirm"
                                        checked={formData.confirmed}
                                        onCheckedChange={(c) => setFormData({ ...formData, confirmed: c as boolean })}
                                    />
                                    <Label htmlFor="confirm" className="text-sm font-normal leading-none cursor-pointer">
                                        I confirm the information provided is accurate.
                                    </Label>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            <div className="flex gap-4 pt-4 border-t border-border/50 mt-8">
                <Button variant="outline" onClick={step === 1 ? onBack : prevStep} disabled={loading} className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" /> {step === 1 ? "Back" : "Previous"}
                </Button>

                <Tilt rotationFactor={10} isRevese className="w-full">
                    <Button
                        className={`w-full ${step === 3 ? "bg-green-600 hover:bg-green-700" : ""}`}
                        type="submit"
                        disabled={loading || (step === 1 && (!formData.utrNumber || !formData.niNumber)) || (step === 3 && !formData.confirmed)}
                    >
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : step < 3 ? (
                            <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
                        ) : (
                            "Submit Application"
                        )}
                    </Button>
                </Tilt>
            </div>
        </form>
    );
}
