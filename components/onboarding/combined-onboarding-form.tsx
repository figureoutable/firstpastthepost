"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { ArrowLeft, ArrowRight, Plus, Trash2, Loader2 } from "lucide-react";
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

export function CombinedOnboardingForm({ data, updateData, onBack, onSubmit, loading }: any) {
    const [step, setStep] = useState(1);

    const updateField = (field: string, value: any) => {
        updateData({ ...data, [field]: value });
    };

    const canGoNext = () => {
        if (step === 1) {
            return !!(
                (data.fullNamePassport || "").trim()
                && /^\d{10}$/.test(data.personalUtr || "")
                && (data.companyName || "").trim()
                && /^\d{8}$/.test(data.registrationNumber || "")
                && /^\d{10}$/.test(data.businessUtr || "")
                && /^[A-Z0-9]{6}$/.test(data.companyAuthCode || "")
            );
        }
        if (step === 2) {
            return !!(
                (data.natureOfBusiness || "").trim()
                && (data.sourceOfFunds || "").trim()
                && (data.hasPaye === "yes" || data.hasPaye === "no")
                && (data.isVatRegistered === "yes" || data.isVatRegistered === "no")
            );
        }
        if (step === 3) {
            return (data.incomeTypes || []).length >= 1;
        }
        if (step === 4) {
            return (data.directors || []).length >= 1;
        }
        if (step === 5) {
            return !!(data.photoId && data.proofOfAddress);
        }
        return true;
    };

    const nextStep = () => {
        if (!canGoNext()) return;
        setStep((s) => Math.min(s + 1, 6));
    };
    const prevStep = () => setStep((s) => Math.max(s - 1, 1));

    return (
        <div className="space-y-6">
            <StepIndicator current={step - 1} total={6} />

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
                            <Section title="Personal Information">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-stone-900 text-sm">Full Name * (As shown on passport)</Label>
                                        <Input
                                            value={data.fullNamePassport || ""}
                                            onChange={(e) => updateField("fullNamePassport", e.target.value)}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-stone-900 text-sm">Personal UTR *</Label>
                                        <Input
                                            value={data.personalUtr || ""}
                                            onChange={(e) => updateField("personalUtr", e.target.value.replace(/\D/g, "").slice(0, 10))}
                                            placeholder="10-digit UTR"
                                            inputMode="numeric"
                                            minLength={10}
                                            maxLength={10}
                                        />
                                    </div>
                                </div>
                            </Section>

                            <Section title="Business Information">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-stone-900 text-sm">Company Name *</Label>
                                        <Input
                                            value={data.companyName || ""}
                                            onChange={(e) => updateField("companyName", e.target.value)}
                                            placeholder="Figures Ltd"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-stone-900 text-sm">Company Number *</Label>
                                        <Input
                                            value={data.registrationNumber || ""}
                                            onChange={(e) => updateField("registrationNumber", e.target.value.replace(/\D/g, "").slice(0, 8))}
                                            placeholder="8-digits"
                                            inputMode="numeric"
                                            minLength={8}
                                            maxLength={8}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-stone-900 text-sm">Business UTR *</Label>
                                        <Input
                                            value={data.businessUtr || ""}
                                            onChange={(e) => updateField("businessUtr", e.target.value.replace(/\D/g, "").slice(0, 10))}
                                            placeholder="10-digit UTR"
                                            inputMode="numeric"
                                            minLength={10}
                                            maxLength={10}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-stone-900 text-sm">Company Auth Code *</Label>
                                        <Input
                                            value={data.companyAuthCode || ""}
                                            onChange={(e) => updateField("companyAuthCode", e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6))}
                                            placeholder="6 characters"
                                            minLength={6}
                                            maxLength={6}
                                        />
                                    </div>
                                </div>
                            </Section>
                        </>
                    )}

                    {step === 2 && (
                        <Section title="Business Operations">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="businessNature" className="text-stone-900 text-sm">Nature of Business *</Label>
                                    <Textarea
                                        id="businessNature"
                                        placeholder="Daily activities, services provided..."
                                        value={data.natureOfBusiness || ""}
                                        onChange={(e) => updateField("natureOfBusiness", e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sourceOfFunds" className="text-stone-900 text-sm">Main Source of Funds/Income *</Label>
                                    <Input
                                        id="sourceOfFunds"
                                        placeholder="e.g. B2B Sales, Monthly Contracts"
                                        value={data.sourceOfFunds || ""}
                                        onChange={(e) => updateField("sourceOfFunds", e.target.value)}
                                    />
                                </div>

                                <div className="flex flex-col gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                    <Label className="text-stone-900 text-sm">Do you have an existing PAYE scheme? *</Label>
                                    <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
                                        {(["yes", "no"] as const).map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => updateField("hasPaye", value)}
                                                className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                                                    data.hasPaye === value
                                                        ? "border-clay-500 bg-clay-50 text-clay-800"
                                                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                                                }`}
                                            >
                                                {value}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {data.hasPaye === "yes" && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-clay-200">
                                        <div className="space-y-2"><Label className="text-stone-900 text-sm">Accounts Office Ref</Label><Input value={data.accountsOfficeRef || ""} onChange={(e) => updateField("accountsOfficeRef", e.target.value)} /></div>
                                        <div className="space-y-2"><Label className="text-stone-900 text-sm">PAYE Reference</Label><Input value={data.payeRef || ""} onChange={(e) => updateField("payeRef", e.target.value)} /></div>
                                    </motion.div>
                                )}

                                <div className="flex flex-col gap-3 pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                    <Label className="text-stone-900 text-sm">Are you VAT Registered? *</Label>
                                    <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
                                        {(["yes", "no"] as const).map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => updateField("isVatRegistered", value)}
                                                className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                                                    data.isVatRegistered === value
                                                        ? "border-clay-500 bg-clay-50 text-clay-800"
                                                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                                                }`}
                                            >
                                                {value}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {data.isVatRegistered === "yes" && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-clay-200">
                                        <div className="space-y-2"><Label className="text-stone-900 text-sm">VAT Number</Label><Input maxLength={9} value={data.vatNumber || ""} onChange={(e) => updateField("vatNumber", e.target.value)} /></div>
                                        <div className="space-y-2"><Label className="text-stone-900 text-sm">Registration Date</Label><Input type="date" value={data.vatRegDate || ""} onChange={(e) => updateField("vatRegDate", e.target.value)} /></div>
                                    </motion.div>
                                )}
                            </div>
                        </Section>
                    )}

                    {step === 3 && (
                        <Section title="Select Personal Income Types">
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                {["Employment (PAYE)", "Self-employment", "Rental Income", "Dividends", "Foreign Income", "Other"].map((type) => {
                                    const selected = (data.incomeTypes || []).includes(type);
                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => {
                                                const current = data.incomeTypes || [];
                                                const updated = selected
                                                    ? current.filter((t: string) => t !== type)
                                                    : [...current, type];
                                                updateField("incomeTypes", updated);
                                            }}
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
                    )}

                    {step === 4 && (
                        <Section title="Ownership & Roles">
                            <p className="text-sm text-stone-500">Add details for all directors or significant shareholders (25%+).</p>

                            <div className="space-y-3">
                                {(data.directors || []).map((director: any) => (
                                    <div key={director.id} className="p-4 rounded-none border border-stone-200 bg-stone-50/50 flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-stone-900">{director.firstName} {director.lastName}</p>
                                            <p className="text-sm text-stone-500">{director.role}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                                            onClick={() => updateField("directors", data.directors.filter((d: any) => d.id !== director.id))}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <DirectorEntryForm
                                onAdd={(director) => updateField("directors", [...(data.directors || []), { ...director, id: Date.now() }])}
                            />

                            <div className="space-y-2 pt-4 border-t border-stone-200">
                                <Label className="text-stone-900 text-sm">Trading Address (if different from Registration)</Label>
                                <Textarea
                                    value={data.tradingAddress || ""}
                                    onChange={(e) => updateField("tradingAddress", e.target.value)}
                                    placeholder="123 Street, City..."
                                />
                            </div>
                        </Section>
                    )}

                    {step === 5 && (
                        <Section title="Essential Document Uploads">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <FileUpload
                                    label="Photo ID"
                                    desc="Passport or Driving License"
                                    required
                                    value={data.photoId}
                                    onChange={(file) => updateField("photoId", file)}
                                />
                                <FileUpload
                                    label="Proof of Address"
                                    desc="Utility bill or bank statement (<3 months)"
                                    required
                                    value={data.proofOfAddress}
                                    onChange={(file) => updateField("proofOfAddress", file)}
                                />
                            </div>
                        </Section>
                    )}

                    {step === 6 && (
                        <>
                            <Section title="Compliance Checks">
                                <div className="space-y-4">
                                    {(
                                        [
                                            ["isPep", "Are you (or any owner) a Politically Exposed Person (PEP)? *"],
                                            ["hasSanctions", "Links to high-risk or sanctioned jurisdictions? *"],
                                            ["hasBankruptcy", "Any bankruptcy or disqualification history? *"],
                                        ] as const
                                    ).map(([field, label]) => (
                                        <div key={field} className="space-y-3">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                                <Label className="text-stone-900 text-sm">{label}</Label>
                                                <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
                                                    {(["yes", "no"] as const).map((value) => (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            onClick={() => updateField(field, value)}
                                                            className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                                                                (data[field] || "no") === value
                                                                    ? "border-clay-500 bg-clay-50 text-clay-800"
                                                                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                                                            }`}
                                                        >
                                                            {value}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            {field === "hasBankruptcy" && data.hasBankruptcy === "yes" && (
                                                <Textarea
                                                    placeholder="Provide details..."
                                                    value={data.bankruptcyDescription || ""}
                                                    onChange={(e) => updateField("bankruptcyDescription", e.target.value)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Section>

                            <div className="flex flex-col gap-3 rounded-none border border-stone-200 bg-stone-50/50 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
                                <Label className="min-w-0 flex-1 font-normal text-sm text-stone-800 leading-snug">
                                    I confirm that all information provided for both Business and Self Assessment services is accurate.
                                </Label>
                                <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
                                    {(["yes", "no"] as const).map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => updateField("confirmed", value === "yes")}
                                            className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                                                (data.confirmed ? "yes" : "no") === value
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
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> {step === 1 ? "Back" : "Previous"}
                </Button>

                {step < 6 ? (
                    <GradientButton
                        onClick={nextStep}
                        disabled={!canGoNext()}
                        className="flex-1"
                        variant="purple"
                    >
                        <span className="flex items-center gap-2">Next <ArrowRight className="w-4 h-4" /></span>
                    </GradientButton>
                ) : (
                    <GradientButton
                        onClick={() => onSubmit(data)}
                        disabled={loading || !data.confirmed}
                        className="flex-1"
                        variant="emerald"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Combined Application"}
                    </GradientButton>
                )}
            </div>
        </div>
    );
}

function DirectorEntryForm({ onAdd }: { onAdd: (d: any) => void }) {
    const [director, setDirector] = useState({ firstName: "", lastName: "", role: "", dob: "", address: "" });

    const handleAdd = () => {
        if (director.firstName && director.lastName && director.role) {
            onAdd(director);
            setDirector({ firstName: "", lastName: "", role: "", dob: "", address: "" });
        }
    };

    return (
        <div className="space-y-4">
            <h4 className="font-medium text-sm text-stone-600">Add New Director/Shareholder</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-stone-900 text-sm">First Name</Label>
                    <Input value={director.firstName} onChange={(e) => setDirector({ ...director, firstName: e.target.value })} placeholder="John" />
                </div>
                <div className="space-y-2">
                    <Label className="text-stone-900 text-sm">Last Name</Label>
                    <Input value={director.lastName} onChange={(e) => setDirector({ ...director, lastName: e.target.value })} placeholder="Doe" />
                </div>
                <div className="space-y-2">
                    <Label className="text-stone-900 text-sm">Role</Label>
                    <Input value={director.role} onChange={(e) => setDirector({ ...director, role: e.target.value })} placeholder="Director" />
                </div>
                <div className="space-y-2">
                    <Label className="text-stone-900 text-sm">Date of Birth</Label>
                    <Input type="date" value={director.dob} onChange={(e) => setDirector({ ...director, dob: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label className="text-stone-900 text-sm">Home Address</Label>
                    <Textarea value={director.address} onChange={(e) => setDirector({ ...director, address: e.target.value })} placeholder="Address..." className="min-h-[60px]" />
                </div>
            </div>
            <Button
                onClick={handleAdd}
                disabled={!director.firstName || !director.lastName || !director.role}
                className="w-full border-stone-300 bg-card text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                variant="outline"
            >
                <Plus className="w-4 h-4 mr-2" /> Add Person
            </Button>
        </div>
    );
}
