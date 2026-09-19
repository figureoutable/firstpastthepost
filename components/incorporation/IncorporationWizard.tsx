"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import GradientButton from "@/components/kokonutui/gradient-button";
import {
  COMPANIES_HOUSE_IDENTITY_URL,
  FIGURES_WHATSAPP_URL,
} from "@/lib/figures-config";
import { type IncorporationState, type Director, type Shareholder, initialState, newDirector, newShareholder } from "./state";
import { AddressFields, PostcodeInput, PostcodeLookupBlock } from "./AddressFields";
import sicData from "@/lib/sic-codes-data.json";

const STEPS = 9;
const RESUME_CODE_KEY = "incorporation-resume-code";
const SIC_LIST = sicData as { code: string; description: string }[];
const SIC_LOOKUP = new Map(SIC_LIST.map((r) => [r.code, r.description]));

function lookupSic(code: string) {
  const cleaned = code.replace(/\D/g, "").slice(0, 5);
  return {
    code: cleaned,
    description: cleaned.length === 5 ? SIC_LOOKUP.get(cleaned) || "" : "",
  };
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-none border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-stone-800">
      {children}
    </p>
  );
}

function persistResumeCode(code: string) {
  try {
    sessionStorage.setItem(RESUME_CODE_KEY, code);
  } catch {
    /* ignore */
  }
}

function readResumeCode(): string {
  try {
    return sessionStorage.getItem(RESUME_CODE_KEY) || "";
  } catch {
    return "";
  }
}

