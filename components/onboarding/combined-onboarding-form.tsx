"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { ArrowLeft, ArrowRight, Plus, Trash2, Loader2 } from "lucide-react";
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

export function CombinedOnboardingForm({ data, updateData, onBack, onSubmit, loading }: any) {
    const [step, setStep] = useState(1);

    const updateField = (field: string, value: any) => {
        updateData({ ...data, [field]: value });
    };

    const nextStep = () => setStep(s => Math.min(s + 1, 6));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const canGoNext = () => {
        if (step === 2) {
            return data.natureOfBusiness
                && data.sourceOfFunds
                && (data.hasPaye === "yes" || data.hasPaye === "no")
                && (data.isVatRegistered === "yes" || data.isVatRegistered === "no");
        }
        if (step === 5) {
            return !!(data.photoId && data.proofOfAddress);
        }
        return true;
    };

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
                                        <Label className="text-zinc-900 text-sm">Full Name * (As shown on passport)</Label>
                                        <Input
                                            value={data.fullNamePassport || ""}
                                            onChange={(e) => updateField("fullNamePassport", e.target.value)}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-900 text-sm">Personal UTR *</Label>
                                        <Input
                                            value={data.personalUtr || ""}
                                            onChange={(e) => updateField("personalUtr", e.target.value)}
                                            placeholder="10-digit UTR"
                                            maxLength={10}
                                        />
                                    </div>
                                </div>
                            </Section>

                            <Section title="Business Information">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-900 text-sm">Company Name *</Label>
                                        <Input
                                            value={data.companyName || ""}
                                            onChange={(e) => updateField("companyName", e.target.value)}
                                            placeholder="Figures Ltd"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-900 text-sm">Company Number *</Label>
                                        <Input
                                            value={data.registrationNumber || ""}
                                            onChange={(e) => updateField("registrationNumber", e.target.value)}
                                            placeholder="12345678"
                                            maxLength={8}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-900 text-sm">Business UTR *</Label>
                                        <Input
                                            value={data.businessUtr || ""}
                                            onChange={(e) => updateField("businessUtr", e.target.value)}
                                            placeholder="10-digit UTR"
                                            maxLength={10}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-900 text-sm">Company Auth Code *</Label>
                                        <Input
                                            value={data.companyAuthCode || ""}
                                            onChange={(e) => updateField("companyAuthCode", e.target.value)}
                                            placeholder="6-char code"
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
                                    <Label htmlFor="businessNature" className="text-zinc-900 text-sm">Nature of Business *</Label>
                                    <Textarea
                                        id="businessNature"
                                        placeholder="Daily activities, services provided..."
                                        value={data.natureOfBusiness || ""}
                                        onChange={(e) => updateField("natureOfBusiness", e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sourceOfFunds" className="text-zinc-900 text-sm">Main Source of Funds/Income *</Label>
                                    <Input
                                        id="sourceOfFunds"
                                        placeholder="e.g. B2B Sales, Monthly Contracts"
                                        value={data.sourceOfFunds || ""}
                                        onChange={(e) => updateField("sourceOfFunds", e.target.value)}
                                    />
                                </div>

                                <div className="space-y-3 pt-4 border-t border-zinc-200">
                                    <Label className="text-zinc-900 text-sm">Do you have an existing PAYE scheme? *</Label>
                                    <RadioGroup value={data.hasPaye ?? ""} onValueChange={(val) => updateField("hasPaye", val)} className="flex gap-6">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="paye-yes" /><Label htmlFor="paye-yes" className="text-sm">Yes</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="paye-no" /><Label htmlFor="paye-no" className="text-sm">No</Label></div>
                                    </RadioGroup>
                                </div>
                                {data.hasPaye === "yes" && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-purple-200">
                                        <div className="space-y-2"><Label className="text-zinc-900 text-sm">Accounts Office Ref</Label><Input value={data.accountsOfficeRef || ""} onChange={(e) => updateField("accountsOfficeRef", e.target.value)} /></div>
                                        <div className="space-y-2"><Label className="text-zinc-900 text-sm">PAYE Reference</Label><Input value={data.payeRef || ""} onChange={(e) => updateField("payeRef", e.target.value)} /></div>
                                    </motion.div>
                                )}

                                <div className="space-y-3 pt-4">
                                    <Label className="text-zinc-900 text-sm">Are you VAT Registered? *</Label>
                                    <RadioGroup value={data.isVatRegistered ?? ""} onValueChange={(val) => updateField("isVatRegistered", val)} className="flex gap-6">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="vat-yes" /><Label htmlFor="vat-yes" className="text-sm">Yes</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="vat-no" /><Label htmlFor="vat-no" className="text-sm">No</Label></div>
                                    </RadioGroup>
                                </div>
                                {data.isVatRegistered === "yes" && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-purple-200">
                                        <div className="space-y-2"><Label className="text-zinc-900 text-sm">VAT Number</Label><Input maxLength={9} value={data.vatNumber || ""} onChange={(e) => updateField("vatNumber", e.target.value)} /></div>
                                        <div className="space-y-2"><Label className="text-zinc-900 text-sm">Registration Date</Label><Input type="date" value={data.vatRegDate || ""} onChange={(e) => updateField("vatRegDate", e.target.value)} /></div>
                                    </motion.div>
                                )}
                            </div>
                        </Section>
                    )}

                    {step === 3 && (
                        <Section title="Self Assessment Information">
                            <div className="space-y-4">
                                <Label className="text-zinc-900 text-sm">Select Personal Income Types *</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {["Employment (PAYE)", "Self-employment", "Rental Income", "Dividends", "Foreign Income", "Other"].map((type) => (
                                        <div key={type} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={type}
                                                checked={(data.incomeTypes || []).includes(type)}
                                                onCheckedChange={(checked) => {
                                                    const current = data.incomeTypes || [];
                                                    const updated = checked ? [...current, type] : current.filter((t: string) => t !== type);
                                                    updateField("incomeTypes", updated);
                                                }}
                                            />
                                            <Label htmlFor={type} className="text-sm font-normal text-zinc-700 cursor-pointer">{type}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Section>
                    )}

                    {step === 4 && (
                        <Section title="Ownership & Roles">
                            <p className="text-sm text-zinc-500">Add details for all directors or significant shareholders (25%+).</p>

                            <div className="space-y-3">
                                {(data.directors || []).map((director: any) => (
                                    <div key={director.id} className="p-4 rounded-lg border border-zinc-200 bg-zinc-50/50 flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-zinc-900">{director.firstName} {director.lastName}</p>
                                            <p className="text-sm text-zinc-500">{director.role}</p>
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

                            <div className="space-y-2 pt-4 border-t border-zinc-200">
                                <Label className="text-zinc-900 text-sm">Trading Address (if different from Registration)</Label>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FileUpload
                                    label="Photo ID *"
                                    desc="Passport or Driving License"
                                    required
                                    value={data.photoId}
                                    onChange={(file) => updateField("photoId", file)}
                                />
                                <FileUpload
                                    label="Proof of Address *"
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
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-zinc-900 text-sm">Are you (or any owner) a Politically Exposed Person (PEP)? *</Label>
                                        <RadioGroup value={data.isPep || "no"} onValueChange={(val) => updateField("isPep", val)} className="flex gap-6">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="pep-yes" /><Label htmlFor="pep-yes" className="text-sm">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="pep-no" /><Label htmlFor="pep-no" className="text-sm">No</Label></div>
                                        </RadioGroup>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-zinc-900 text-sm">Links to high-risk or sanctioned jurisdictions? *</Label>
                                        <RadioGroup value={data.hasSanctions || "no"} onValueChange={(val) => updateField("hasSanctions", val)} className="flex gap-6">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="sanct-yes" /><Label htmlFor="sanct-yes" className="text-sm">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="sanct-no" /><Label htmlFor="sanct-no" className="text-sm">No</Label></div>
                                        </RadioGroup>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-zinc-900 text-sm">Any bankruptcy or disqualification history? *</Label>
                                        <RadioGroup value={data.hasBankruptcy || "no"} onValueChange={(val) => updateField("hasBankruptcy", val)} className="flex gap-6">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="bank-yes" /><Label htmlFor="bank-yes" className="text-sm">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="bank-no" /><Label htmlFor="bank-no" className="text-sm">No</Label></div>
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

                            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="confirm"
                                        checked={data.confirmed}
                                        onCheckedChange={(c) => updateField("confirmed", !!c)}
                                    />
                                    <Label htmlFor="confirm" className="text-sm font-normal text-zinc-700 cursor-pointer leading-tight">
                                        I confirm that all information provided for both Business and Self Assessment services is accurate.
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
        <div className="p-4 rounded-lg border border-zinc-200 bg-zinc-50/30 space-y-4">
            <h4 className="font-medium text-sm text-zinc-600">Add New Director/Shareholder</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-zinc-900 text-sm">First Name</Label>
                    <Input value={director.firstName} onChange={(e) => setDirector({ ...director, firstName: e.target.value })} placeholder="John" />
                </div>
                <div className="space-y-2">
                    <Label className="text-zinc-900 text-sm">Last Name</Label>
                    <Input value={director.lastName} onChange={(e) => setDirector({ ...director, lastName: e.target.value })} placeholder="Doe" />
                </div>
                <div className="space-y-2">
                    <Label className="text-zinc-900 text-sm">Role</Label>
                    <Input value={director.role} onChange={(e) => setDirector({ ...director, role: e.target.value })} placeholder="Director" />
                </div>
                <div className="space-y-2">
                    <Label className="text-zinc-900 text-sm">Date of Birth</Label>
                    <Input type="date" value={director.dob} onChange={(e) => setDirector({ ...director, dob: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label className="text-zinc-900 text-sm">Home Address</Label>
                    <Textarea value={director.address} onChange={(e) => setDirector({ ...director, address: e.target.value })} placeholder="Address..." className="min-h-[60px]" />
                </div>
            </div>
            <Button
                onClick={handleAdd}
                disabled={!director.firstName || !director.lastName || !director.role}
                className="w-full border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                variant="outline"
            >
                <Plus className="w-4 h-4 mr-2" /> Add Person
            </Button>
        </div>
    );
}
