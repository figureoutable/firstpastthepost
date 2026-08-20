"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { ArrowLeft, ArrowRight, Plus, Trash2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GradientButton from "@/components/kokonutui/gradient-button";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-6 space-y-4">
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
                        i < current ? "bg-forest-500" : i === current ? "bg-forest-300" : "bg-stone-200"
                    }`} />
                </div>
            ))}
            <span className="text-[11px] text-stone-400 ml-1 tabular-nums whitespace-nowrap">
                {current + 1}/{total}
            </span>
        </div>
    );
}

export function BusinessForm({ data, updateData, onBack, onSubmit, loading }: any) {
    const [step, setStep] = useState(1);

    const updateField = (field: string, value: any) => {
        updateData({ ...data, [field]: value });
    };

    const canGoNext = () => {
        if (step === 1) {
            return data.companyName
                && (data.registrationNumber || "").length === 8
                && (data.utrNumber || "").length === 10
                && (data.companyAuthCode || "").length === 6
                && (data.hasPaye === "yes" || data.hasPaye === "no")
                && (data.isVatRegistered === "yes" || data.isVatRegistered === "no")
                && data.photoId
                && data.proofOfAddress;
        }
        if (step === 2) {
            return (data.servicesRequired || []).length >= 1;
        }
        return true;
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

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
                                    <div className="space-y-2">
                                        <Label htmlFor="companyName" className="text-stone-900 text-sm">Company Name *</Label>
                                        <Input
                                            id="companyName"
                                            placeholder="Figures Accounting Ltd"
                                            value={data.companyName || ""}
                                            onChange={(e) => updateField("companyName", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="companyNumber" className="text-stone-900 text-sm">Company Number *</Label>
                                        <Input
                                            id="companyNumber"
                                            placeholder="12345678"
                                            minLength={8}
                                            maxLength={8}
                                            value={data.registrationNumber || ""}
                                            onChange={(e) => updateField("registrationNumber", e.target.value.replace(/\D/g, ""))}
                                        />
                                        <p className="text-xs text-stone-500">Exactly 8 digits</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="utrNumber" className="text-stone-900 text-sm">Business UTR *</Label>
                                        <Input
                                            id="utrNumber"
                                            placeholder="1234567890"
                                            minLength={10}
                                            maxLength={10}
                                            value={data.utrNumber || ""}
                                            onChange={(e) => updateField("utrNumber", e.target.value.replace(/\D/g, ""))}
                                        />
                                        <p className="text-xs text-stone-500">Exactly 10 digits</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="authCode" className="text-stone-900 text-sm">Auth Code *</Label>
                                        <Input
                                            id="authCode"
                                            placeholder="ABC123"
                                            minLength={6}
                                            maxLength={6}
                                            value={data.companyAuthCode || ""}
                                            onChange={(e) => updateField("companyAuthCode", e.target.value.toUpperCase())}
                                        />
                                        <p className="text-xs text-stone-500">Exactly 6 characters</p>
                                    </div>
                                </div>
                            </Section>

                            <Section title="Payroll & VAT">
                                <div className="space-y-5">
                                    <div className="space-y-3">
                                        <Label className="text-stone-900 text-sm">Do you have an existing PAYE scheme? *</Label>
                                        <RadioGroup
                                            value={data.hasPaye ?? ""}
                                            onValueChange={(val) => updateField("hasPaye", val)}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="yes" id="paye-yes" />
                                                <Label htmlFor="paye-yes" className="text-sm">Yes</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="no" id="paye-no" />
                                                <Label htmlFor="paye-no" className="text-sm">No</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {data.hasPaye === "yes" && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-forest-200"
                                        >
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
                                                <p className="text-xs text-stone-500">10–12 characters</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="space-y-3">
                                        <Label className="text-stone-900 text-sm">Are you VAT Registered? *</Label>
                                        <RadioGroup
                                            value={data.isVatRegistered ?? ""}
                                            onValueChange={(val) => updateField("isVatRegistered", val)}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="yes" id="vat-yes" />
                                                <Label htmlFor="vat-yes" className="text-sm">Yes</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="no" id="vat-no" />
                                                <Label htmlFor="vat-no" className="text-sm">No</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {data.isVatRegistered === "yes" && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-forest-200"
                                        >
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
                                        </motion.div>
                                    )}
                                </div>
                            </Section>

                            <Section title="Document Uploads">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        <div key={director.id} className="p-4 rounded-lg border border-stone-200 bg-stone-50/50 flex justify-between items-start">
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        "Company Accounts & Corp Tax",
                                        "VAT Preparation & Submission",
                                        "Payroll Preparation & Submission",
                                        "New registration (PAYE/VAT)",
                                        "Other"
                                    ].map((service) => (
                                        <div key={service} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={service}
                                                checked={(data.servicesRequired || []).includes(service)}
                                                onCheckedChange={(checked) => {
                                                    const current = data.servicesRequired || [];
                                                    const updated = checked
                                                        ? [...current, service]
                                                        : current.filter((s: string) => s !== service);
                                                    updateField("servicesRequired", updated);
                                                }}
                                            />
                                            <Label htmlFor={service} className="text-sm font-normal text-stone-700 cursor-pointer">{service}</Label>
                                        </div>
                                    ))}
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
                            <div className="rounded-xl border border-forest-200 bg-forest-50 p-4 mb-2">
                                <h3 className="font-semibold text-forest-600 text-sm mb-1">Final Compliance Checks</h3>
                                <p className="text-xs text-stone-500">Required for Anti-Money Laundering regulations.</p>
                            </div>

                            <Section title="AML Questions">
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-stone-900 text-sm">Are you (or any owner) a Politically Exposed Person (PEP)?</Label>
                                        <RadioGroup value={data.isPep || "no"} onValueChange={(val) => updateField("isPep", val)} className="flex gap-6">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="pep-yes" /><Label htmlFor="pep-yes" className="text-sm">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="pep-no" /><Label htmlFor="pep-no" className="text-sm">No</Label></div>
                                        </RadioGroup>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-stone-900 text-sm">Do you trade with high-risk/sanctioned jurisdictions?</Label>
                                        <RadioGroup value={data.hasSanctions || "no"} onValueChange={(val) => updateField("hasSanctions", val)} className="flex gap-6">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="sanctions-yes" /><Label htmlFor="sanctions-yes" className="text-sm">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="sanctions-no" /><Label htmlFor="sanctions-no" className="text-sm">No</Label></div>
                                        </RadioGroup>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-stone-900 text-sm">Does the company have complex ownership (holding companies)?</Label>
                                        <RadioGroup value={data.hasComplexStructure || "no"} onValueChange={(val) => updateField("hasComplexStructure", val)} className="flex gap-6">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="complex-yes" /><Label htmlFor="complex-yes" className="text-sm">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="complex-no" /><Label htmlFor="complex-no" className="text-sm">No</Label></div>
                                        </RadioGroup>
                                        {data.hasComplexStructure === "yes" && (
                                            <Textarea
                                                placeholder="Describe structure..."
                                                value={data.structureDescription || ""}
                                                onChange={(e) => updateField("structureDescription", e.target.value)}
                                            />
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-stone-900 text-sm">Any bankruptcy/disqualification history?</Label>
                                        <RadioGroup value={data.hasBankruptcy || "no"} onValueChange={(val) => updateField("hasBankruptcy", val)} className="flex gap-6">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="bankrupt-yes" /><Label htmlFor="bankrupt-yes" className="text-sm">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="bankrupt-no" /><Label htmlFor="bankrupt-no" className="text-sm">No</Label></div>
                                        </RadioGroup>
                                        {data.hasBankruptcy === "yes" && (
                                            <Textarea
                                                placeholder="Provide details..."
                                                value={data.bankruptcyDescription || ""}
                                                onChange={(e) => updateField("bankruptcyDescription", e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </Section>

                            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-5">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="confirm"
                                        checked={data.confirmed}
                                        onCheckedChange={(checked) => updateField("confirmed", checked)}
                                    />
                                    <Label htmlFor="confirm" className="text-sm font-normal text-stone-700 leading-tight cursor-pointer">
                                        I confirm the information provided is accurate.
                                    </Label>
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
                        className="flex-1"
                        variant="emerald"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Application"}
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
        <div className="p-4 rounded-lg border border-stone-200 bg-stone-50/30 space-y-4">
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
                className="w-full border-stone-300 bg-card text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                variant="outline"
            >
                <Plus className="w-4 h-4 mr-2" /> Save & Add Director
            </Button>
        </div>
    );
}
