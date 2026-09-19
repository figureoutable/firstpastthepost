"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { Expandable } from "@/components/ui/expandable";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

export function BusinessForm({
    data,
    updateData,
    onBack,
    onSubmit,
    loading,
    formStep = 1,
    onFormStepChange,
}: any) {
    const step = formStep;
    const setStep = (next: number | ((prev: number) => number)) => {
        const value = typeof next === "function" ? next(step) : next;
        onFormStepChange?.(value);
    };

    const updateField = (field: string, value: any) => {
        updateData((prev: any) => ({ ...prev, [field]: value }));
    };

    const canGoNext = () => {
        if (step === 1) {
            return !!(
                (data.companyName || "").trim()
                && /^\d{8}$/.test(data.registrationNumber || "")
                && /^\d{10}$/.test(data.utrNumber || "")
                && /^[A-Z0-9]{6}$/.test(data.companyAuthCode || "")
                && (data.hasPaye === "yes" || data.hasPaye === "no")
                && (data.isVatRegistered === "yes" || data.isVatRegistered === "no")
                && data.photoId
                && data.proofOfAddress
            );
        }
        if (step === 2) {
            return (
                (data.directors || []).length >= 1
                && (data.servicesRequired || []).length >= 1
                && !!(data.natureOfBusiness || "").trim()
                && !!(data.sourceOfFunds || "").trim()
            );
        }
        return true;
    };

    const nextStep = () => {
        if (!canGoNext()) return;
        setStep((s) => s + 1);
    };
    const prevStep = () => setStep((s) => s - 1);

    return (
        <div className="space-y-6">
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
                            <Section title="Tax & Corporate Identifiers">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <Label htmlFor="companyName" className="text-stone-900 text-sm">Company Name *</Label>
                                        <Input
                                            id="companyName"
                                            placeholder="Figures Accounting Ltd"
                                            value={data.companyName || ""}
                                            onChange={(e) => updateField("companyName", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="companyNumber" className="text-stone-900 text-sm">Company Number *</Label>
                                        <Input
                                            id="companyNumber"
                                            placeholder="Exactly 8 digits"
                                            minLength={8}
                                            maxLength={8}
                                            value={data.registrationNumber || ""}
                                            onChange={(e) => updateField("registrationNumber", e.target.value.replace(/\D/g, ""))}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="utrNumber" className="text-stone-900 text-sm">Business UTR *</Label>
                                        <Input
                                            id="utrNumber"
                                            placeholder="Exactly 10 digits"
                                            minLength={10}
                                            maxLength={10}
                                            value={data.utrNumber || ""}
                                            onChange={(e) => updateField("utrNumber", e.target.value.replace(/\D/g, ""))}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="authCode" className="text-stone-900 text-sm">Auth Code *</Label>
                                        <Input
                                            id="authCode"
                                            placeholder="Exactly 6 characters"
                                            minLength={6}
                                            maxLength={6}
                                            value={data.companyAuthCode || ""}
                                            onChange={(e) => updateField("companyAuthCode", e.target.value.toUpperCase())}
                                        />
                                    </div>
                                </div>
                            </Section>

                            <Section title="Payroll & VAT">
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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

                                    <Expandable show={data.hasPaye === "yes"} contentKey="paye-fields" className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-clay-200">
                                            <div className="space-y-2">
                                                <Label htmlFor="accountsOfficeRef" className="text-stone-900 text-sm">Accounts Office Ref</Label>
                                                <Input
                                                    id="accountsOfficeRef"
                                                    placeholder="123PA01234567"
                                                    minLength={13}
                                                    maxLength={13}
                                                    value={data.accountsOfficeRef || ""}
                                                    onChange={(e) => updateField("accountsOfficeRef", e.target.value.toUpperCase())}
                                                />
                                                <p className="text-xs text-stone-500">13 characters</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="payeRef" className="text-stone-900 text-sm">PAYE Reference</Label>
                                                <Input
                                                    id="payeRef"
                                                    placeholder="123/AB45678"
                                                    minLength={10}
                                                    maxLength={12}
                                                    value={data.payeRef || ""}
                                                    onChange={(e) => updateField("payeRef", e.target.value.toUpperCase())}
                                                />
                                                <p className="text-xs text-stone-500">10-12 characters</p>
                                            </div>
                                    </Expandable>

                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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

                                    <Expandable show={data.isVatRegistered === "yes"} contentKey="vat-fields" className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-clay-200">
                                            <div className="space-y-2">
                                                <Label htmlFor="vatNumber" className="text-stone-900 text-sm">VAT Number</Label>
                                                <Input
                                                    id="vatNumber"
                                                    placeholder="123456789"
                                                    minLength={9}
                                                    maxLength={9}
                                                    value={data.vatNumber || ""}
                                                    onChange={(e) => updateField("vatNumber", e.target.value.replace(/\D/g, ""))}
                                                />
                                                <p className="text-xs text-stone-500">Exactly 9 digits</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="vatRegDate" className="text-stone-900 text-sm">Registration Date</Label>
                                                <Input
                                                    id="vatRegDate"
                                                    type="date"
                                                    value={data.vatRegDate || ""}
                                                    onChange={(e) => updateField("vatRegDate", e.target.value)}
                                                />
                                            </div>
                                    </Expandable>
                                </div>
                            </Section>

                            <Section title="Document Uploads">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <FileUpload
                                        label="Photo ID (Passport/License)"
                                        required
                                        accept="image/*,.pdf"
                                        value={data.photoId}
                                        onChange={(file) => updateField("photoId", file)}
                                    />
                                    <FileUpload
                                        label="Proof of Home Address (<3 months)"
                                        required
                                        accept="image/*,.pdf"
                                        value={data.proofOfAddress}
                                        onChange={(file) => updateField("proofOfAddress", file)}
                                    />
                                </div>
                            </Section>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Section title="Ownership & Roles">
                                <p className="text-sm text-stone-500">Please provide details for everyone with 25%+ ownership.</p>

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
                                                onClick={() => {
                                                    const newDirectors = data.directors.filter((d: any) => d.id !== director.id);
                                                    updateField("directors", newDirectors);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                <DirectorEntryForm
                                    onAdd={(director) => {
                                        updateField("directors", [...(data.directors || []), { ...director, id: Date.now() }]);
                                    }}
                                />

                                <div className="space-y-2 pt-4 border-t border-stone-200">
                                    <Label className="text-stone-900 text-sm">Trading Address (if different from Registered Office)</Label>
                                    <Input
                                        placeholder="Leave blank if same"
                                        value={data.tradingAddress || ""}
                                        onChange={(e) => updateField("tradingAddress", e.target.value)}
                                    />
                                </div>
                            </Section>

                            <Section title="Service Scope *">
                                <p className="text-sm text-stone-500 mb-2">Select at least one service.</p>
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                    {[
                                        "Company Accounts & Corp Tax",
                                        "VAT Preparation & Submission",
                                        "Payroll Preparation & Submission",
                                        "New registration (PAYE/VAT)",
                                        "Other"
                                    ].map((service) => {
                                        const selected = (data.servicesRequired || []).includes(service);
                                        return (
                                            <button
                                                key={service}
                                                type="button"
                                                onClick={() => {
                                                    const current = data.servicesRequired || [];
                                                    const updated = selected
                                                        ? current.filter((s: string) => s !== service)
                                                        : [...current, service];
                                                    updateField("servicesRequired", updated);
                                                }}
                                                className={`flex min-h-12 items-center justify-center rounded-none border px-3 py-2 text-center text-sm font-medium transition ${
                                                    selected
                                                        ? "border-clay-500 bg-clay-50 text-clay-800"
                                                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                                                }`}
                                            >
                                                {service}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Section>

                            <Section title="Business Nature">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="businessNature" className="text-stone-900 text-sm">Nature of Business *</Label>
                                        <Textarea
                                            id="businessNature"
                                            placeholder="Describe daily activities..."
                                            value={data.natureOfBusiness || ""}
                                            onChange={(e) => updateField("natureOfBusiness", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sourceOfFunds" className="text-stone-900 text-sm">Main Source of Funds/Income *</Label>
                                        <Input
                                            id="sourceOfFunds"
                                            placeholder="e.g. Sales, Contracts..."
                                            value={data.sourceOfFunds || ""}
                                            onChange={(e) => updateField("sourceOfFunds", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </Section>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <div className="rounded-none border border-clay-200 bg-clay-50 p-4 mb-2">
                                <h3 className="font-semibold text-clay-600 text-sm mb-1">Final Compliance Checks</h3>
                                <p className="text-xs text-stone-500">Required for Anti-Money Laundering regulations.</p>
                            </div>

                            <Section title="AML Questions">
                                <div className="space-y-4">
                                    {(
                                        [
                                            ["isPep", "Are you (or any owner) a Politically Exposed Person (PEP)?"],
                                            ["hasSanctions", "Do you trade with high-risk/sanctioned jurisdictions?"],
                                            ["hasComplexStructure", "Does the company have complex ownership (holding companies)?"],
                                            ["hasBankruptcy", "Any bankruptcy/disqualification history?"],
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
                                            <Expandable show={field === "hasComplexStructure" && data.hasComplexStructure === "yes"} contentKey="structure-details">
                                                <Textarea
                                                    placeholder="Describe structure..."
                                                    value={data.structureDescription || ""}
                                                    onChange={(e) => updateField("structureDescription", e.target.value)}
                                                />
                                            </Expandable>
                                            <Expandable show={field === "hasBankruptcy" && data.hasBankruptcy === "yes"} contentKey="bankruptcy-details">
                                                <Textarea
                                                    placeholder="Provide details..."
                                                    value={data.bankruptcyDescription || ""}
                                                    onChange={(e) => updateField("bankruptcyDescription", e.target.value)}
                                                />
                                            </Expandable>
                                        </div>
                                    ))}
                                </div>
                            </Section>

                            <div className="flex flex-col gap-3 rounded-none border border-stone-200 bg-stone-50/50 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
                                <Label className="min-w-0 flex-1 font-normal text-sm text-stone-800 leading-snug">
                                    I confirm the information provided is accurate.
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
                <GradientButton
                    type="button"
                    appearance="outline"
                    onClick={step === 1 ? onBack : prevStep}
                    disabled={loading}
                    className="flex-1"
                >
                    <ArrowLeft className="w-4 h-4" /> {step === 1 ? "Back" : "Previous"}
                </GradientButton>

                {step < 3 ? (
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
                        disabled={!data.confirmed || loading}
                        loading={loading}
                        className="flex-1"
                        variant="emerald"
                    >
                        Submit Application <ArrowRight className="h-4 w-4" />
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
            <h4 className="font-medium text-sm text-stone-600">Add New Director/Partner</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-stone-900 text-sm">First Name</Label>
                    <Input
                        value={director.firstName}
                        onChange={(e) => setDirector(d => ({ ...d, firstName: e.target.value }))}
                        placeholder="John"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-stone-900 text-sm">Last Name</Label>
                    <Input
                        value={director.lastName}
                        onChange={(e) => setDirector(d => ({ ...d, lastName: e.target.value }))}
                        placeholder="Doe"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-stone-900 text-sm">Role</Label>
                    <Input
                        value={director.role}
                        onChange={(e) => setDirector(d => ({ ...d, role: e.target.value }))}
                        placeholder="Director / Shareholder"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-stone-900 text-sm">Date of Birth</Label>
                    <Input
                        type="date"
                        value={director.dob}
                        onChange={(e) => setDirector(d => ({ ...d, dob: e.target.value }))}
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label className="text-stone-900 text-sm">Home Address</Label>
                    <Textarea
                        value={director.address}
                        onChange={(e) => setDirector(d => ({ ...d, address: e.target.value }))}
                        placeholder="123 Street Name, City, Postcode..."
                        className="min-h-[80px]"
                    />
                </div>
            </div>
            <Button
                onClick={handleAdd}
                disabled={!director.firstName || !director.lastName || !director.role}
                className="w-full border-clay-200 bg-clay-50 text-clay-800 hover:bg-clay-100 hover:text-clay-900"
                variant="outline"
            >
                <Plus className="w-4 h-4 mr-2" /> Save & Add Director
            </Button>
        </div>
    );
}
