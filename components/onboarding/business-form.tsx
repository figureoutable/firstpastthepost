"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function BusinessForm({ data, updateData, onBack, onSubmit, loading }: any) {
    const [step, setStep] = useState(1);

    // Helper to update specific fields
    const updateField = (field: string, value: any) => {
        updateData({ ...data, [field]: value });
    };

    // Step validation (basic)
    const canIsNext = () => {
        if (step === 1) {
            // Check basics. Note: allowing fuzzy validation for now to ease testing, but 'required' fields should be populated.
            // Strict: return data.companyName && data.registrationNumber && data.utrNumber && data.companyAuthCode && data.photoId && data.proofOfAddress;
            return data.companyName && data.registrationNumber; // MVP validation for demo
        }
        if (step === 2) {
            // MVP validation
            return true;
        }
        return true;
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    // Calculate progress: Step 1 = 33%, Step 2 = 66%, Step 3 = 100%
    const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

    return (
        <div className="space-y-6">
            {/* Progress Bar - Content Width */}
            {/* Progress Bar - Content Width */}
            {/* Progress Bar - Content Width */}
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
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                >
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">1. Tax & Corporate Identifiers</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="companyName">Company Name *</Label>
                                        <Input
                                            id="companyName"
                                            placeholder="Figures Accounting Ltd"
                                            value={data.companyName || ""}
                                            onChange={(e) => updateField("companyName", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="companyNumber">Company Number *</Label>
                                        <Input
                                            id="companyNumber"
                                            placeholder="12345678"
                                            maxLength={8}
                                            value={data.registrationNumber || ""}
                                            onChange={(e) => updateField("registrationNumber", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="utrNumber">Business UTR *</Label>
                                        <Input
                                            id="utrNumber"
                                            placeholder="10-digit UTR"
                                            maxLength={10}
                                            value={data.utrNumber || ""}
                                            onChange={(e) => updateField("utrNumber", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="authCode">Auth Code *</Label>
                                        <Input
                                            id="authCode"
                                            placeholder="6-char code"
                                            maxLength={6}
                                            value={data.companyAuthCode || ""}
                                            onChange={(e) => updateField("companyAuthCode", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">2. Payroll & VAT</h3>
                                <div className="space-y-4">
                                    <div className="space-y-6">
                                        <Label>Do you have an existing PAYE scheme?</Label>
                                        <RadioGroup
                                            value={data.hasPaye || "no"}
                                            onValueChange={(val) => updateField("hasPaye", val)}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="yes" id="paye-yes" />
                                                <Label htmlFor="paye-yes">Yes</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="no" id="paye-no" />
                                                <Label htmlFor="paye-no">No</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {data.hasPaye === "yes" && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                                            <div className="space-y-2">
                                                <Label htmlFor="accountsOfficeRef">Accounts Office Ref</Label>
                                                <Input
                                                    id="accountsOfficeRef"
                                                    placeholder="123PA01234567"
                                                    value={data.accountsOfficeRef || ""}
                                                    onChange={(e) => updateField("accountsOfficeRef", e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="payeRef">PAYE Reference</Label>
                                                <Input
                                                    id="payeRef"
                                                    placeholder="123/AB45678"
                                                    value={data.payeRef || ""}
                                                    onChange={(e) => updateField("payeRef", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        <Label>Are you VAT Registered?</Label>
                                        <RadioGroup
                                            value={data.isVatRegistered || "no"}
                                            onValueChange={(val) => updateField("isVatRegistered", val)}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="yes" id="vat-yes" />
                                                <Label htmlFor="vat-yes">Yes</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="no" id="vat-no" />
                                                <Label htmlFor="vat-no">No</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {data.isVatRegistered === "yes" && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                                            <div className="space-y-2">
                                                <Label htmlFor="vatNumber">VAT Number</Label>
                                                <Input
                                                    id="vatNumber"
                                                    placeholder="9 digits"
                                                    maxLength={9}
                                                    value={data.vatNumber || ""}
                                                    onChange={(e) => updateField("vatNumber", e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="vatRegDate">Registration Date</Label>
                                                <Input
                                                    id="vatRegDate"
                                                    type="date"
                                                    value={data.vatRegDate || ""}
                                                    onChange={(e) => updateField("vatRegDate", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">3. Document Uploads</h3>
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
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">1. Ownership & Roles</h3>
                                <p className="text-sm text-muted-foreground mb-4">Please provide details for everyone with 25%+ ownership.</p>

                                {/* List of Added Directors */}
                                <div className="space-y-3 mb-6">
                                    {(data.directors || []).map((director: any, index: number) => (
                                        <div key={director.id} className="p-4 rounded-xl border border-border/50 bg-secondary/10 flex justify-between items-start animate-in fade-in slide-in-from-bottom-2">
                                            <div>
                                                <p className="font-semibold">{director.firstName} {director.lastName}</p>
                                                <p className="text-sm text-muted-foreground">{director.role}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
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

                                {/* Add Director Form */}
                                <DirectorEntryForm
                                    onAdd={(director) => {
                                        updateField("directors", [...(data.directors || []), { ...director, id: Date.now() }]);
                                    }}
                                />

                                <div className="space-y-2 pt-4 border-t border-border/50 mt-6">
                                    <Label>Trading Address (if different from Registered Office)</Label>
                                    <Input
                                        placeholder="Leave blank if same"
                                        value={data.tradingAddress || ""}
                                        onChange={(e) => updateField("tradingAddress", e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">2. Service Scope</h3>
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
                                            <Label htmlFor={service} className="text-sm font-normal">{service}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">3. Business Nature</h3>
                                <div className="space-y-6">
                                    <Label htmlFor="businessNature">Nature of Business *</Label>
                                    <Textarea
                                        id="businessNature"
                                        placeholder="Describe daily activities..."
                                        value={data.natureOfBusiness || ""}
                                        onChange={(e) => updateField("natureOfBusiness", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-6">
                                    <Label htmlFor="sourceOfFunds">Main Source of Funds/Income *</Label>
                                    <Input
                                        id="sourceOfFunds"
                                        placeholder="e.g. Sales, Contracts..."
                                        value={data.sourceOfFunds || ""}
                                        onChange={(e) => updateField("sourceOfFunds", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 mb-6">
                                <h3 className="font-semibold text-primary mb-2">Final Compliance Checks</h3>
                                <p className="text-sm text-muted-foreground">Required for Anti-Money Laundering regulations.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-6">
                                    <Label>Are you (or any owner) a Politically Exposed Person (PEP)?</Label>
                                    <RadioGroup
                                        value={data.isPep || "no"}
                                        onValueChange={(val) => updateField("isPep", val)}
                                        className="flex gap-6"
                                    >
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="pep-yes" /><Label htmlFor="pep-yes">Yes</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="pep-no" /><Label htmlFor="pep-no">No</Label></div>
                                    </RadioGroup>
                                </div>

                                <div className="space-y-6">
                                    <Label>Do you trade with high-risk/sanctioned jurisdictions?</Label>
                                    <RadioGroup
                                        value={data.hasSanctions || "no"}
                                        onValueChange={(val) => updateField("hasSanctions", val)}
                                        className="flex gap-6"
                                    >
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="sanctions-yes" /><Label htmlFor="sanctions-yes">Yes</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="sanctions-no" /><Label htmlFor="sanctions-no">No</Label></div>
                                    </RadioGroup>
                                </div>

                                <div className="space-y-6">
                                    <Label>Does the company have complex ownership (holding companies)?</Label>
                                    <RadioGroup
                                        value={data.hasComplexStructure || "no"}
                                        onValueChange={(val) => updateField("hasComplexStructure", val)}
                                        className="flex gap-6"
                                    >
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="complex-yes" /><Label htmlFor="complex-yes">Yes</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="complex-no" /><Label htmlFor="complex-no">No</Label></div>
                                    </RadioGroup>
                                    {data.hasComplexStructure === "yes" && (
                                        <Textarea
                                            placeholder="Describe structure..."
                                            value={data.structureDescription || ""}
                                            onChange={(e) => updateField("structureDescription", e.target.value)}
                                        />
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <Label>Any bankruptcy/disqualification history?</Label>
                                    <RadioGroup
                                        value={data.hasBankruptcy || "no"}
                                        onValueChange={(val) => updateField("hasBankruptcy", val)}
                                        className="flex gap-6"
                                    >
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="bankrupt-yes" /><Label htmlFor="bankrupt-yes">Yes</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="bankrupt-no" /><Label htmlFor="bankrupt-no">No</Label></div>
                                    </RadioGroup>
                                    {data.hasBankruptcy === "yes" && (
                                        <Textarea
                                            placeholder="Provide details..."
                                            value={data.bankruptcyDescription || ""}
                                            onChange={(e) => updateField("bankruptcyDescription", e.target.value)}
                                        />
                                    )}
                                </div>

                                <div className="pt-10 pb-4 border-t border-border/50">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="confirm"
                                            checked={data.confirmed}
                                            onCheckedChange={(checked) => updateField("confirmed", checked)}
                                        />
                                        <Label htmlFor="confirm" className="text-sm font-normal leading-none cursor-pointer">
                                            I confirm the information provided is accurate.
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            <div className="flex gap-4 pt-4 border-t border-border/50">
                <Button variant="outline" onClick={step === 1 ? onBack : prevStep} disabled={loading} className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" /> {step === 1 ? "Back" : "Previous"}
                </Button>

                {step < 3 ? (
                    <Button onClick={nextStep} disabled={!canIsNext()} className="w-full">
                        Next <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                ) : (
                    <Button onClick={() => onSubmit(data)} disabled={!data.confirmed || loading} className="w-full bg-green-600 hover:bg-green-700">
                        {loading ? "Submitting..." : "Submit Application"}
                    </Button>
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
        <div className="p-4 rounded-xl border border-border/50 bg-secondary/5 space-y-4">
            <h4 className="font-medium text-sm">Add New Director/Partner</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                        value={director.firstName}
                        onChange={(e) => setDirector(d => ({ ...d, firstName: e.target.value }))}
                        placeholder="John"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                        value={director.lastName}
                        onChange={(e) => setDirector(d => ({ ...d, lastName: e.target.value }))}
                        placeholder="Doe"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Role</Label>
                    <Input
                        value={director.role}
                        onChange={(e) => setDirector(d => ({ ...d, role: e.target.value }))}
                        placeholder="Director / Shareholder"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input
                        type="date"
                        value={director.dob}
                        onChange={(e) => setDirector(d => ({ ...d, dob: e.target.value }))}
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label>Home Address</Label>
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
                className="w-full"
                variant="secondary"
            >
                <Plus className="w-4 h-4 mr-2" /> Save & Add Director
            </Button>
        </div>
    );
}