export function IncorporationWizard() {
  const [phase, setPhase] = useState<"banner" | "form">("banner");
  const [step, setStep] = useState(1);
  const [s, setS] = useState<IncorporationState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step1Blocked, setStep1Blocked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resumeCode, setResumeCode] = useState("");
  const [resumeInput, setResumeInput] = useState("");
  const [bannerError, setBannerError] = useState("");
  const [starting, setStarting] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const skipNextAutosave = useRef(false);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const code = readResumeCode();
      if (!code) {
        if (!cancelled) setHydrating(false);
        return;
      }
      try {
        const res = await fetch(`/api/incorporation/draft?code=${encodeURIComponent(code)}`);
        if (!res.ok) {
          if (!cancelled) setHydrating(false);
          return;
        }
        const draft = await res.json();
        if (cancelled) return;
        skipNextAutosave.current = true;
        setResumeCode(draft.code);
        setS(draft.state);
        setStep(draft.step || 1);
        setPhase(draft.phase === "form" ? "form" : "banner");
        persistResumeCode(draft.code);
      } catch {
        /* keep banner */
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!resumeCode || phase !== "form" || submitted || hydrating) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetch("/api/incorporation/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: resumeCode, step, phase, state: s }),
      }).catch(() => {
        /* silent autosave failure */
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [resumeCode, step, phase, s, submitted, hydrating]);

  const applyDraft = useCallback((draft: {
    code: string;
    step: number;
    phase: "banner" | "form";
    state: IncorporationState;
  }) => {
    skipNextAutosave.current = true;
    setResumeCode(draft.code);
    persistResumeCode(draft.code);
    setS(draft.state);
    setStep(draft.step || 1);
    setPhase("form");
    setErrors({});
    setStep1Blocked(false);
    setBannerError("");
  }, []);

  const handleStart = async () => {
    setBannerError("");
    setStarting(true);
    try {
      const res = await fetch("/api/incorporation/draft", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.code) {
        setBannerError(data.error || "Could not create a resume code. Please try again.");
        return;
      }
      skipNextAutosave.current = true;
      setResumeCode(data.code);
      persistResumeCode(data.code);
      setS(initialState());
      setStep(1);
      setPhase("form");
    } catch {
      setBannerError("Could not create a resume code. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const handleResume = async () => {
    setBannerError("");
    const code = resumeInput.trim().toUpperCase();
    if (!code) {
      setBannerError("Enter your resume code.");
      return;
    }
    setResuming(true);
    try {
      const res = await fetch(`/api/incorporation/draft?code=${encodeURIComponent(code)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBannerError(data.error || "No draft found for that code.");
        return;
      }
      applyDraft(data);
    } catch {
      setBannerError("Could not load your draft. Please try again.");
    } finally {
      setResuming(false);
    }
  };

  const copyResumeCode = async () => {
    if (!resumeCode) return;
    try {
      await navigator.clipboard.writeText(resumeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

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
        if (!s.step3.region) e.region = "Select where to register";
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
        if (s.step4.sicCodes.filter((c) => c.code.length === 5).length < 1)
          e.sic = "Enter at least one SIC code";
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
          if (code.length !== 11) e[`dc${d.id}`] = "Must be exactly 11 characters";
          else if (!/^[A-Z0-9]{11}$/.test(code)) e[`dc${d.id}`] = "Letters and numbers only";
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

  const canProceed = Object.keys(validateStep(step)).length === 0;

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

  const setSicSlot = (index: number, raw: string) => {
    const slots = [0, 1, 2, 3].map(
      (i) => s.step4.sicCodes[i] ?? { code: "", description: "" }
    );
    slots[index] = lookupSic(raw);
    update("step4", { ...s.step4, sicCodes: slots });
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
        step4: {
          ...s.step4,
          sicCodes: s.step4.sicCodes.filter((c) => c.code.length === 5),
        },
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
      try {
        sessionStorage.removeItem(RESUME_CODE_KEY);
      } catch {
        /* ignore */
      }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = phase === "banner" ? 0 : Math.round((step / STEPS) * 100);

  if (hydrating) {
    return (
      <div className="mx-auto max-w-2xl rounded-none border border-stone-200 bg-card p-6 text-center text-sm text-stone-600 md:p-10">
        Loading your saved progress…
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-card p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">Thank you</h2>
        <p className="mt-4 text-sm text-stone-600">
          We have received your incorporation request. The Figures team will be in touch shortly.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-forest-600 underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (phase === "banner") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 rounded-none border border-stone-200 bg-card p-6 md:p-10">
        <h1 className="text-2xl font-semibold text-stone-900">Company Incorporation</h1>
        <div className="space-y-4 text-sm text-stone-700 leading-relaxed">
          <p>
            This form takes approximately 25-30 minutes to complete. Your progress{" "}
            <span className="font-semibold text-stone-900">saves automatically</span>, and you will
            get a short resume code so you can continue later on any device.
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
              className="font-bold text-red-600 underline"
            >
              Verify your identity here
            </a>
          </p>
          <p>
            If you have any questions at any point, take a screenshot and send it to us on{" "}
            <span className="font-medium text-stone-900">WhatsApp</span>.
          </p>
        </div>
        <div className="rounded-none border-2 border-amber-400 bg-yellow-100 px-3 py-2">
          <p className="text-sm text-stone-800">
            Only proceed if you have the Companies House personal codes for all directors and any
            non-director PSCs.
          </p>
        </div>

        {bannerError && (
          <p className="rounded-none border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {bannerError}
          </p>
        )}

        <Button className="w-full sm:w-auto" onClick={handleStart} disabled={starting || resuming}>
          {starting ? "Starting…" : "Start"}
        </Button>

        <div className="space-y-3 border-t border-stone-200 pt-6">
          <Label htmlFor="resume-code" className="text-stone-900">
            Already started? Resume with your code
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="resume-code"
              value={resumeInput}
              onChange={(e) =>
                setResumeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))
              }
              placeholder="e.g. AB3K7MPQ"
              className="font-mono tracking-wider uppercase sm:max-w-xs"
              maxLength={8}
              disabled={starting || resuming}
            />
            <Button
              variant="outline"
              onClick={handleResume}
              disabled={starting || resuming}
              className="border-stone-300"
            >
              {resuming ? "Loading…" : "Resume"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step1Blocked) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-card p-8 text-center">
        <p className="text-stone-800">
          Thank you - one of our team will be in touch shortly to discuss the right structure for
          you.
        </p>
        <Link href="/" className="mt-6 inline-block text-forest-600 underline">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24">
      <div className="sticky top-0 z-10 -mx-4 space-y-2 border-b border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur">
        {resumeCode && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-none border border-clay-200 bg-clay-50 px-3 py-2">
            <div className="min-w-0 text-xs text-stone-700 sm:text-sm">
              <span className="font-medium text-stone-900">Resume code: </span>
              <span className="font-mono tracking-wider text-clay-800">{resumeCode}</span>
              <span className="mt-0.5 block text-stone-500 sm:mt-0 sm:ml-2 sm:inline">
                Keep this code to continue later on any device.
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyResumeCode}
              className="h-8 shrink-0 border-stone-300 bg-white px-2.5"
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                </>
              )}
            </Button>
          </div>
        )}
        <div className="mb-2 flex justify-between text-xs text-stone-500">
          <span>
            Step {step} of {STEPS}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-none bg-stone-200">
          <div
            className="h-full rounded-none bg-clay-500 transition-all"
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Label>Is this a Community Interest Company?</Label>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
              {(["yes", "no"] as const).map((value) => {
                const selected = s.step1.cic === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update("step1", { ...s.step1, cic: value })}
                    className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                      selected
                        ? "border-clay-500 bg-clay-50 text-clay-800"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Label>
              Will the company be limited by guarantee rather than shares? (typically charities)
            </Label>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
              {(["yes", "no"] as const).map((value) => {
                const selected = s.step1.limitedByGuarantee === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      update("step1", { ...s.step1, limitedByGuarantee: value })
                    }
                    className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                      selected
                        ? "border-clay-500 bg-clay-50 text-clay-800"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-stretch">
            <div className="sm:col-span-2">
              <Note>
                Your company name must be unique on the Companies House register. Use the tools
                below to check availability before you fill in this section.
              </Note>
            </div>
            <a
              href="https://find-and-update.company-information.service.gov.uk/company-name-availability"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-full items-center justify-center rounded-none border border-clay-500 bg-clay-500 px-3 py-2 text-center text-sm font-medium text-white transition hover:border-clay-600 hover:bg-clay-600"
            >
              Check name availability on Companies House
            </a>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start">
            <div className="space-y-1">
              <Label>Proposed company name *</Label>
              <Input
                value={s.step2.name}
                onChange={(e) => update("step2", { ...s.step2, name: e.target.value })}
              />
              <p className="text-xs text-stone-500">Do not include Limited or Ltd - we add it for you.</p>
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </div>
            <div className="space-y-1">
              <Label>Preferred ending</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["Limited", "Ltd"] as const).map((ending) => {
                  const selected = s.step2.ending === ending;
                  return (
                    <button
                      key={ending}
                      type="button"
                      onClick={() => update("step2", { ...s.step2, ending })}
                      className={`flex h-12 items-center justify-center rounded-none border text-sm font-medium transition ${
                        selected
                          ? "border-clay-500 bg-clay-50 text-clay-800"
                          : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                      }`}
                    >
                      {ending}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <Label className="min-w-0 flex-1 font-normal leading-tight">
              I have checked and confirmed this name is available *
            </Label>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
              {(["yes", "no"] as const).map((value) => {
                const selected = (s.step2.confirmedAvailable ? "yes" : "no") === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      update("step2", {
                        ...s.step2,
                        confirmedAvailable: value === "yes",
                      })
                    }
                    className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                      selected
                        ? "border-clay-500 bg-clay-50 text-clay-800"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
          {errors.confirmed && <p className="text-xs text-red-600">{errors.confirmed}</p>}
        </section>
      )}

      {step === 3 && (
        <section className="space-y-6">
          <Note>
            Your registered office address will be visible to the public. We recommend using a
            non-home address to keep your home address private. This is also where HMRC will send
            your company tax reference.
          </Note>
          <div className="space-y-2">
            <Label>Where to register</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["EW", "England & Wales"],
                  ["S", "Scotland"],
                  ["NI", "Northern Ireland"],
                  ["W", "Wales"],
                ] as const
              ).map(([k, lab]) => {
                const selected = s.step3.region === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() =>
                      update("step3", {
                        ...s.step3,
                        region: k,
                      })
                    }
                    className={`flex min-h-12 items-center justify-center rounded-none border px-3 py-2 text-center text-sm font-medium transition ${
                      selected
                        ? "border-clay-500 bg-clay-50 text-clay-800"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    {lab}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-none border border-stone-200 bg-stone-50/70 p-4">
            <p className="mb-2 text-xs text-stone-500">
              Enter the registered office address manually - this will appear on the public register.
            </p>
            <AddressFields
              value={s.step3.registered}
              onChange={(a) => update("step3", { ...s.step3, registered: a })}
              errors={errors}
              prefix="reg"
            />
          </div>
          <div className="space-y-4">
            <Label>Principal place of business</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  ["same", "Same as registered office"],
                  ["different", "A different address"],
                  ["none", "No fixed place of business yet"],
                ] as const
              ).map(([value, label]) => {
                const selected = s.step3.principal === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      update("step3", {
                        ...s.step3,
                        principal: value,
                      })
                    }
                    className={`flex min-h-12 items-center justify-center rounded-none border px-3 py-2 text-center text-sm font-medium transition ${
                      selected
                        ? "border-clay-500 bg-clay-50 text-clay-800"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {s.step3.principal === "different" && (
            <div className="rounded-none border border-stone-200 bg-stone-50/70 p-4">
              <p className="mb-2 text-xs text-stone-500">
                Enter the address manually - this is where day-to-day business will happen.
              </p>
              <AddressFields
                value={s.step3.principalAddr}
                onChange={(a) => update("step3", { ...s.step3, principalAddr: a })}
                errors={errors}
                prefix="pri"
              />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Registered email address *</Label>
              <Input
                type="email"
                placeholder="Used for Companies House notices. Not shown publicly."
                value={s.step3.registeredEmail}
                onChange={(e) => update("step3", { ...s.step3, registeredEmail: e.target.value })}
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>HMRC contact phone (optional)</Label>
              <Input
                placeholder="Only if HMRC has Corporation Tax questions."
                value={s.step3.hmrcPhone}
                onChange={(e) => update("step3", { ...s.step3, hmrcPhone: e.target.value })}
              />
            </div>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-6 text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Label>Is this company replacing an existing business?</Label>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
              {(["yes", "no"] as const).map((value) => {
                const selected = s.step4.replacing === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update("step4", { ...s.step4, replacing: value })}
                    className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                      selected
                        ? "border-clay-500 bg-clay-50 text-clay-800"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
          {s.step4.replacing === "yes" && (
            <div className="space-y-3 rounded-lg border p-4">
              <Input
                placeholder="Name of previous business *"
                value={s.step4.prevBusinessName}
                onChange={(e) => update("step4", { ...s.step4, prevBusinessName: e.target.value })}
              />
              {errors.prevName && <p className="text-xs text-red-600">{errors.prevName}</p>}
              <div className="rounded-lg border border-stone-200 bg-stone-50/70 p-4">
                <p className="mb-2 text-xs text-stone-600">
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
          <div className="space-y-3">
            <Label>When will the company start trading?</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["now", "Straight away"],
                  ["date", "On a specific date"],
                ] as const
              ).map(([value, label]) => {
                const selected = s.step4.trading === value;
                const boxClass = `relative flex min-h-12 items-center justify-center rounded-none border px-3 py-2 text-center text-sm font-medium transition ${
                  selected
                    ? "border-clay-500 bg-clay-50 text-clay-800"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                }`;

                if (value === "date") {
                  const display = s.step4.tradingDate
                    ? new Date(`${s.step4.tradingDate}T00:00:00`).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : label;
                  return (
                    <label key={value} className={`${boxClass} cursor-pointer`}>
                      <span>{display}</span>
                      <input
                        type="date"
                        value={s.step4.tradingDate}
                        onChange={(e) =>
                          update("step4", {
                            ...s.step4,
                            trading: "date",
                            tradingDate: e.target.value,
                          })
                        }
                        onFocus={() =>
                          update("step4", {
                            ...s.step4,
                            trading: "date",
                          })
                        }
                        onClick={(e) => {
                          update("step4", {
                            ...s.step4,
                            trading: "date",
                          });
                          const el = e.currentTarget;
                          try {
                            el.showPicker?.();
                          } catch {
                            /* unsupported browsers fall back to native control */
                          }
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  );
                }

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      update("step4", {
                        ...s.step4,
                        trading: value,
                      })
                    }
                    className={boxClass}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {errors.tradeDate && <p className="text-xs text-red-600">{errors.tradeDate}</p>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1 space-y-2">
              <Label className="font-medium">
                In the first 3 months, will any of these apply to the company?
              </Label>
              <p className="max-w-xl text-xs leading-relaxed text-stone-600">
                This includes paying interest on loans from directors, paying royalties (for example
                for using someone else&apos;s brand or content), or receiving income from overseas
                investments.
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
              {(["yes", "no"] as const).map((value) => {
                const selected = s.step4.loansOverseas === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update("step4", { ...s.step4, loansOverseas: value })}
                    className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                      selected
                        ? "border-clay-500 bg-clay-50 text-clay-800"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1 space-y-2">
              <Label className="font-medium">
                Has anyone on this application already asked Companies House to keep their personal
                details off the public register?
              </Label>
              <p className="max-w-xl text-xs leading-relaxed text-stone-600">
                This is usually only used where someone is at risk of harm and has applied directly to
                Companies House for extra privacy.
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
              {(["yes", "no"] as const).map((value) => {
                const selected = s.step4.protectedDetails === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update("step4", { ...s.step4, protectedDetails: value })}
                    className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                      selected
                        ? "border-clay-500 bg-clay-50 text-clay-800"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-none border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-stone-800 space-y-2">
            <p className="font-semibold text-stone-900">SIC codes - what to do</p>
            <ol className="list-decimal list-inside space-y-1 font-normal text-stone-700 leading-relaxed">
              <li>
                Open the Companies House SIC list, find the codes that match your business, and note
                them down.
              </li>
              <li>
                Enter up to 4 SIC codes below. You need at least one before you can continue.
              </li>
            </ol>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <Label>Enter your SIC codes *</Label>
                <a
                  href="https://resources.companieshouse.gov.uk/sic/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center rounded-none border border-clay-500 bg-clay-500 px-4 py-2 text-center text-sm font-medium text-white transition hover:border-clay-600 hover:bg-clay-600"
                >
                  Open Companies House SIC list
                </a>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => {
                  const slot = s.step4.sicCodes[i] ?? { code: "", description: "" };
                  return (
                    <div key={i} className="space-y-1">
                      <Input
                        inputMode="numeric"
                        maxLength={5}
                        placeholder={`SIC code ${i + 1}${i === 0 ? " *" : " (optional)"}`}
                        value={slot.code}
                        onChange={(e) => setSicSlot(i, e.target.value)}
                      />
                      {slot.code.length === 5 && (
                        <p
                          className={`text-xs ${
                            slot.description ? "text-stone-600" : "text-amber-700"
                          }`}
                        >
                          {slot.description ||
                            "Code not found — double-check on the Companies House list"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-sm font-medium text-stone-700">
              Entered: {s.step4.sicCodes.filter((c) => c.code.length === 5).length} of 4 (minimum 1
              to continue)
            </p>
            {errors.sic && <p className="text-xs text-red-600">{errors.sic}</p>}
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="space-y-6 text-left">
          <Note>
            Correspondence address is public on the register - many people use the registered office
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

      <div className="fixed bottom-0 left-0 right-0 flex gap-3 border-t border-stone-200 bg-card/95 p-4 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <GradientButton type="button" appearance="outline" className="flex-1 md:flex-none" onClick={back}>
          <ArrowLeft className="h-4 w-4" /> Back
        </GradientButton>
        {step < STEPS ? (
          <GradientButton
            type="button"
            className="flex-1 md:flex-none"
            disabled={!canProceed}
            title={!canProceed ? "Complete all required fields on this step" : undefined}
            onClick={next}
          >
            Next <ArrowRight className="h-4 w-4" />
          </GradientButton>
        ) : (
          <GradientButton
            type="button"
            className="flex-1 md:flex-none"
            disabled={submitting || !canProceed}
            loading={submitting}
            title={!canProceed ? "Complete all required fields on this step" : undefined}
            onClick={submit}
          >
            Submit incorporation request <ArrowRight className="h-4 w-4" />
          </GradientButton>
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
    <div className="space-y-3 rounded-none border border-stone-200 p-4">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Label className="min-w-0 flex-1">Different name in last 20 years?</Label>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
          {(["yes", "no"] as const).map((value) => {
            const selected = d.differentName === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ ...d, differentName: value })}
                className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                  selected
                    ? "border-clay-500 bg-clay-50 text-clay-800"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
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
          <Label>Date of birth *</Label>
          <div className="grid grid-cols-3 gap-2">
            <select
              className="flex h-12 w-full rounded-none border border-stone-200 bg-card px-2 text-sm text-stone-700 focus-visible:border-clay-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20"
              value={d.dobDay}
              onChange={(e) => onChange({ ...d, dobDay: e.target.value })}
            >
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, n) => {
                const v = String(n + 1).padStart(2, "0");
                return (
                  <option key={v} value={v}>
                    {n + 1}
                  </option>
                );
              })}
            </select>
            <select
              className="flex h-12 w-full rounded-none border border-stone-200 bg-card px-2 text-sm text-stone-700 focus-visible:border-clay-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20"
              value={d.dobMonth}
              onChange={(e) => onChange({ ...d, dobMonth: e.target.value })}
            >
              <option value="">Month</option>
              {[
                ["01", "Jan"],
                ["02", "Feb"],
                ["03", "Mar"],
                ["04", "Apr"],
                ["05", "May"],
                ["06", "Jun"],
                ["07", "Jul"],
                ["08", "Aug"],
                ["09", "Sep"],
                ["10", "Oct"],
                ["11", "Nov"],
                ["12", "Dec"],
              ].map(([v, lab]) => (
                <option key={v} value={v}>
                  {lab}
                </option>
              ))}
            </select>
            <select
              className="flex h-12 w-full rounded-none border border-stone-200 bg-card px-2 text-sm text-stone-700 focus-visible:border-clay-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20"
              value={d.dobYear}
              onChange={(e) => onChange({ ...d, dobYear: e.target.value })}
            >
              <option value="">Year</option>
              {Array.from({ length: 100 }, (_, n) => {
                const y = String(new Date().getFullYear() - 16 - n);
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>
          {errors[`d${i}.dob`] && <p className="text-xs text-red-600">{errors[`d${i}.dob`]}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-2">
          <Label>Correspondence address (public)</Label>
          <p className="text-xs leading-relaxed text-stone-600">
            This is the director&apos;s service address and appears on the public Companies House
            register. Many use the registered office address instead to keep their home address
            private.
          </p>
        </div>
        <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:w-72">
          {(
            [
              ["registered", "Same as registered office"],
              ["other", "Different address"],
            ] as const
          ).map(([value, label]) => {
            const selected = d.corrType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ ...d, corrType: value })}
                className={`flex min-h-10 items-center justify-center rounded-none border px-2 py-2 text-center text-xs font-medium transition sm:text-sm ${
                  selected
                    ? "border-clay-500 bg-clay-50 text-clay-800"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      {d.corrType === "other" && (
        <AddressFields value={d.corrAddress} onChange={(a) => onChange({ ...d, corrAddress: a })} />
      )}
      <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-2">
          <Label>Home address (private)</Label>
          <p className="text-xs leading-relaxed text-stone-600">
            This is the director&apos;s residential address. It is not shown on the public register,
            but Companies House uses it for official records and identity checks.
          </p>
        </div>
        <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:w-72">
          {(
            [
              ["same", "Same as correspondence"],
              ["other", "Different"],
            ] as const
          ).map(([value, label]) => {
            const selected = d.homeType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ ...d, homeType: value })}
                className={`flex min-h-10 items-center justify-center rounded-none border px-2 py-2 text-center text-xs font-medium transition sm:text-sm ${
                  selected
                    ? "border-clay-500 bg-clay-50 text-clay-800"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      {d.homeType === "other" && (
        <div className="rounded-none border border-stone-200 bg-stone-50/70 p-4">
          <p className="mb-2 text-xs text-stone-600">Enter the home address manually.</p>
          <AddressFields
            value={d.homeAddress}
            onChange={(a) => onChange({ ...d, homeAddress: a })}
            errors={errors}
            prefix={`hd${i}`}
          />
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label>Country of residence *</Label>
          <Input value={d.countryResidence} onChange={(e) => onChange({ ...d, countryResidence: e.target.value })} />
        </div>
        <div>
          <Label>Email for filing reminders</Label>
          <Input type="email" value={d.emailReminders} onChange={(e) => onChange({ ...d, emailReminders: e.target.value })} />
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <Label className="min-w-0 flex-1 font-normal leading-snug">
          I confirm this person agrees to become a director and lives at the home address provided *
        </Label>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
          {(["yes", "no"] as const).map((value) => {
            const selected = (d.agreesDirector ? "yes" : "no") === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ ...d, agreesDirector: value === "yes" })}
                className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                  selected
                    ? "border-clay-500 bg-clay-50 text-clay-800"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
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
    <div className="space-y-3 rounded-none border border-stone-200 p-4">
      <div className="flex justify-between">
        <span className="font-medium">Shareholder {i + 1}</span>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
        {(
          [
            ["person", "Person"],
            ["business", "Business"],
          ] as const
        ).map(([value, label]) => {
          const selected = sh.kind === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ...sh, kind: value })}
              className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium transition ${
                selected
                  ? "border-clay-500 bg-clay-50 text-clay-800"
                  : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {sh.kind === "person" && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Label>Also a director?</Label>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
              {(["yes", "no"] as const).map((value) => {
                const selected = sh.isDirector === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onChange({ ...sh, isDirector: value })}
                    className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                      selected
                        ? "border-clay-500 bg-clay-50 text-clay-800"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
          {sh.isDirector === "yes" ? (
            <select
              className="h-12 w-full rounded-none border border-stone-200 bg-card px-3 text-sm text-stone-700"
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <Label>Address (public)</Label>
            <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:w-72">
              {(
                [
                  ["registered", "Same as registered office"],
                  ["other", "Different address"],
                ] as const
              ).map(([value, label]) => {
                const selected = sh.addrType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onChange({ ...sh, addrType: value })}
                    className={`flex min-h-10 items-center justify-center rounded-none border px-2 py-2 text-center text-xs font-medium transition sm:text-sm ${
                      selected
                        ? "border-clay-500 bg-clay-50 text-clay-800"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
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
        Standard setup: £1 ordinary shares, one vote each, equal dividends.
        <br />
        Use a round number of shares (for example 1, 10, 100).
      </Note>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Label>Use standard setup</Label>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
          {(["yes", "no"] as const).map((value) => {
            const selected = (s.step7.standard ? "yes" : "no") === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  update("step7", { ...s.step7, standard: value === "yes" })
                }
                className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                  selected
                    ? "border-clay-500 bg-clay-50 text-clay-800"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>
      {!s.step7.standard && (
        <p className="rounded-none border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-stone-800">
          Please email us at{" "}
          <a
            href="mailto:joshua@tryfigures.com"
            className="font-medium text-clay-700 underline"
          >
            joshua@tryfigures.com
          </a>{" "}
          and we&apos;ll help set up a custom share structure.
        </p>
      )}
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 pl-0 pr-2 text-left">Shareholder</th>
            <th className="w-32 p-2 pr-10 text-right">Shares</th>
            <th className="w-24 p-2 pr-6 text-right">%</th>
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
                <td className="py-2 pl-0 pr-2">{name || `Shareholder`}</td>
                <td className="w-32 p-2 pr-10">
                  <div className="flex justify-end">
                    <Input
                      type="number"
                      min={0}
                      className="h-9 w-20 px-3 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                  </div>
                </td>
                <td className="w-24 p-2 pr-6 text-right">{pct}%</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t font-semibold">
            <td className="py-2 pl-0 pr-2 text-right">Total</td>
            <td className="w-32 p-2 pr-10">
              <div className="flex justify-end">
                <span className="inline-flex h-9 w-20 items-center justify-end px-3 tabular-nums">
                  {total}
                </span>
              </div>
            </td>
            <td className="w-24 p-2 pr-6 text-right">{total ? "100.0%" : "0%"}</td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-8 text-sm text-stone-600">
        {total} shares total - ownership must sum to 100% across shareholders.
      </p>
      {errors.alloc && <p className="text-xs text-red-600">{errors.alloc}</p>}
      {errors.pct && <p className="text-xs text-red-600">{errors.pct}</p>}
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
      <p className="text-sm leading-relaxed text-stone-700">
        Anyone with <strong>more than 25%</strong> of shares is a person with significant control
        (PSC). The percentages below are taken directly from your share allocation in the previous
        step - no need to pick bands again.
      </p>
      <ul className="space-y-3">
        {pscs.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-none border border-stone-200 bg-stone-50/80 px-4 py-3"
          >
            <span className="font-medium text-stone-900">{p.name}</span>
            <span className="text-lg font-semibold tabular-nums text-stone-900">
              {p.pct.toFixed(1)}% ownership
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-stone-600">
        Companies House will need each PSC&apos;s personal code - directors enter theirs on the final
        step. If any PSC is not a director, we&apos;ll confirm details with you after submission.
      </p>
      <div className="flex flex-col gap-3 rounded-none border border-amber-200 bg-amber-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <Label className="min-w-0 flex-1 font-normal leading-snug text-stone-800">
          I confirm these people are correct as PSCs and match the shareholdings I entered earlier
        </Label>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
          {(["yes", "no"] as const).map((value) => {
            const selected = (s.step8.pscListConfirm ? "yes" : "no") === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  update("step8", { ...s.step8, pscListConfirm: value === "yes" })
                }
                className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                  selected
                    ? "border-clay-500 bg-clay-50 text-clay-800"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
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
    <div className="rounded-none border border-stone-200 p-4 text-left">
      <div className="mb-2 flex justify-between">
        <span className="font-medium">{label}</span>
        <button type="button" className="text-sm text-forest-600 underline" onClick={() => setStep(edit)}>
          Edit
        </button>
      </div>
      <div className="text-sm text-stone-600">{children}</div>
    </div>
  );
  return (
    <section className="space-y-4">
      <div className="rounded-none border-2 border-amber-400 bg-yellow-100 p-4 text-left">
        <h3 className="font-semibold text-stone-900">Companies House personal codes (directors)</h3>
        <p className="mt-1 text-sm text-stone-800">
          Enter each director&apos;s 11-character code (Manage account → Companies House). You
          already entered yours at the start - re-enter each person below to confirm.
        </p>
        <div className="mt-4 space-y-3">
          {s.step5.directors.map((d) => (
            <div key={d.id}>
              <Label className="text-stone-900">
                {d.firstName || "Director"} {d.lastName || ""} - personal code *
              </Label>
              <Input
                className="mt-1 border-amber-300 bg-card font-mono tracking-widest"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                maxLength={11}
                minLength={11}
                placeholder="11 characters"
                value={s.step9.directorPersonalCodes[d.id] || ""}
                onChange={(e) =>
                  update("step9", {
                    ...s.step9,
                    directorPersonalCodes: {
                      ...s.step9.directorPersonalCodes,
                      [d.id]: e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 11),
                    },
                  })
                }
              />
              {(s.step9.directorPersonalCodes[d.id] || "").length > 0 &&
                (s.step9.directorPersonalCodes[d.id] || "").length !== 11 && (
                  <p className="text-xs text-amber-800">
                    {(s.step9.directorPersonalCodes[d.id] || "").length}/11 characters — must be
                    exactly 11
                  </p>
                )}
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
        <p className="text-sm text-stone-700">{companyTypeSummary}</p>
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
          <p className="text-sm text-stone-700">
            Registered in <span className="font-medium">{regionLabel}</span>
          </p>
          <div className="mt-2 text-sm text-stone-700">
            <p className="font-medium text-stone-900">Registered office</p>
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
            <p className="mt-1 text-sm text-stone-700">
              Principal place of business: same as registered office
            </p>
          )}
          {s.step3.principal === "none" && (
            <p className="mt-1 text-sm text-stone-700">
              No fixed principal place of business yet
            </p>
          )}
          {s.step3.principal === "different" && (
            <div className="mt-2 text-sm text-stone-700">
              <p className="font-medium text-stone-900">Principal place of business</p>
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
          <p className="mt-2 text-sm text-stone-700">
            Registered email: <span className="font-mono">{s.step3.registeredEmail}</span>
          </p>
        </>
      )}
      {row("About the business", 4, (
        <p>
          SIC:{" "}
          {s.step4.sicCodes
            .filter((c) => c.code.length === 5)
            .map((c) => c.code)
            .join(", ") || "—"}
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
            <p className="whitespace-pre-wrap">{s.step7.customShareDescription || "-"}</p>
          )}
          <p className="mt-2 text-sm text-stone-700">Total shares: {totalShares}</p>
          <ul className="mt-1 space-y-1 text-xs text-stone-600">
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
      <div className="flex flex-col gap-3 rounded-none border border-stone-200 p-4 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <Label className="min-w-0 flex-1 font-normal leading-snug text-stone-800">
          <span className="block">I confirm the information I have provided is accurate.</span>
          <span className="block">
            I understand Figures will check everything before submitting to Companies House.
          </span>
          <span className="block">
            I agree to Figures&apos; terms of engagement and identity verification.
          </span>
        </Label>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-44">
          {(["yes", "no"] as const).map((value) => {
            const selected = (s.step9.acc1 ? "yes" : "no") === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  const on = value === "yes";
                  update("step9", { ...s.step9, acc1: on, acc2: on, acc3: on });
                }}
                className={`flex h-10 items-center justify-center rounded-none border text-sm font-medium capitalize transition ${
                  selected
                    ? "border-clay-500 bg-clay-50 text-clay-800"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>
      {errors.a1 && <p className="text-xs text-red-600">All declarations required</p>}
    </section>
  );
}
