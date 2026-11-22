"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Plus, Trash2, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { Expandable } from "@/components/ui/expandable";
import GradientButton from "@/components/kokonutui/gradient-button";
import {
  ChoiceChips,
  ErrorSummary,
  Field,
  FieldGrid,
  FormSection,
  InlineCheck,
  Notice,
  QuestionRow,
  StepProgress,
  YesNo,
} from "@/components/onboarding/form-kit";
import {
  AML_QUESTIONS,
  BUSINESS_SERVICES,
  INCOME_TYPES,
  NOT_YET_ISSUED,
  SEND_LATER,
  isEmail,
  type OnboardingType,
} from "@/lib/onboarding-fields";
import {
  hasAnyText,
  hasUpload,
  normalizeAccountsOfficeRef,
  normalizeAuthCode,
  normalizeCompanyNumber,
  normalizeNi,
  normalizePayeRef,
  normalizeUtr,
  normalizeVatNumber,
} from "@/lib/onboarding-validation";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Data = Record<string, any>;
type Update = (updater: (prev: Data) => Data) => void;

export type StepId = "you" | "company" | "business" | "income" | "checks";
export type DocKind = "photoId" | "proofOfAddress";
type UploadState = Partial<Record<DocKind, { busy?: boolean; error?: string }>>;

const STEPS: Record<OnboardingType, { id: StepId; title: string }[]> = {
  "self-assessment": [
    { id: "you", title: "About you" },
    { id: "income", title: "Your income" },
    { id: "checks", title: "Final checks" },
  ],
  business: [
    { id: "you", title: "About you" },
    { id: "company", title: "Your company" },
    { id: "business", title: "Your business" },
    { id: "checks", title: "Final checks" },
  ],
  both: [
    { id: "you", title: "About you" },
    { id: "company", title: "Your company" },
    { id: "business", title: "Business and income" },
    { id: "checks", title: "Final checks" },
  ],
};

const needsPersonalTax = (type: OnboardingType) => type !== "business";

/** Returns the names of anything missing on a step. */
function missingOnStep(type: OnboardingType, step: StepId, d: Data): string[] {
  const missing: string[] = [];
  const need = (ok: boolean, name: string) => {
    if (!ok) missing.push(name);
  };
  if (step === "you") {
    need(hasAnyText(d.fullNamePassport), "Full name");
    need(isEmail(d.email), "A valid email address");
    need(hasAnyText(d.phoneNumber), "Phone number");
    need(hasAnyText(d.dob), "Date of birth");
    need(hasAnyText(d.homeAddress), "Home address");
    if (needsPersonalTax(type)) {
      need(hasAnyText(d.niNumber), "National Insurance number");
      need(hasAnyText(d.personalUtr), "Personal UTR (or tick that you don't have one yet)");
    }
    need(hasUpload(d.photoId), "Photo ID");
    need(hasUpload(d.proofOfAddress), "Proof of address");
  }
  if (step === "company") {
    need(hasAnyText(d.companyName), "Company name");
    need(hasAnyText(d.registrationNumber), "Company number");
    need(hasAnyText(d.businessUtr), "Company UTR (or tick that you don't have one yet)");
    need(d.hasPaye === "yes" || d.hasPaye === "no", "Whether you have a PAYE scheme");
    if (d.hasPaye === "yes") {
      need(hasAnyText(d.accountsOfficeRef), "Accounts Office reference");
      need(hasAnyText(d.payeRef), "PAYE reference");
    }
    need(d.isVatRegistered === "yes" || d.isVatRegistered === "no", "Whether you are VAT registered");
    if (d.isVatRegistered === "yes") need(hasAnyText(d.vatNumber), "VAT number");
  }
  if (step === "business") {
    need((d.directors || []).length >= 1, "At least one director or owner");
    need((d.servicesRequired || []).length >= 1, "At least one service");
    need(hasAnyText(d.natureOfBusiness), "What the business does");
    need(hasAnyText(d.sourceOfFunds), "Main source of income");
  }
  if (step === "income" || (step === "business" && type === "both")) {
    need((d.incomeTypes || []).length >= 1, "At least one income type");
    need(d.expectsForeignIncome === "yes" || d.expectsForeignIncome === "no", "Whether you have income from outside the UK");
    if (d.expectsForeignIncome === "yes") need(hasAnyText(d.foreignIncomeDetails), "Details of foreign income");
  }
  if (step === "business" || step === "income") {
    need(d.previousAccountant === "yes" || d.previousAccountant === "no", "Whether you have an accountant now");
    if (d.previousAccountant === "yes") need(hasAnyText(d.previousAccountantName), "Your current accountant's name");
  }
  if (step === "checks") {
    for (const q of AML_QUESTIONS[type]) {
      if (d[q.field] !== "yes" && d[q.field] !== "no") {
        missing.push("Answer every question");
        break;
      }
    }
    need(d.confirmed === true, "Confirm your details are accurate");
  }
  return missing;
}

