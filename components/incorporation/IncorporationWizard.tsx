"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  COMPANIES_HOUSE_IDENTITY_URL,
  FIGURES_WHATSAPP_URL,
} from "@/lib/figures-config";
import { type IncorporationState, type Director, type Shareholder, initialState, newDirector, newShareholder } from "./state";
import { AddressFields, PostcodeInput, PostcodeLookupBlock } from "./AddressFields";

const STEPS = 9;

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-zinc-800">
      {children}
    </p>
  );
}

export function IncorporationWizard() {
  const [phase, setPhase] = useState<"banner" | "form">("banner");
  const [step, setStep] = useState(1);
  const [s, setS] = useState<IncorporationState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step1Blocked, setStep1Blocked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const started = phase === "form" && !submitted;

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (started) {
        e.preventDefault();
        return "";
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [started]);

  const update = useCallback(<K extends keyof IncorporationState>(key: K, val: IncorporationState[K]) => {
    setS((prev) => ({ ...prev, [key]: val }));
  }, []);

  const validateStep = useCallback(
    (n: number): Record<string, string> => {
      const e: Record<string, string> = {};
      if (n === 1) return e;
      if (n === 2) {
        if (!s.step2.name.trim()) e.name = "Required";
        if (!s.step2.confirmedAvailable) e.confirmed = "Confirm name availability";
        return e;
      }
      if (n === 3) {
        if (!s.step3.registered.line1) e["reg.line1"] = "Required";
        if (!s.step3.registered.town) e["reg.town"] = "Required";
        if (!s.step3.registered.postcode) e["reg.postcode"] = "Required";
        if (s.step3.principal === "different") {
          if (!s.step3.principalAddr.line1) e["pri.line1"] = "Required";
          if (!s.step3.principalAddr.postcode) e["pri.postcode"] = "Required";
        }
        if (!s.step3.registeredEmail.trim()) e.email = "Required";
        return e;
      }
      if (n === 4) {
        if (s.step4.replacing === "yes") {
          if (!s.step4.prevBusinessName.trim()) e.prevName = "Required";
          if (!s.step4.prevBusinessAddr.line1) e.prevAddr = "Required";
          if (!s.step4.handoverPerson.trim()) e.handover = "Required";
        }
        if (s.step4.trading === "date" && !s.step4.tradingDate) e.tradeDate = "Pick a date";
        if (!s.step4.businessDescription.trim() || s.step4.businessDescription.length < 10)
          e.desc = "Describe your business (10+ characters)";
        if (s.step4.sicCodes.length < 1) e.sic = "Select at least one SIC code";
        return e;
      }
      if (n === 5) {
        s.step5.directors.forEach((d, i) => {
          if (!d.firstName.trim()) e[`d${i}.first`] = "Required";
          if (!d.lastName.trim()) e[`d${i}.last`] = "Required";
          if (!d.nationality.trim()) e[`d${i}.nat`] = "Required";
          const age =
            new Date().getFullYear() -
            parseInt(d.dobYear || "0", 10) -
            (parseInt(d.dobMonth || "0", 10) > new Date().getMonth() + 1 ? 1 : 0);
          if (!d.dobDay || !d.dobMonth || !d.dobYear) e[`d${i}.dob`] = "Complete date of birth";
          else if (age < 16) e[`d${i}.dob`] = "Director must be 16+";
          if (d.corrType === "other") {
            if (!d.corrAddress.line1) e[`d${i}.corr`] = "Address required";
          }
          if (d.homeType === "other") {
            if (!d.homeAddress.line1) e[`d${i}.home`] = "Home address required";
          }
          if (!d.countryResidence.trim()) e[`d${i}.res`] = "Required";
          if (!d.agreesDirector) e[`d${i}.agree`] = "Required";
        });
        return e;
      }
      if (n === 6) {
        s.step6.shareholders.forEach((sh, i) => {
          if (sh.kind === "person") {
            if (sh.isDirector === "no") {
              if (!sh.firstName.trim()) e[`sh${i}.fn`] = "Required";
              if (!sh.lastName.trim()) e[`sh${i}.ln`] = "Required";
            } else if (!sh.directorId) e[`sh${i}.dir`] = "Select director";
            if (sh.addrType === "other" && !sh.addr.line1) e[`sh${i}.addr`] = "Required";
          } else {
            if (!sh.businessName.trim()) e[`sh${i}.bn`] = "Required";
            if (!sh.businessAddress.line1) e[`sh${i}.ba`] = "Required";
            if (!sh.actingFirst.trim() || !sh.actingLast.trim()) e[`sh${i}.act`] = "Required";
          }
        });
        return e;
      }
      if (n === 7) {
        if (!s.step7.standard && !s.step7.customShareDescription.trim()) {
          e.customShare = "Describe your custom share structure (or tick standard setup)";
        }
        const total = s.step6.shareholders.reduce(
          (sum, sh) => sum + (s.step7.allocations[sh.id] || 0),
          0
        );
        if (total < 1) e.alloc = "Allocate at least one share";
        s.step6.shareholders.forEach((sh) => {
          if (!(s.step7.allocations[sh.id] > 0)) e[`a${sh.id}`] = "Shares required";
        });
        const pct = s.step6.shareholders.map((sh) => {
          const nsh = s.step7.allocations[sh.id] || 0;
          return total ? (nsh / total) * 100 : 0;
        });
        const sumPct = pct.reduce((a, b) => a + b, 0);
        if (Math.abs(sumPct - 100) > 0.01) e.pct = "Total ownership must equal 100%";
        return e;
      }
      if (n === 8) {
        const pscs = computePscs();
        if (pscs.length === 0 && !s.step8.noPscConfirm)
          e.psc = "Confirm no single person controls more than 25%";
        if (pscs.length > 0 && !s.step8.pscListConfirm)
          e.pscReview = "Confirm the people listed match your shareholdings";
        return e;
      }
      if (n === 9) {
        s.step5.directors.forEach((d) => {
          const code = (s.step9.directorPersonalCodes[d.id] || "").replace(/\s/g, "");
          if (code.length !== 11) e[`dc${d.id}`] = "Exactly 11 characters";
        });
        if (!s.step9.acc1) e.a1 = "Required";
        return e;
      }
      return e;
    },
    [s]
  );

  function computePscs() {
    const total = s.step6.shareholders.reduce(
      (sum, sh) => sum + (s.step7.allocations[sh.id] || 0),
      0
    );
    if (!total) return [];
    const out: { id: string; name: string; pct: number; isDirector: boolean; directorId?: string }[] = [];
    s.step6.shareholders.forEach((sh) => {
      const n = s.step7.allocations[sh.id] || 0;
      const pct = (n / total) * 100;
      if (pct <= 25) return;
      let name = "";
      let isDir = false;
      let directorId: string | undefined;
      if (sh.kind === "person" && sh.isDirector === "yes" && sh.directorId) {
        const d = s.step5.directors.find((x) => x.id === sh.directorId);
        if (d) {
          name = `${d.firstName} ${d.lastName}`;
          isDir = true;
          directorId = d.id;
        }
      } else if (sh.kind === "person") {
        name = `${sh.firstName} ${sh.lastName}`;
      } else {
        name = sh.businessName;
      }
      out.push({ id: sh.id, name, pct, isDirector: isDir, directorId });
    });
    return out;
  }

  const next = () => {
    if (step === 1) {
      if (s.step1.cic === "yes" || s.step1.limitedByGuarantee === "yes") {
        fetch("/api/incorporation/notify-special", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s.step1),
        });
        setStep1Blocked(true);
        return;
      }
    }
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (step < STEPS) setStep(step + 1);
  };

  const back = () => {
    setErrors({});
    if (step > 1) setStep(step - 1);
    else setPhase("banner");
  };

  const fetchSic = async () => {
    update("step4", { ...s.step4, sicLoading: true });
    try {
      const r = await fetch("/api/suggest-sic-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: s.step4.businessDescription }),
      });
      const j = await r.json();
      update("step4", {
        ...s.step4,
        sicLoading: false,
        sicSuggestions: j.suggestions || [],
      });
    } catch {
      update("step4", { ...s.step4, sicLoading: false });
    }
  };

  const submit = async () => {
    const e = validateStep(9);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    try {
      const payload = {
        introPersonalCode: s.introPersonalCode,
        step1: s.step1,
        step2: s.step2,
        step3: s.step3,
        step4: s.step4,
        step5: s.step5,
        step6: s.step6,
        step7: s.step7,
        step8: s.step8,
        step9: s.step9,
        pscSummary: computePscs(),
      };
      await fetch("/api/incorporation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = phase === "banner" ? 0 : Math.round((step / STEPS) * 100);

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-900">Thank you</h2>
        <p className="mt-4 text-sm text-zinc-600">
          We have received your incorporation request. The Figures team will be in touch shortly.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-purple-600 underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (phase === "banner") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:p-10">
        <h1 className="text-2xl font-semibold text-zinc-900">Company incorporation</h1>
        <div className="space-y-4 text-sm text-zinc-700 leading-relaxed">
          <p>
            This form takes approximately 25-30 minutes to complete. Please set aside enough time to
            finish it in one sitting, as{" "}
            <span className="font-semibold text-zinc-900">the form does not auto-save.</span>
          </p>
          <p>
            Before you start: all directors and anyone who owns more than 25% of the company must
            verify their identity with Companies House. You will need a passport or UK driving
            licence and a GOV.UK One Login account.
          </p>
          <p>
            Companies House requires identity verification for all directors and anyone who owns
            more than 25% of the company (PSCs).
          </p>
          <p>
            <a
              href={COMPANIES_HOUSE_IDENTITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-purple-700 underline"
            >
              Verify your identity here
            </a>
          </p>
          <p>
            If you have any questions at any point, take a screenshot and send it to us on{" "}
            <span className="font-medium text-zinc-900">WhatsApp</span>. We are happy to help.
          </p>
        </div>
        <div className="rounded-xl border-2 border-amber-400 bg-yellow-100 px-4 py-4 shadow-sm ring-2 ring-yellow-200/80">
          <p className="text-base font-semibold text-zinc-900">Important</p>
          <p className="mt-1 text-sm text-zinc-800">
            <strong>Only proceed if you have the Companies House personal codes to hand</strong> for
            all directors (and any PSCs who are not directors). You&apos;ll be asked for directors&apos;
            codes at the end of this form.
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setPhase("form");
          }}
        >
          Start
        </Button>
      </div>
    );
  }

  if (step1Blocked) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <p className="text-zinc-800">
          Thank you - one of our team will be in touch shortly to discuss the right structure for
          you.
        </p>
        <Link href="/" className="mt-6 inline-block text-purple-600 underline">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24">
      <div className="sticky top-0 z-10 -mx-4 border-b border-zinc-200 bg-zinc-50/95 px-4 py-3 backdrop-blur">
        <div className="mb-2 flex justify-between text-xs text-zinc-500">
          <span>
            Step {step} of {STEPS}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-purple-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {step === 1 && (
        <section className="space-y-4">
          <Note>
            Almost all new businesses will be a standard private limited company. If either of the
            questions below applies to you, just select Yes and our team will be in touch to help.
          </Note>
          <div className="space-y-2">
            <Label>Is this a Community Interest Company?</Label>
            <RadioGroup
              value={s.step1.cic}
              onValueChange={(v) => update("step1", { ...s.step1, cic: v as "yes" | "no" })}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="cic-y" />
                <Label htmlFor="cic-y">Yes</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="cic-n" />
                <Label htmlFor="cic-n">No</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>
              Will the company be limited by guarantee rather than shares? (typically charities)
            </Label>
            <RadioGroup
              value={s.step1.limitedByGuarantee}
              onValueChange={(v) =>
                update("step1", { ...s.step1, limitedByGuarantee: v as "yes" | "no" })
              }
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="g-y" />
                <Label htmlFor="g-y">Yes</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="g-n" />
                <Label htmlFor="g-n">No</Label>
              </div>
            </RadioGroup>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <Note>
            Your company name must be unique on the Companies House register. Use the tools below
            to check availability before you fill in this section.
          </Note>
          <div className="grid gap-2 text-sm">
            <a
              href="https://find-and-update.company-information.service.gov.uk/company-name-availability"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 font-medium text-purple-800 shadow-sm transition hover:border-purple-300 hover:bg-purple-100"
            >
              Check name availability on Companies House
            </a>
          </div>
          <div className="space-y-1">
            <Label>Proposed company name *</Label>
            <Input
              value={s.step2.name}
              onChange={(e) => update("step2", { ...s.step2, name: e.target.value })}
            />
            <p className="text-xs text-zinc-500">Do not include Limited or Ltd - we add it for you.</p>
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label>Preferred ending</Label>
            <RadioGroup
              value={s.step2.ending}
              onValueChange={(v) => update("step2", { ...s.step2, ending: v as "Limited" | "Ltd" })}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="Limited" id="e1" />
                <Label htmlFor="e1">Limited</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="Ltd" id="e2" />
                <Label htmlFor="e2">Ltd</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-1">
            <Label>Backup company name (optional)</Label>
            <Input
              value={s.step2.backupName}
              onChange={(e) => update("step2", { ...s.step2, backupName: e.target.value })}
            />
          </div>
          {s.step2.backupName.trim() && (
            <div className="space-y-2">
              <Label>Preferred ending for backup</Label>
              <RadioGroup
                value={s.step2.backupEnding}
                onValueChange={(v) =>
                  update("step2", { ...s.step2, backupEnding: v as "Limited" | "Ltd" })
                }
                className="flex gap-6"
              >
                <RadioGroupItem value="Limited" id="be1" />
                <Label htmlFor="be1">Limited</Label>
                <RadioGroupItem value="Ltd" id="be2" />
                <Label htmlFor="be2">Ltd</Label>
              </RadioGroup>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Checkbox
              id="avail"
              checked={s.step2.confirmedAvailable}
              onCheckedChange={(c) =>
                update("step2", { ...s.step2, confirmedAvailable: !!c })
              }
            />
            <Label htmlFor="avail" className="font-normal leading-tight">
              I have checked and confirmed this name is available *
            </Label>
          </div>
          {errors.confirmed && <p className="text-xs text-red-600">{errors.confirmed}</p>}
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <Note>
            Your registered office address will be visible to the public. We recommend using a
            non-home address to keep your home address private. This is also where HMRC will send
            your company tax reference.
          </Note>
          <div className="space-y-2">
            <Label>Where to register</Label>
            <RadioGroup
              value={s.step3.region}
              onValueChange={(v) =>
                update("step3", { ...s.step3, region: v as IncorporationState["step3"]["region"] })
              }
              className="grid gap-2 sm:grid-cols-2"
            >
              {(
                [
                  ["EW", "England & Wales"],
                  ["S", "Scotland"],
                  ["NI", "Northern Ireland"],
                  ["W", "Wales"],
                ] as const
              ).map(([k, lab]) => (
                <div key={k} className="flex items-center gap-2">
                  <RadioGroupItem value={k} id={`r-${k}`} />
                  <Label htmlFor={`r-${k}`}>{lab}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4">
            <p className="mb-2 text-xs text-zinc-500">
              Enter the registered office address manually — this will appear on the public register.
            </p>
            <AddressFields
              value={s.step3.registered}
              onChange={(a) => update("step3", { ...s.step3, registered: a })}
              errors={errors}
              prefix="reg"
            />
          </div>
          <div className="space-y-2">
            <Label>Principal place of business</Label>
            <RadioGroup
              value={s.step3.principal}
              onValueChange={(v) =>
                update("step3", {
                  ...s.step3,
                  principal: v as IncorporationState["step3"]["principal"],
                })
              }
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="same" id="p1" />
                <Label htmlFor="p1">Same as registered office</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="different" id="p2" />
                <Label htmlFor="p2">A different address</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="none" id="p3" />
                <Label htmlFor="p3">No fixed place of business yet</Label>
              </div>
            </RadioGroup>
          </div>
          {s.step3.principal === "different" && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4">
              <p className="mb-2 text-xs text-zinc-500">
                Enter the address manually — this is where day-to-day business will happen.
              </p>
              <AddressFields
                value={s.step3.principalAddr}
                onChange={(a) => update("step3", { ...s.step3, principalAddr: a })}
                errors={errors}
                prefix="pri"
              />
            </div>
          )}
          <div className="space-y-1">
            <Label>Registered email address *</Label>
            <Input
              type="email"
              value={s.step3.registeredEmail}
              onChange={(e) => update("step3", { ...s.step3, registeredEmail: e.target.value })}
            />
            <p className="text-xs text-zinc-500">Used for Companies House notices. Not shown publicly.</p>
            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
          </div>
          <div className="space-y-1">
            <Label>HMRC contact phone (optional)</Label>
            <Input
              value={s.step3.hmrcPhone}
              onChange={(e) => update("step3", { ...s.step3, hmrcPhone: e.target.value })}
            />
            <p className="text-xs text-zinc-500">Only if HMRC has Corporation Tax questions.</p>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4 text-left">
          <Note>
            Most new companies will answer No to the first question and start trading straight away.
          </Note>
          <div className="space-y-2">
            <Label>Is this company replacing an existing business?</Label>
            <RadioGroup
              value={s.step4.replacing}
              onValueChange={(v) => update("step4", { ...s.step4, replacing: v as "yes" | "no" })}
              className="flex gap-6"
            >
              <RadioGroupItem value="yes" id="rep-y" />
              <Label htmlFor="rep-y">Yes</Label>
              <RadioGroupItem value="no" id="rep-n" />
              <Label htmlFor="rep-n">No</Label>
            </RadioGroup>
          </div>
          {s.step4.replacing === "yes" && (
            <div className="space-y-3 rounded-lg border p-4">
              <Input
                placeholder="Name of previous business *"
                value={s.step4.prevBusinessName}
                onChange={(e) => update("step4", { ...s.step4, prevBusinessName: e.target.value })}
              />
              {errors.prevName && <p className="text-xs text-red-600">{errors.prevName}</p>}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4">
                <p className="mb-2 text-xs text-zinc-600">
                  Enter the address of the previous business manually.
                </p>
                <AddressFields
                  value={s.step4.prevBusinessAddr}
                  onChange={(a) => update("step4", { ...s.step4, prevBusinessAddr: a })}
                  errors={errors}
                  prefix="prev"
                />
              </div>
              <Input
                placeholder="Person who agreed the handover *"
                value={s.step4.handoverPerson}
                onChange={(e) => update("step4", { ...s.step4, handoverPerson: e.target.value })}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>When will the company start trading?</Label>
            <RadioGroup
              value={s.step4.trading}
              onValueChange={(v) =>
                update("step4", { ...s.step4, trading: v as IncorporationState["step4"]["trading"] })
              }
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="now" id="t1" />
                <Label htmlFor="t1">Straight away</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="date" id="t2" />
                <Label htmlFor="t2">On a specific date</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="none" id="t3" />
                <Label htmlFor="t3">No plans yet</Label>
              </div>
            </RadioGroup>
            {s.step4.trading === "date" && (
              <Input
                type="date"
                value={s.step4.tradingDate}
                onChange={(e) => update("step4", { ...s.step4, tradingDate: e.target.value })}
              />
            )}
          </div>
          <div className="space-y-1">
            <Label className="font-medium">
              In the first 3 months, will any of these apply to the company?
            </Label>
            <p className="text-xs text-zinc-600">
              This includes paying interest on loans from directors, paying royalties (for example
              for using someone else&apos;s brand or content), or receiving income from overseas
              investments.
            </p>
            <RadioGroup
              value={s.step4.loansOverseas}
              onValueChange={(v) =>
                update("step4", { ...s.step4, loansOverseas: v as "yes" | "no" })
              }
              className="flex gap-6"
            >
              <RadioGroupItem value="yes" id="l-y" />
              <Label htmlFor="l-y">Yes</Label>
              <RadioGroupItem value="no" id="l-n" />
              <Label htmlFor="l-n">No</Label>
            </RadioGroup>
          </div>
          <div className="space-y-1">
            <Label className="font-medium">
              Has anyone on this application already asked Companies House to keep their personal
              details off the public register?
            </Label>
            <p className="text-xs text-zinc-600">
              This is usually only used where someone is at risk of harm and has applied directly to
              Companies House for extra privacy.
            </p>
            <RadioGroup
              value={s.step4.protectedDetails}
              onValueChange={(v) =>
                update("step4", { ...s.step4, protectedDetails: v as "yes" | "no" })
              }
              className="flex gap-6"
            >
              <RadioGroupItem value="yes" id="pr-y" />
              <Label htmlFor="pr-y">Yes</Label>
              <RadioGroupItem value="no" id="pr-n" />
              <Label htmlFor="pr-n">No</Label>
            </RadioGroup>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-zinc-800 space-y-2">
            <p className="font-medium text-zinc-900">SIC codes — what to do</p>
            <ol className="list-decimal list-inside space-y-1 text-zinc-700 leading-relaxed">
              <li>
                <strong>Describe your business</strong> in the box below (one or two sentences in plain
                English).
              </li>
              <li>
                Click <strong>Find my codes</strong> — we&apos;ll suggest codes that match your
                description.
              </li>
              <li>
                <strong>Select up to 4 SIC codes</strong> by clicking the cards (click again to
                deselect). You need <strong>at least one</strong> selected before you can continue. If
                our suggestions don&apos;t fit, use the link to search the full list and pick codes
                manually. Search results and suggestions may not be accurate, so please double-check
                on the Companies House SIC list.
              </li>
            </ol>
          </div>
          <Label className="text-zinc-900">Describe your business *</Label>
          <Textarea
            rows={3}
            value={s.step4.businessDescription}
            onChange={(e) => update("step4", { ...s.step4, businessDescription: e.target.value })}
            placeholder="e.g. Independent cafe serving coffee, cakes and light lunches"
          />
          {errors.desc && <p className="text-xs text-red-600">{errors.desc}</p>}
          <Button type="button" variant="outline" onClick={fetchSic} disabled={s.step4.sicLoading}>
            {s.step4.sicLoading ? "Finding…" : "Find my codes"}
          </Button>
          {s.step4.sicSuggestions.length === 0 && (
            <p className="text-xs text-zinc-500">
              After you click Find my codes, suggested codes appear here — tap a card to add it (max 4).
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {s.step4.sicSuggestions.map((x) => {
              const on = s.step4.sicCodes.some((c) => c.code === x.code);
              const atMax = s.step4.sicCodes.length >= 4 && !on;
              return (
                <button
                  key={x.code}
                  type="button"
                  disabled={atMax}
                  onClick={() => {
                    const next = on
                      ? s.step4.sicCodes.filter((c) => c.code !== x.code)
                      : s.step4.sicCodes.length < 4
                        ? [...s.step4.sicCodes, x]
                        : s.step4.sicCodes;
                    update("step4", { ...s.step4, sicCodes: next });
                  }}
                  className={`rounded-lg border p-3 text-left text-sm ${
                    on ? "border-purple-500 bg-purple-50" : "border-zinc-200"
                  } ${atMax ? "opacity-50" : ""}`}
                >
                  <span className="font-mono font-semibold">{x.code}</span>
                  <p className="text-zinc-600">{x.description}</p>
                </button>
              );
            })}
          </div>
          <a
            href="https://resources.companieshouse.gov.uk/sic/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-700 underline"
          >
            Search the full list manually
          </a>
          <p className="text-sm font-medium text-zinc-700">
            Selected: {s.step4.sicCodes.length} of 4 (minimum 1 to continue)
          </p>
          {errors.sic && <p className="text-xs text-red-600">{errors.sic}</p>}
        </section>
      )}

      {step === 5 && (
        <section className="space-y-6 text-left">
          <Note>
            Correspondence address is public on the register — many people use the registered office
            address. Personal codes are collected on the final step for each director.
          </Note>
          {s.step5.directors.map((d, i) => (
            <DirectorCard
              key={d.id}
              d={d}
              i={i}
              errors={errors}
              onChange={(nd) => {
                const arr = [...s.step5.directors];
                arr[i] = nd;
                update("step5", { directors: arr });
              }}
              onRemove={() => {
                if (s.step5.directors.length < 2) return;
                update("step5", {
                  directors: s.step5.directors.filter((_, j) => j !== i),
                });
              }}
              canRemove={s.step5.directors.length > 1}
            />
          ))}
          <Button type="button" variant="outline" onClick={() => update("step5", { directors: [...s.step5.directors, newDirector()] })}>
            Add another director
          </Button>
        </section>
      )}

      {step === 6 && (
        <section className="space-y-6 text-left">
          <Note>Shareholders can be people or businesses. Directors can be linked automatically.</Note>
          {s.step6.shareholders.map((sh, i) => (
            <ShareholderCard
              key={sh.id}
              sh={sh}
              i={i}
              directors={s.step5.directors}
              errors={errors}
              onChange={(nsh) => {
                const arr = [...s.step6.shareholders];
                arr[i] = nsh;
                update("step6", { shareholders: arr });
              }}
              onRemove={() => {
                if (s.step6.shareholders.length < 2) return;
                update("step6", {
                  shareholders: s.step6.shareholders.filter((_, j) => j !== i),
                });
              }}
              canRemove={s.step6.shareholders.length > 1}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              update("step6", { shareholders: [...s.step6.shareholders, newShareholder()] })
            }
          >
            Add another shareholder
          </Button>
        </section>
      )}

      {step === 7 && (
        <Step7
          s={s}
          update={update}
          errors={errors}
          shareholders={s.step6.shareholders}
        />
      )}

      {step === 8 && (
        <Step8View s={s} update={update} errors={errors} computePscs={computePscs} />
      )}

      {step === 9 && (
        <Step9Review
          s={s}
          setStep={setStep}
          errors={errors}
          update={update}
          onSubmit={submit}
          submitting={submitting}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 flex gap-3 border-t border-zinc-200 bg-white/95 p-4 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <Button type="button" variant="outline" className="flex-1 md:flex-none" onClick={back}>
          Back
        </Button>
        {step < STEPS ? (
          <Button type="button" className="flex-1 md:flex-none" onClick={next}>
            Next
          </Button>
        ) : (
          <Button type="button" className="flex-1 md:flex-none" disabled={submitting} onClick={submit}>
            {submitting ? "Submitting…" : "Submit incorporation request"}
          </Button>
        )}
      </div>
    </div>
  );
}

function DirectorCard({
  d,
  i,
  errors,
  onChange,
  onRemove,
  canRemove,
}: {
  d: Director;
  i: number;
  errors: Record<string, string>;
  onChange: (d: Director) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
      <div className="flex justify-between">
        <span className="font-medium">Director {i + 1}</span>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label>Title</Label>
          <Input value={d.title} onChange={(e) => onChange({ ...d, title: e.target.value })} />
        </div>
        <div>
          <Label>First name *</Label>
          <Input value={d.firstName} onChange={(e) => onChange({ ...d, firstName: e.target.value })} />
          {errors[`d${i}.first`] && <p className="text-xs text-red-600">{errors[`d${i}.first`]}</p>}
        </div>
        <div>
          <Label>Middle name(s)</Label>
          <Input value={d.middleName} onChange={(e) => onChange({ ...d, middleName: e.target.value })} />
        </div>
        <div>
          <Label>Last name *</Label>
          <Input value={d.lastName} onChange={(e) => onChange({ ...d, lastName: e.target.value })} />
          {errors[`d${i}.last`] && <p className="text-xs text-red-600">{errors[`d${i}.last`]}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Different professional name in last 20 years?</Label>
        <RadioGroup
          value={d.differentName}
          onValueChange={(v) => onChange({ ...d, differentName: v as "yes" | "no" })}
          className="flex gap-4"
        >
          <label className="flex items-center gap-1 text-sm">
            <RadioGroupItem value="yes" id={`dn${i}y`} />
            <span>Yes</span>
          </label>
          <label className="flex items-center gap-1 text-sm">
            <RadioGroupItem value="no" id={`dn${i}n`} />
            <span>No</span>
          </label>
        </RadioGroup>
      </div>
      {d.differentName === "yes" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Previous first" value={d.prevFirst} onChange={(e) => onChange({ ...d, prevFirst: e.target.value })} />
          <Input placeholder="Previous last" value={d.prevLast} onChange={(e) => onChange({ ...d, prevLast: e.target.value })} />
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label>Nationality *</Label>
          <Input value={d.nationality} onChange={(e) => onChange({ ...d, nationality: e.target.value })} />
        </div>
        <div>
          <Label>Second nationality</Label>
          <Input value={d.secondNationality} onChange={(e) => onChange({ ...d, secondNationality: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label>DOB day *</Label>
          <Input value={d.dobDay} onChange={(e) => onChange({ ...d, dobDay: e.target.value })} maxLength={2} />
        </div>
        <div>
          <Label>Month *</Label>
          <Input value={d.dobMonth} onChange={(e) => onChange({ ...d, dobMonth: e.target.value })} maxLength={2} />
        </div>
        <div>
          <Label>Year *</Label>
          <Input value={d.dobYear} onChange={(e) => onChange({ ...d, dobYear: e.target.value })} maxLength={4} />
        </div>
      </div>
      {errors[`d${i}.dob`] && <p className="text-xs text-red-600">{errors[`d${i}.dob`]}</p>}
      <div className="space-y-2">
        <Label>Correspondence address (public)</Label>
        <p className="text-xs text-zinc-600">
          This is the director&apos;s <strong>service address</strong> and it appears on the public
          Companies House register. Many people use the registered office address to keep their home
          address private.
        </p>
        <RadioGroup
          value={d.corrType}
          onValueChange={(v) => onChange({ ...d, corrType: v as Director["corrType"] })}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="registered" id={`c${i}1`} />
            <Label htmlFor={`c${i}1`}>Same as registered office</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="other" id={`c${i}3`} />
            <Label htmlFor={`c${i}3`}>Different address</Label>
          </div>
        </RadioGroup>
        {d.corrType === "other" && (
          <AddressFields value={d.corrAddress} onChange={(a) => onChange({ ...d, corrAddress: a })} />
        )}
      </div>
      <div className="space-y-2">
        <Label>Home address (private)</Label>
        <p className="text-xs text-zinc-600">
          This is the director&apos;s <strong>residential address</strong>. It is not shown on the
          public register, but Companies House uses it for official records and identity checks.
        </p>
        <RadioGroup
          value={d.homeType}
          onValueChange={(v) => onChange({ ...d, homeType: v as "same" | "other" })}
          className="flex gap-6"
        >
          <RadioGroupItem value="same" id={`h${i}1`} />
          <Label htmlFor={`h${i}1`}>Same as correspondence</Label>
          <RadioGroupItem value="other" id={`h${i}2`} />
          <Label htmlFor={`h${i}2`}>Different</Label>
        </RadioGroup>
        {d.homeType === "other" && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4">
            <p className="mb-2 text-xs text-zinc-600">Enter the home address manually.</p>
            <AddressFields
              value={d.homeAddress}
              onChange={(a) => onChange({ ...d, homeAddress: a })}
              errors={errors}
              prefix={`hd${i}`}
            />
          </div>
        )}
      </div>
      <div>
        <Label>Country of residence *</Label>
        <Input value={d.countryResidence} onChange={(e) => onChange({ ...d, countryResidence: e.target.value })} />
      </div>
      <div>
        <Label>Email for filing reminders</Label>
        <Input type="email" value={d.emailReminders} onChange={(e) => onChange({ ...d, emailReminders: e.target.value })} />
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          id={`ag${i}`}
          checked={d.agreesDirector}
          onCheckedChange={(c) => onChange({ ...d, agreesDirector: !!c })}
        />
        <Label htmlFor={`ag${i}`} className="font-normal">
          I confirm this person agrees to become a director and lives at the home address provided *
        </Label>
      </div>
      {errors[`d${i}.agree`] && <p className="text-xs text-red-600">{errors[`d${i}.agree`]}</p>}
    </div>
  );
}

function ShareholderCard({
  sh,
  i,
  directors,
  errors,
  onChange,
  onRemove,
  canRemove,
}: {
  sh: Shareholder;
  i: number;
  directors: Director[];
  errors: Record<string, string>;
  onChange: (sh: Shareholder) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex justify-between">
        <span className="font-medium">Shareholder {i + 1}</span>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      <RadioGroup
        value={sh.kind}
        onValueChange={(v) => onChange({ ...sh, kind: v as "person" | "business" })}
        className="flex gap-4"
      >
        <label className="flex items-center gap-1 text-sm">
          <RadioGroupItem value="person" id={`sk${i}p`} />
          <span>Person</span>
        </label>
        <label className="flex items-center gap-1 text-sm">
          <RadioGroupItem value="business" id={`sk${i}b`} />
          <span>Business</span>
        </label>
      </RadioGroup>
      {sh.kind === "person" && (
        <>
          <div className="flex items-center gap-3">
            <Label className="whitespace-nowrap">Also a director?</Label>
            <RadioGroup
              value={sh.isDirector}
              onValueChange={(v) => onChange({ ...sh, isDirector: v as "yes" | "no" })}
              className="flex gap-4"
            >
              <label className="flex items-center gap-1 text-sm">
                <RadioGroupItem value="yes" id={`sd${i}y`} />
                <span>Yes</span>
              </label>
              <label className="flex items-center gap-1 text-sm">
                <RadioGroupItem value="no" id={`sd${i}n`} />
                <span>No</span>
              </label>
            </RadioGroup>
          </div>
          {sh.isDirector === "yes" ? (
            <select
              className="h-10 w-full rounded-lg border px-2"
              value={sh.directorId}
              onChange={(e) => onChange({ ...sh, directorId: e.target.value })}
            >
              <option value="">Select director</option>
              {directors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.firstName} {d.lastName}
                </option>
              ))}
            </select>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="First name *" value={sh.firstName} onChange={(e) => onChange({ ...sh, firstName: e.target.value })} />
              <Input placeholder="Last name *" value={sh.lastName} onChange={(e) => onChange({ ...sh, lastName: e.target.value })} />
            </div>
          )}
          <Label>Address (public)</Label>
          <RadioGroup
            value={sh.addrType}
            onValueChange={(v) => onChange({ ...sh, addrType: v as Shareholder["addrType"] })}
            className="space-y-1"
          >
            <label className="flex items-center gap-1 text-sm">
              <RadioGroupItem value="registered" id={`sa${i}1`} />
              <span>Same as registered office</span>
            </label>
            <label className="flex items-center gap-1 text-sm">
              <RadioGroupItem value="other" id={`sa${i}3`} />
              <span>Different address</span>
            </label>
          </RadioGroup>
          {sh.addrType === "other" && (
            <AddressFields value={sh.addr} onChange={(a) => onChange({ ...sh, addr: a })} />
          )}
        </>
      )}
      {sh.kind === "business" && (
        <>
          <Input placeholder="Business name *" value={sh.businessName} onChange={(e) => onChange({ ...sh, businessName: e.target.value })} />
          <PostcodeLookupBlock id={`ba${i}`} value={sh.businessAddress} onChange={(a) => onChange({ ...sh, businessAddress: a })} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Acting first name *" value={sh.actingFirst} onChange={(e) => onChange({ ...sh, actingFirst: e.target.value })} />
            <Input placeholder="Acting last name *" value={sh.actingLast} onChange={(e) => onChange({ ...sh, actingLast: e.target.value })} />
          </div>
        </>
      )}
    </div>
  );
}

function Step7({
  s,
  update,
  errors,
  shareholders,
}: {
  s: IncorporationState;
  update: <K extends keyof IncorporationState>(key: K, val: IncorporationState[K]) => void;
  errors: Record<string, string>;
  shareholders: Shareholder[];
}) {
  const total = shareholders.reduce((sum, sh) => sum + (s.step7.allocations[sh.id] || 0), 0);
  return (
    <section className="space-y-4 text-left">
      <Note>
        Standard setup: £1 ordinary shares, one vote each, equal dividends. You can change later with
        our help.
      </Note>
      <div className="flex items-start gap-2">
        <Checkbox
          id="std"
          checked={s.step7.standard}
          onCheckedChange={(c) => update("step7", { ...s.step7, standard: !!c })}
        />
        <Label htmlFor="std">Yes, use the standard setup</Label>
      </div>
      {!s.step7.standard && (
        <div className="space-y-2">
          <Label htmlFor="custom-shares">
            Custom share structure * <span className="font-normal text-zinc-500">(editable)</span>
          </Label>
          <Textarea
            id="custom-shares"
            rows={5}
            className="min-h-[120px] w-full border-zinc-900/20 bg-white text-zinc-900"
            placeholder="Describe share classes, nominal value per share, voting, dividends, and any special rights (e.g. Ordinary A vs B, preference shares). We will follow up if anything needs clarifying."
            value={s.step7.customShareDescription}
            onChange={(e) =>
              update("step7", { ...s.step7, customShareDescription: e.target.value })
            }
          />
          {errors.customShare && (
            <p className="text-xs text-red-600">{errors.customShare}</p>
          )}
        </div>
      )}
      <Note>Use a round number of shares (for example 1, 10, 100).</Note>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Shareholder</th>
            <th className="p-2">Shares</th>
            <th className="p-2">%</th>
          </tr>
        </thead>
        <tbody>
          {shareholders.map((sh) => {
            const name =
              sh.kind === "business"
                ? sh.businessName
                : sh.isDirector === "yes" && sh.directorId
                  ? (() => {
                      const d = s.step5.directors.find((x) => x.id === sh.directorId);
                      return d ? `${d.firstName} ${d.lastName}` : "?";
                    })()
                  : `${sh.firstName} ${sh.lastName}`;
            const n = s.step7.allocations[sh.id] || 0;
            const pct = total ? ((n / total) * 100).toFixed(1) : "0";
            return (
              <tr key={sh.id} className="border-b">
                <td className="p-2">{name || `Shareholder`}</td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    className="h-9 w-24"
                    value={s.step7.allocations[sh.id] || ""}
                    onChange={(e) =>
                      update("step7", {
                        ...s.step7,
                        allocations: {
                          ...s.step7.allocations,
                          [sh.id]: parseInt(e.target.value, 10) || 0,
                        },
                      })
                    }
                  />
                </td>
                <td className="p-2">{pct}%</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t font-semibold">
            <td className="p-2 text-right">Total</td>
            <td className="p-2">{total}</td>
            <td className="p-2">{total ? "100.0%" : "0%"}</td>
          </tr>
        </tfoot>
      </table>
      <p className="text-sm text-zinc-600">
        {total} shares total — ownership must sum to 100% across shareholders.
      </p>
      {errors.alloc && <p className="text-xs text-red-600">{errors.alloc}</p>}
      {errors.pct && <p className="text-xs text-red-600">{errors.pct}</p>}
      <div className="flex items-start gap-2">
        <Checkbox
          id="paid"
          checked={s.step7.paidFull}
          onCheckedChange={(c) => update("step7", { ...s.step7, paidFull: !!c })}
        />
        <div className="space-y-1">
          <Label htmlFor="paid">All shares paid in full</Label>
          <p className="text-xs text-zinc-600">
            Each share normally has a cost of £1 per share. Tick this if, once the company is set up,
            the people getting shares will put that full amount into the company (for example into
            the company bank account) rather than leaving any amount unpaid.
          </p>
        </div>
      </div>
    </section>
  );
}

function Step8View({
  s,
  update,
  errors,
  computePscs,
}: {
  s: IncorporationState;
  update: <K extends keyof IncorporationState>(key: K, val: IncorporationState[K]) => void;
  errors: Record<string, string>;
  computePscs: () => { id: string; name: string; pct: number; isDirector: boolean; directorId?: string }[];
}) {
  const pscs = computePscs();
  if (pscs.length === 0) {
    return (
      <section className="space-y-4 text-left">
        <p>No single person controls more than 25%.</p>
        <div className="flex items-center gap-2">
          <Checkbox
            id="nopsc"
            checked={s.step8.noPscConfirm}
            onCheckedChange={(c) => update("step8", { ...s.step8, noPscConfirm: !!c })}
          />
          <Label htmlFor="nopsc">I confirm this is correct</Label>
        </div>
        {errors.psc && <p className="text-xs text-red-600">{errors.psc}</p>}
      </section>
    );
  }
  return (
    <section className="space-y-4 text-left">
      <Note>
        Anyone with <strong>more than 25%</strong> of shares is a person with significant control
        (PSC). The percentages below are taken directly from your share allocation in the previous
        step — no need to pick bands again.
      </Note>
      <ul className="space-y-3">
        {pscs.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3"
          >
            <span className="font-medium text-zinc-900">{p.name}</span>
            <span className="text-lg font-semibold tabular-nums text-purple-700">
              {p.pct.toFixed(1)}% ownership
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-zinc-600">
        Companies House will need each PSC&apos;s personal code — directors enter theirs on the final
        step. If any PSC is not a director, we&apos;ll confirm details with you after submission.
      </p>
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
        <Checkbox
          id="psc-confirm"
          checked={s.step8.pscListConfirm}
          onCheckedChange={(c) => update("step8", { ...s.step8, pscListConfirm: !!c })}
        />
        <Label htmlFor="psc-confirm" className="font-normal leading-snug">
          I confirm these people are correct as PSCs and match the shareholdings I entered earlier
        </Label>
      </div>
      {errors.pscReview && <p className="text-xs text-red-600">{errors.pscReview}</p>}
    </section>
  );
}

function Step9Review({
  s,
  setStep,
  errors,
  update,
  onSubmit,
  submitting,
}: {
  s: IncorporationState;
  setStep: (n: number) => void;
  errors: Record<string, string>;
  update: <K extends keyof IncorporationState>(key: K, val: IncorporationState[K]) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const companyTypeSummary =
    s.step1.cic === "no" && s.step1.limitedByGuarantee === "no"
      ? "Standard private company limited by shares"
      : `CIC: ${s.step1.cic === "yes" ? "Yes" : "No"}, limited by guarantee: ${
          s.step1.limitedByGuarantee === "yes" ? "Yes" : "No"
        }`;

  const regionLabel =
    {
      EW: "England & Wales",
      S: "Scotland",
      NI: "Northern Ireland",
      W: "Wales",
    }[s.step3.region as "EW" | "S" | "NI" | "W"] || s.step3.region;

  const totalShares = s.step6.shareholders.reduce(
    (sum, sh) => sum + (s.step7.allocations[sh.id] || 0),
    0
  );

  const row = (label: string, edit: number, children: React.ReactNode) => (
    <div className="rounded-lg border p-4 text-left">
      <div className="mb-2 flex justify-between">
        <span className="font-medium">{label}</span>
        <button type="button" className="text-sm text-purple-600 underline" onClick={() => setStep(edit)}>
          Edit
        </button>
      </div>
      <div className="text-sm text-zinc-600">{children}</div>
    </div>
  );
  return (
    <section className="space-y-4">
      <div className="rounded-xl border-2 border-amber-400 bg-yellow-100 p-4 text-left ring-2 ring-yellow-200/80">
        <h3 className="font-semibold text-zinc-900">Companies House personal codes (directors)</h3>
        <p className="mt-1 text-sm text-zinc-800">
          Enter each director&apos;s 11-character code (Manage account → Companies House). You
          already entered yours at the start — re-enter each person below to confirm.
        </p>
        <div className="mt-4 space-y-3">
          {s.step5.directors.map((d) => (
            <div key={d.id}>
              <Label className="text-zinc-900">
                {d.firstName || "Director"} {d.lastName || ""} — personal code *
              </Label>
              <Input
                className="mt-1 border-amber-300 bg-white font-mono tracking-widest"
                maxLength={11}
                value={s.step9.directorPersonalCodes[d.id] || ""}
                onChange={(e) =>
                  update("step9", {
                    ...s.step9,
                    directorPersonalCodes: {
                      ...s.step9.directorPersonalCodes,
                      [d.id]: e.target.value.toUpperCase().replace(/\s/g, ""),
                    },
                  })
                }
              />
              {errors[`dc${d.id}`] && (
                <p className="text-xs text-red-700">{errors[`dc${d.id}`]}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      {row(
        "Company type",
        1,
        <p className="text-sm text-zinc-700">{companyTypeSummary}</p>
      )}
      {row("Company name", 2, (
        <p>
          {s.step2.name} {s.step2.ending}
        </p>
      ))}
      {row(
        "Registration & address",
        3,
        <>
          <p className="text-sm text-zinc-700">
            Registered in <span className="font-medium">{regionLabel}</span>
          </p>
          <div className="mt-2 text-sm text-zinc-700">
            <p className="font-medium text-zinc-900">Registered office</p>
            <p>
              {[
                s.step3.registered.line1,
                s.step3.registered.line2,
                s.step3.registered.town,
                s.step3.registered.postcode,
                s.step3.registered.country,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
          {s.step3.principal === "same" && (
            <p className="mt-1 text-sm text-zinc-700">
              Principal place of business: same as registered office
            </p>
          )}
          {s.step3.principal === "none" && (
            <p className="mt-1 text-sm text-zinc-700">
              No fixed principal place of business yet
            </p>
          )}
          {s.step3.principal === "different" && (
            <div className="mt-2 text-sm text-zinc-700">
              <p className="font-medium text-zinc-900">Principal place of business</p>
              <p>
                {[
                  s.step3.principalAddr.line1,
                  s.step3.principalAddr.line2,
                  s.step3.principalAddr.town,
                  s.step3.principalAddr.postcode,
                  s.step3.principalAddr.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          )}
          <p className="mt-2 text-sm text-zinc-700">
            Registered email: <span className="font-mono">{s.step3.registeredEmail}</span>
          </p>
        </>
      )}
      {row("About the business", 4, (
        <p>
          {s.step4.businessDescription} — SIC: {s.step4.sicCodes.map((c) => c.code).join(", ")}
        </p>
      ))}
      {row("Directors", 5, <p>{s.step5.directors.length} director(s)</p>)}
      {row("Shareholders", 6, <p>{s.step6.shareholders.length} shareholder(s)</p>)}
      {row(
        "Share structure",
        7,
        <>
          {s.step7.standard ? (
            <p>Standard £1 ordinary shares</p>
          ) : (
            <p className="whitespace-pre-wrap">{s.step7.customShareDescription || "—"}</p>
          )}
          <p className="mt-2 text-sm text-zinc-700">Total shares: {totalShares}</p>
          <ul className="mt-1 space-y-1 text-xs text-zinc-600">
            {s.step6.shareholders.map((sh) => {
              const shares = s.step7.allocations[sh.id] || 0;
              if (!shares) return null;
              const name =
                sh.kind === "business"
                  ? sh.businessName
                  : sh.isDirector === "yes" && sh.directorId
                    ? (() => {
                        const d = s.step5.directors.find((x) => x.id === sh.directorId);
                        return d ? `${d.firstName} ${d.lastName}` : "Shareholder";
                      })()
                    : `${sh.firstName} ${sh.lastName}` || "Shareholder";
              return (
                <li key={sh.id}>
                  {name}: {shares} share{shares === 1 ? "" : "s"}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {row("PSC", 8, <p>See step 8</p>)}
      <div className="space-y-3 rounded-lg border border-zinc-200 p-4 text-left">
        <div className="flex items-start gap-2">
          <Checkbox
            id="a1"
            checked={s.step9.acc1}
            onCheckedChange={(c) => update("step9", { ...s.step9, acc1: !!c, acc2: !!c, acc3: !!c })}
          />
          <Label htmlFor="a1" className="font-normal leading-snug">
            <span className="block">I confirm the information I have provided is accurate.</span>
            <span className="block">
              I understand Figures will check everything before submitting to Companies House.
            </span>
            <span className="block">
              I agree to Figures&apos; terms of engagement and identity verification.
            </span>
          </Label>
        </div>
        {errors.a1 && <p className="text-xs text-red-600">All declarations required</p>}
      </div>
    </section>
  );
}
