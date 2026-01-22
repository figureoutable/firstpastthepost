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
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Plus, Trash2, Loader2 } from "lucide-react";
import { Tilt } from "@/components/ui/tilt";

export function CombinedOnboardingForm({ data, updateData, onBack, onSubmit, loading }: any) {
    const [step, setStep] = useState(1);

    const updateField = (field: string, value: any) => {
        updateData({ ...data, [field]: value });
    };

    const nextStep = () => setStep(s => Math.min(s + 1, 6));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const progress = Math.round((step / 6) * 100);

    return (
        <div className="space-y-6">
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
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                >
                    {step === 1 && (
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">1. Personal Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Full Name * (As shown on passport)</Label>
                                        <Input
                                            value={data.fullNamePassport || ""}
                                            onChange={(e) => updateField("fullNamePassport", e.target.value)}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Personal UTR *</Label>
                                        <Input
                                            value={data.personalUtr || ""}
                                            onChange={(e) => updateField("personalUtr", e.target.value)}
                                            placeholder="10-digit UTR"
                                            maxLength={10}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">2. Business Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Company Name *</Label>
                                        <Input
                                            value={data.companyName || ""}
                                            onChange={(e) => updateField("companyName", e.target.value)}
                                            placeholder="Figures Ltd"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Company Number *</Label>
                                        <Input
                                            value={data.registrationNumber || ""}
                                            onChange={(e) => updateField("registrationNumber", e.target.value)}
                                            placeholder="12345678"
                                            maxLength={8}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Business UTR *</Label>
                                        <Input
                                            value={data.businessUtr || ""}
                                            onChange={(e) => updateField("businessUtr", e.target.value)}
                                            placeholder="10-digit UTR"
                                            maxLength={10}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Company Auth Code *</Label>
                                        <Input
                                            value={data.companyAuthCode || ""}
                                            onChange={(e) => updateField("companyAuthCode", e.target.value)}
                                            placeholder="6-char code"
                                            maxLength={6}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">3. Business Operations</h3>
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <Label htmlFor="businessNature">Nature of Business *</Label>
                                        <Textarea
                                            id="businessNature"
                                            placeholder="Daily activities, services provided..."
                                            value={data.natureOfBusiness || ""}
                                            onChange={(e) => updateField("natureOfBusiness", e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <Label htmlFor="sourceOfFunds">Main Source of Funds/Income *</Label>
                                        <Input
                                            id="sourceOfFunds"
                                            placeholder="e.g. B2B Sales, Monthly Contracts"
                                            value={data.sourceOfFunds || ""}
                                            onChange={(e) => updateField("sourceOfFunds", e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-border/50">
                                        <Label>Do you have an existing PAYE scheme?</Label>
                                        <RadioGroup
                                            value={data.hasPaye || "no"}
                                            onValueChange={(val) => updateField("hasPaye", val)}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="paye-yes" /><Label htmlFor="paye-yes">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="paye-no" /><Label htmlFor="paye-no">No</Label></div>
                                        </RadioGroup>
                                    </div>
                                    {data.hasPaye === "yes" && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20 animate-in fade-in slide-in-from-left-2">
                                            <div className="space-y-2"><Label>Accounts Office Ref</Label><Input value={data.accountsOfficeRef || ""} onChange={(e) => updateField("accountsOfficeRef", e.target.value)} /></div>
                                            <div className="space-y-2"><Label>PAYE Reference</Label><Input value={data.payeRef || ""} onChange={(e) => updateField("payeRef", e.target.value)} /></div>
                                        </div>
                                    )}

                                    <div className="space-y-4 pt-4">
                                        <Label>Are you VAT Registered?</Label>
                                        <RadioGroup
                                            value={data.isVatRegistered || "no"}
                                            onValueChange={(val) => updateField("isVatRegistered", val)}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="vat-yes" /><Label htmlFor="vat-yes">Yes</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="vat-no" /><Label htmlFor="vat-no">No</Label></div>
                                        </RadioGroup>
                                    </div>
                                    {data.isVatRegistered === "yes" && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20 animate-in fade-in slide-in-from-left-2">
                                            <div className="space-y-2"><Label>VAT Number</Label><Input maxLength={9} value={data.vatNumber || ""} onChange={(e) => updateField("vatNumber", e.target.value)} /></div>
                                            <div className="space-y-2"><Label>Registration Date</Label><Input type="date" value={data.vatRegDate || ""} onChange={(e) => updateField("vatRegDate", e.target.value)} /></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">4. Self Assessment Information</h3>
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <Label>Select Personal Income Types *</Label>
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
                                                    <Label htmlFor={type} className="text-sm font-normal cursor-pointer">{type}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">5. Ownership & Roles</h3>
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">Add details for all directors or significant shareholders (25%+).</p>

                                    <div className="space-y-3">
                                        {(data.directors || []).map((director: any) => (
                                            <div key={director.id} className="p-4 rounded-xl border border-border/50 bg-secondary/10 flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold">{director.firstName} {director.lastName}</p>
                                                    <p className="text-sm text-muted-foreground">{director.role}</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
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

                                    <div className="space-y-2 pt-4">
                                        <Label>Trading Address (if different from Registration)</Label>
                                        <Textarea
                                            value={data.tradingAddress || ""}
                                            onChange={(e) => updateField("tradingAddress", e.target.value)}
                                            placeholder="123 Street, City..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">6. Essential Document Uploads</h3>
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
                            </div>
                        </div>
                    )}

                    {step === 6 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">7. Compliance Checks & Confirmation</h3>
                                <div className="space-y-8 pt-4">
                                    <div className="space-y-4">
                                        <Label>Are you (or any owner) a Politically Exposed Person (PEP)? *</Label>
                                        <RadioGroup
                                            value={data.isPep || "no"}
                                            onValueChange={(val) => updateField("isPep", val)}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2 text-sm"><RadioGroupItem value="yes" id="pep-yes" /><Label htmlFor="pep-yes">Yes</Label></div>
                                            <div className="flex items-center space-x-2 text-sm"><RadioGroupItem value="no" id="pep-no" /><Label htmlFor="pep-no">No</Label></div>
                                        </RadioGroup>
                                    </div>

                                    <div className="space-y-4">
                                        <Label>Links to high-risk or sanctioned jurisdictions? *</Label>
                                        <RadioGroup
                                            value={data.hasSanctions || "no"}
                                            onValueChange={(val) => updateField("hasSanctions", val)}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2 text-sm"><RadioGroupItem value="yes" id="sanct-yes" /><Label htmlFor="sanct-yes">Yes</Label></div>
                                            <div className="flex items-center space-x-2 text-sm"><RadioGroupItem value="no" id="sanct-no" /><Label htmlFor="sanct-no">No</Label></div>
                                        </RadioGroup>
                                    </div>

                                    <div className="space-y-4">
                                        <Label>Any bankruptcy or disqualification history? *</Label>
                                        <RadioGroup
                                            value={data.hasBankruptcy || "no"}
                                            onValueChange={(val) => updateField("hasBankruptcy", val)}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2 text-sm"><RadioGroupItem value="yes" id="bank-yes" /><Label htmlFor="bank-yes">Yes</Label></div>
                                            <div className="flex items-center space-x-2 text-sm"><RadioGroupItem value="no" id="bank-no" /><Label htmlFor="bank-no">No</Label></div>
                                        </RadioGroup>
                                        {data.hasBankruptcy === "yes" && (
                                            <Textarea
                                                placeholder="Provide details..."
                                                value={data.bankruptcyDescription || ""}
                                                onChange={(e) => updateField("bankruptcyDescription", e.target.value)}
                                                className="animate-in fade-in slide-in-from-top-1"
                                            />
                                        )}
                                    </div>

                                    <div className="pt-6 border-t border-border/50">
                                        <div className="flex items-center space-x-3">
                                            <Checkbox
                                                id="confirm"
                                                checked={data.confirmed}
                                                onCheckedChange={(c) => updateField("confirmed", !!c)}
                                            />
                                            <Label htmlFor="confirm" className="text-sm font-normal cursor-pointer leading-tight">
                                                I confirm that all information provided for both Business and Self Assessment services is accurate.
                                            </Label>
                                        </div>
                                    </div>
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
                        className={`w-full ${step === 6 ? "bg-green-600 hover:bg-green-700" : ""}`}
                        disabled={loading || (step === 6 && !data.confirmed)}
                        onClick={step === 6 ? () => onSubmit(data) : nextStep}
                    >
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : step < 6 ? (
                            <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
                        ) : (
                            "Submit Combined Application"
                        )}
                    </Button>
                </Tilt>
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
            <h4 className="font-medium text-sm">Add New Director/Shareholder</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input value={director.firstName} onChange={(e) => setDirector({ ...director, firstName: e.target.value })} placeholder="John" />
                </div>
                <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={director.lastName} onChange={(e) => setDirector({ ...director, lastName: e.target.value })} placeholder="Doe" />
                </div>
                <div className="space-y-2">
                    <Label>Role</Label>
                    <Input value={director.role} onChange={(e) => setDirector({ ...director, role: e.target.value })} placeholder="Director" />
                </div>
                <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={director.dob} onChange={(e) => setDirector({ ...director, dob: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label>Home Address</Label>
                    <Textarea value={director.address} onChange={(e) => setDirector({ ...director, address: e.target.value })} placeholder="Address..." className="min-h-[60px]" />
                </div>
            </div>
            <Button onClick={handleAdd} disabled={!director.firstName || !director.lastName || !director.role} className="w-full" variant="secondary">
                <Plus className="w-4 h-4 mr-2" /> Add Person
            </Button>
        </div>
    );
}