export function OnboardingForm({
  type,
  data,
  updateData,
  onBack,
  onSubmit,
  loading,
  formStep = 1,
  onFormStepChange,
  onUpload,
  onStepComplete,
}: {
  type: OnboardingType;
  data: Data;
  updateData: Update;
  onBack: () => void;
  onSubmit: (data: Data) => void;
  loading: boolean;
  formStep?: number;
  onFormStepChange?: (step: number) => void;
  /** Uploads a document straight away and returns its stored path. */
  onUpload?: (kind: DocKind, file: File) => Promise<string>;
  /** Called after a step passes its checks, with the data at that point. */
  onStepComplete?: (stepId: StepId, data: Data) => void;
}) {
  const steps = STEPS[type];
  const index = Math.min(Math.max(formStep, 1), steps.length) - 1;
  const step = steps[index];
  const [errors, setErrors] = useState<string[]>([]);
  const [showInvalid, setShowInvalid] = useState(false);
  const [uploads, setUploads] = useState<UploadState>({});

  const set = (field: string, value: unknown) => updateData((prev) => ({ ...prev, [field]: value }));

  const pickFile = async (kind: DocKind, file: File | null) => {
    if (!file) {
      updateData((prev) => ({ ...prev, [kind]: null, [`${kind}Name`]: null }));
      setUploads((u) => ({ ...u, [kind]: {} }));
      return;
    }
    if (!onUpload) {
      updateData((prev) => ({ ...prev, [kind]: file, [`${kind}Name`]: file.name }));
      return;
    }
    setUploads((u) => ({ ...u, [kind]: { busy: true } }));
    try {
      const path = await onUpload(kind, file);
      updateData((prev) => ({ ...prev, [kind]: path, [`${kind}Name`]: file.name }));
      setUploads((u) => ({ ...u, [kind]: {} }));
    } catch (error) {
      setUploads((u) => ({
        ...u,
        [kind]: { error: error instanceof Error ? error.message : "Upload failed. Please try again." },
      }));
    }
  };
  const go = (next: number) => {
    setErrors([]);
    setShowInvalid(false);
    onFormStepChange?.(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    if (uploads.photoId?.busy || uploads.proofOfAddress?.busy) {
      setErrors(["Wait for your documents to finish uploading"]);
      return;
    }
    const missing = missingOnStep(type, step.id, data);
    if (missing.length) {
      setErrors(missing);
      setShowInvalid(true);
      return;
    }
    onStepComplete?.(step.id, data);
    if (index < steps.length - 1) go(index + 2);
    else onSubmit(data);
  };

  const isLast = index === steps.length - 1;

  return (
    <div className="relative space-y-6">
      <StepProgress steps={steps.map((s) => s.title)} current={index} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}
          className="space-y-8"
        >
          {step.id === "you" && <YouStep type={type} d={data} set={set} uploads={uploads} onPick={pickFile} />}
          {step.id === "company" && <CompanyStep d={data} set={set} />}
          {step.id === "business" && <BusinessStep type={type} d={data} set={set} />}
          {step.id === "income" && (
            <>
              <IncomeSection d={data} set={set} />
              <PreviousAccountantSection d={data} set={set} />
            </>
          )}
          {step.id === "checks" && <ChecksStep type={type} d={data} set={set} invalid={showInvalid} />}
        </motion.div>
      </AnimatePresence>

      <ErrorSummary items={errors} />

      {/* Hidden from people; bots that fill every field get filtered out. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" value={data.website || ""} onChange={(e) => set("website", e.target.value)} />
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:justify-between">
        <GradientButton
          type="button"
          appearance="outline"
          onClick={index === 0 ? onBack : () => go(index)}
          disabled={loading}
          className="sm:w-40"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </GradientButton>
        <GradientButton type="button" onClick={next} loading={loading} className="sm:min-w-48">
          {isLast ? "Submit my details" : "Continue"} <ArrowRight className="h-4 w-4" />
        </GradientButton>
      </div>
    </div>
  );
}

type StepProps = { d: Data; set: (field: string, value: unknown) => void };

function YouStep({
  type,
  d,
  set,
  uploads,
  onPick,
}: StepProps & { type: OnboardingType; uploads: UploadState; onPick: (kind: DocKind, file: File | null) => void }) {
  return (
    <>
      <FormSection title="Your details" description="The person we will be working with. Use your name exactly as it appears on your passport or driving licence.">
        <FieldGrid>
          <Field label="Full name" htmlFor="fullNamePassport">
            <Input id="fullNamePassport" autoComplete="name" value={d.fullNamePassport || ""} onChange={(e) => set("fullNamePassport", e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" value={d.email || ""} onChange={(e) => set("email", e.target.value.trim())} />
          </Field>
          <Field label="Phone number" htmlFor="phoneNumber">
            <Input id="phoneNumber" type="tel" autoComplete="tel" value={d.phoneNumber || ""} onChange={(e) => set("phoneNumber", e.target.value)} />
          </Field>
          <Field label="Date of birth" htmlFor="dob">
            <Input id="dob" type="date" autoComplete="bday" value={d.dob || ""} onChange={(e) => set("dob", e.target.value)} />
          </Field>
        </FieldGrid>
        <Field label="Home address" htmlFor="homeAddress" hint="Including postcode">
          <Textarea id="homeAddress" autoComplete="street-address" className="min-h-20" value={d.homeAddress || ""} onChange={(e) => set("homeAddress", e.target.value)} />
        </Field>
      </FormSection>

      {needsPersonalTax(type) && (
        <FormSection title="Personal tax">
          <FieldGrid>
            <Field label="National Insurance number" htmlFor="niNumber" hint="For example QQ 12 34 56 C">
              <Input id="niNumber" value={d.niNumber || ""} onChange={(e) => set("niNumber", normalizeNi(e.target.value))} />
            </Field>
            <NotYetField
              id="personalUtr"
              label="Personal UTR"
              hint="10 digits, on letters from HMRC"
              value={d.personalUtr}
              notYet={!!d.noPersonalUtr}
              onValue={(v) => set("personalUtr", normalizeUtr(v))}
              onNotYet={(on) => {
                set("noPersonalUtr", on);
                set("personalUtr", on ? NOT_YET_ISSUED : "");
              }}
              notYetLabel="I don't have one yet"
            />
          </FieldGrid>
        </FormSection>
      )}

      <FormSection title="Identity documents" description="We need these to confirm who you are, as required by anti-money laundering rules.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FileUpload
            label="Photo ID"
            desc="Passport or driving licence"
            required
            value={d.photoId}
            fileName={d.photoIdName}
            uploading={uploads.photoId?.busy}
            error={uploads.photoId?.error}
            onChange={(file) => onPick("photoId", file)}
          />
          <FileUpload
            label="Proof of home address"
            desc="Bank statement or utility bill from the last 3 months"
            required
            value={d.proofOfAddress}
            fileName={d.proofOfAddressName}
            uploading={uploads.proofOfAddress?.busy}
            error={uploads.proofOfAddress?.error}
            onChange={(file) => onPick("proofOfAddress", file)}
          />
        </div>
      </FormSection>
    </>
  );
}

function NotYetField({
  id,
  label,
  hint,
  value,
  notYet,
  onValue,
  onNotYet,
  notYetLabel,
  notYetText = NOT_YET_ISSUED,
}: {
  id: string;
  label: string;
  hint: string;
  value: string | undefined;
  notYet: boolean;
  onValue: (value: string) => void;
  onNotYet: (on: boolean) => void;
  notYetLabel: string;
  notYetText?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Field label={label} htmlFor={id} hint={notYet ? undefined : hint}>
        <Input id={id} value={notYet ? "" : value || ""} placeholder={notYet ? notYetText : undefined} disabled={notYet} onChange={(e) => onValue(e.target.value)} />
      </Field>
      <InlineCheck checked={notYet} onChange={onNotYet}>
        {notYetLabel}
      </InlineCheck>
    </div>
  );
}

function CompanyStep({ d, set }: StepProps) {
  return (
    <>
      <FormSection title="Company details">
        <FieldGrid>
          <Field label="Company name" htmlFor="companyName">
            <Input id="companyName" autoComplete="organization" value={d.companyName || ""} onChange={(e) => set("companyName", e.target.value)} />
          </Field>
          <Field label="Company number" htmlFor="registrationNumber" hint="8 characters, for example 01234567 or SC123456">
            <Input id="registrationNumber" value={d.registrationNumber || ""} onChange={(e) => set("registrationNumber", normalizeCompanyNumber(e.target.value))} />
          </Field>
          <NotYetField
            id="businessUtr"
            label="Company UTR"
            hint="10 digits, on letters from HMRC to the company"
            value={d.businessUtr}
            notYet={!!d.noBusinessUtr}
            onValue={(v) => set("businessUtr", normalizeUtr(v))}
            onNotYet={(on) => {
              set("noBusinessUtr", on);
              set("businessUtr", on ? NOT_YET_ISSUED : "");
            }}
            notYetLabel="Not received yet"
          />
          <NotYetField
            id="companyAuthCode"
            label="Companies House authentication code"
            hint="6 characters, posted to the registered office"
            value={d.companyAuthCode}
            notYet={!!d.noAuthCode}
            onValue={(v) => set("companyAuthCode", normalizeAuthCode(v))}
            onNotYet={(on) => {
              set("noAuthCode", on);
              set("companyAuthCode", on ? SEND_LATER : "");
            }}
            notYetLabel="I'll send this later"
            notYetText="We'll ask you for this later"
          />
        </FieldGrid>
        <Field label="Trading address" htmlFor="tradingAddress" optional hint="Only if different from the registered office">
          <Input id="tradingAddress" value={d.tradingAddress || ""} onChange={(e) => set("tradingAddress", e.target.value)} />
        </Field>
      </FormSection>

      <FormSection title="Payroll and VAT">
        <QuestionRow
          label="Does the company run payroll (a PAYE scheme)?"
          details={
            <Expandable show={d.hasPaye === "yes"} contentKey="paye">
              <FieldGrid>
                <Field label="Accounts Office reference" htmlFor="accountsOfficeRef" hint="13 characters, for example 123PA00012345">
                  <Input id="accountsOfficeRef" value={d.accountsOfficeRef || ""} onChange={(e) => set("accountsOfficeRef", normalizeAccountsOfficeRef(e.target.value))} />
                </Field>
                <Field label="Employer PAYE reference" htmlFor="payeRef" hint="For example 123/AB45678">
                  <Input id="payeRef" value={d.payeRef || ""} onChange={(e) => set("payeRef", normalizePayeRef(e.target.value))} />
                </Field>
              </FieldGrid>
            </Expandable>
          }
        >
          <YesNo label="PAYE scheme" value={d.hasPaye} onChange={(v) => set("hasPaye", v)} />
        </QuestionRow>
        <QuestionRow
          label="Is the company VAT registered?"
          details={
            <Expandable show={d.isVatRegistered === "yes"} contentKey="vat">
              <FieldGrid>
                <Field label="VAT number" htmlFor="vatNumber">
                  <Input id="vatNumber" value={d.vatNumber || ""} onChange={(e) => set("vatNumber", normalizeVatNumber(e.target.value))} />
                </Field>
                <Field label="VAT registration date" htmlFor="vatRegDate" optional>
                  <Input id="vatRegDate" type="date" value={d.vatRegDate || ""} onChange={(e) => set("vatRegDate", e.target.value)} />
                </Field>
              </FieldGrid>
            </Expandable>
          }
        >
          <YesNo label="VAT registered" value={d.isVatRegistered} onChange={(v) => set("isVatRegistered", v)} />
        </QuestionRow>
      </FormSection>
    </>
  );
}

function BusinessStep({ type, d, set }: StepProps & { type: OnboardingType }) {
  const toggle = (field: string, option: string) => {
    const current: string[] = d[field] || [];
    set(field, current.includes(option) ? current.filter((x) => x !== option) : [...current, option]);
  };
  return (
    <>
      <FormSection title="Directors and owners" description="Add every director and anyone who owns 25% or more of the company.">
        <OwnersList d={d} set={set} />
      </FormSection>

      <FormSection title="What you need from us">
        <ChoiceChips options={BUSINESS_SERVICES} selected={d.servicesRequired || []} onToggle={(o) => toggle("servicesRequired", o)} />
      </FormSection>

      <FormSection title="About the business">
        <Field label="What does the business do?" htmlFor="natureOfBusiness">
          <Textarea id="natureOfBusiness" value={d.natureOfBusiness || ""} onChange={(e) => set("natureOfBusiness", e.target.value)} />
        </Field>
        <Field label="Where does its money mainly come from?" htmlFor="sourceOfFunds" hint="For example sales to customers, contracts or investment">
          <Input id="sourceOfFunds" value={d.sourceOfFunds || ""} onChange={(e) => set("sourceOfFunds", e.target.value)} />
        </Field>
      </FormSection>

      {type === "both" && <IncomeSection d={d} set={set} />}
      <PreviousAccountantSection d={d} set={set} />
    </>
  );
}

function IncomeSection({ d, set }: StepProps) {
  const toggle = (option: string) => {
    const current: string[] = d.incomeTypes || [];
    set("incomeTypes", current.includes(option) ? current.filter((x) => x !== option) : [...current, option]);
  };
  return (
    <>
      <FormSection title="Your personal income" description="Choose everything that applies to you.">
        <ChoiceChips options={INCOME_TYPES} selected={d.incomeTypes || []} onToggle={toggle} />
        <Expandable show={(d.incomeTypes || []).includes("Other")} contentKey="other-income">
          <Field label="Tell us about your other income" htmlFor="otherIncome">
            <Input id="otherIncome" value={d.otherIncome || ""} onChange={(e) => set("otherIncome", e.target.value)} />
          </Field>
        </Expandable>
      </FormSection>
      <FormSection title="Income from abroad">
        <QuestionRow
          label="Do you get any income from outside the UK?"
          details={
            <Expandable show={d.expectsForeignIncome === "yes"} contentKey="foreign">
              <Field label="Which countries, and what kind of income?" htmlFor="foreignIncomeDetails" hint="For example: USA, dividends">
                <Textarea id="foreignIncomeDetails" value={d.foreignIncomeDetails || ""} onChange={(e) => set("foreignIncomeDetails", e.target.value)} />
              </Field>
            </Expandable>
          }
        >
          <YesNo label="Foreign income" value={d.expectsForeignIncome} onChange={(v) => set("expectsForeignIncome", v)} />
        </QuestionRow>
      </FormSection>
    </>
  );
}

function PreviousAccountantSection({ d, set }: StepProps) {
  return (
    <FormSection title="Your current accountant" description="If you have one, we contact them for a handover so nothing is missed.">
      <QuestionRow
        label="Do you have an accountant at the moment?"
        details={
          <Expandable show={d.previousAccountant === "yes"} contentKey="prev-accountant">
            <FieldGrid>
              <Field label="Accountant's name" htmlFor="previousAccountantName">
                <Input id="previousAccountantName" value={d.previousAccountantName || ""} onChange={(e) => set("previousAccountantName", e.target.value)} />
              </Field>
              <Field label="Firm" htmlFor="previousAccountantFirm" optional>
                <Input id="previousAccountantFirm" value={d.previousAccountantFirm || ""} onChange={(e) => set("previousAccountantFirm", e.target.value)} />
              </Field>
              <Field label="Their email" htmlFor="previousAccountantEmail" optional>
                <Input id="previousAccountantEmail" type="email" value={d.previousAccountantEmail || ""} onChange={(e) => set("previousAccountantEmail", e.target.value.trim())} />
              </Field>
            </FieldGrid>
          </Expandable>
        }
      >
        <YesNo label="Current accountant" value={d.previousAccountant} onChange={(v) => set("previousAccountant", v)} />
      </QuestionRow>
    </FormSection>
  );
}

function ChecksStep({ type, d, set, invalid }: StepProps & { type: OnboardingType; invalid: boolean }) {
  return (
    <>
      <Notice tone="warm">
        Anti-money laundering rules require us to ask everyone these questions. Answering yes does not stop us working with you; we may just ask for a little more information.
      </Notice>
      <FormSection title="Compliance questions">
        <div className="space-y-5">
          {AML_QUESTIONS[type].map((q) => (
            <QuestionRow
              key={q.field}
              label={q.label}
              details={
                q.detailsField ? (
                  <Expandable show={d[q.field] === "yes"} contentKey={`${q.field}-details`}>
                    <Field label="Please give details" htmlFor={q.detailsField}>
                      <Textarea id={q.detailsField} value={d[q.detailsField] || ""} onChange={(e) => set(q.detailsField as string, e.target.value)} />
                    </Field>
                  </Expandable>
                ) : null
              }
            >
              <YesNo label={q.label} value={d[q.field]} onChange={(v) => set(q.field, v)} invalid={invalid && !d[q.field]} />
            </QuestionRow>
          ))}
        </div>
      </FormSection>
      <FormSection title="Declaration">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm leading-relaxed text-stone-800">
          <input
            type="checkbox"
            checked={d.confirmed === true}
            onChange={(e) => set("confirmed", e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 accent-clay-600"
          />
          <span>
            I confirm the information I have given is accurate and complete. I understand Figures will use it to check my identity and set up my services, as described in the{" "}
            <a href="/privacy" target="_blank" className="font-medium text-clay-700 underline underline-offset-2">
              privacy notice
            </a>
            .
          </span>
        </label>
      </FormSection>
    </>
  );
}

type Owner = { id: number | string; firstName: string; lastName: string; role: string; dob: string; address: string };

const ROLES = ["Director", "Shareholder", "Director and shareholder"];

function OwnersList({ d, set }: StepProps) {
  const owners: Owner[] = d.directors || [];
  const [draft, setDraft] = useState<Omit<Owner, "id">>({ firstName: "", lastName: "", role: "", dob: "", address: "" });
  const [adding, setAdding] = useState(owners.length === 0);
  const canAdd = draft.firstName.trim() && draft.lastName.trim() && draft.role;

  const add = () => {
    if (!canAdd) return;
    set("directors", [...owners, { ...draft, id: Date.now() }]);
    setDraft({ firstName: "", lastName: "", role: "", dob: "", address: "" });
    setAdding(false);
  };

  return (
    <div className="space-y-3">
      {owners.map((owner) => (
        <div key={owner.id} className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500">
            <UserRound className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-900">
              {owner.firstName} {owner.lastName}
            </p>
            <p className="text-xs text-stone-500">{owner.role}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${owner.firstName} ${owner.lastName}`}
            className="h-9 w-9 text-stone-500 hover:bg-red-50 hover:text-red-600"
            onClick={() => set("directors", owners.filter((o) => o.id !== owner.id))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {adding ? (
        <div className="space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <FieldGrid>
            <Field label="First name" htmlFor="owner-first">
              <Input id="owner-first" value={draft.firstName} onChange={(e) => setDraft((x) => ({ ...x, firstName: e.target.value }))} />
            </Field>
            <Field label="Last name" htmlFor="owner-last">
              <Input id="owner-last" value={draft.lastName} onChange={(e) => setDraft((x) => ({ ...x, lastName: e.target.value }))} />
            </Field>
            <Field label="Role" htmlFor="owner-role">
              <select
                id="owner-role"
                value={draft.role}
                onChange={(e) => setDraft((x) => ({ ...x, role: e.target.value }))}
                className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-[15px] text-stone-900 focus-visible:border-clay-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20"
              >
                <option value="">Choose a role</option>
                {ROLES.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </Field>
            <Field label="Date of birth" htmlFor="owner-dob" optional>
              <Input id="owner-dob" type="date" value={draft.dob} onChange={(e) => setDraft((x) => ({ ...x, dob: e.target.value }))} />
            </Field>
          </FieldGrid>
          <Field label="Home address" htmlFor="owner-address" optional>
            <Input id="owner-address" value={draft.address} onChange={(e) => setDraft((x) => ({ ...x, address: e.target.value }))} />
          </Field>
          <div className="flex gap-2">
            <Button type="button" onClick={add} disabled={!canAdd}>
              <Plus className="h-4 w-4" /> Add person
            </Button>
            {owners.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add another person
        </Button>
      )}
    </div>
  );
}
