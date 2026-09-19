"use client";

import { useMemo, useState } from "react";
import { FileSignature, Plus, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/venture/page-header";
import { ModuleIntro } from "@/components/venture/module-intro";
import { FormSection, FormSubGroup } from "@/components/venture/form-section";
import { SummaryRow } from "@/components/venture/summary-row";
import { StubAction } from "@/components/venture/stub-action";
import { StatusPill } from "@/components/venture/status-pill";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import GradientButton from "@/components/kokonutui/gradient-button";
import { useVenture, genId } from "@/lib/venture/store";
import { getSafeStatus } from "@/lib/venture/status";
import type { SafeInstrument } from "@/lib/venture/types";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-GB");
}

function parseThousands(formatted: string): string {
  return formatted.replace(/,/g, "");
}

const EMPTY_DRAFT = {
  investorName: "",
  subscriberAddress: "",
  companyName: "MoonShot AI",
  companyNumber: "14827391",
  companyRegisteredOffice: "71-75 Shelton Street, London WC2H 9JQ",
  amount: "",
  financingRoundThreshold: "500000",
  discountRate: "20",
  valuationCap: "",
  longstopDate: "",
  bankName: "",
  bankAccountName: "MoonShot AI Ltd",
  bankAccountNumber: "",
  bankSortCode: "",
  companySignatoryName: "",
  companySignatoryCapacity: "Director",
  companySignatoryDate: "",
  subscriberSignatoryName: "",
  subscriberSignatoryCapacity: "",
  subscriberSignatoryDate: "",
  agreementDate: "",
};

export default function SafePage() {
  const { state, setState } = useVenture();
  const status = getSafeStatus(state);
  const instruments = state.safe.instruments;
  const totalOutstanding = instruments
    .filter((i) => i.status === "outstanding")
    .reduce((sum, i) => sum + i.amount, 0);

  const [view, setView] = useState<"list" | "form" | "preview">("list");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const update = <K extends keyof typeof EMPTY_DRAFT>(key: K, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const illustrativePreMoney = useMemo(() => {
    const cap = Number(draft.valuationCap);
    const discount = Number(draft.discountRate);
    if (!(cap > 0) || !(discount >= 0) || discount >= 100) return null;
    return cap / (1 - discount / 100);
  }, [draft.valuationCap, draft.discountRate]);

  const canSubmit =
    draft.investorName.trim().length > 0 &&
    draft.subscriberAddress.trim().length > 0 &&
    draft.companyName.trim().length > 0 &&
    draft.companyNumber.trim().length > 0 &&
    draft.companyRegisteredOffice.trim().length > 0 &&
    Number(draft.amount) > 0 &&
    Number(draft.financingRoundThreshold) > 0 &&
    Number(draft.discountRate) >= 0 &&
    Number(draft.valuationCap) > 0 &&
    draft.longstopDate.length > 0 &&
    draft.bankName.trim().length > 0 &&
    draft.bankAccountName.trim().length > 0 &&
    draft.bankAccountNumber.trim().length > 0 &&
    draft.bankSortCode.trim().length > 0 &&
    draft.companySignatoryName.trim().length > 0 &&
    draft.companySignatoryCapacity.trim().length > 0 &&
    draft.companySignatoryDate.length > 0 &&
    draft.subscriberSignatoryName.trim().length > 0 &&
    draft.subscriberSignatoryCapacity.trim().length > 0 &&
    draft.subscriberSignatoryDate.length > 0 &&
    draft.agreementDate.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const instrument: SafeInstrument = {
      id: genId("safe"),
      investorName: draft.investorName.trim(),
      subscriberAddress: draft.subscriberAddress.trim(),
      companyName: draft.companyName.trim(),
      companyNumber: draft.companyNumber.trim(),
      companyRegisteredOffice: draft.companyRegisteredOffice.trim(),
      amount: Number(draft.amount),
      financingRoundThreshold: Number(draft.financingRoundThreshold),
      discountRate: Number(draft.discountRate),
      valuationCap: Number(draft.valuationCap),
      longstopDate: new Date(draft.longstopDate).toISOString(),
      bankName: draft.bankName.trim(),
      bankAccountName: draft.bankAccountName.trim(),
      bankAccountNumber: draft.bankAccountNumber.trim(),
      bankSortCode: draft.bankSortCode.trim(),
      companySignatoryName: draft.companySignatoryName.trim(),
      companySignatoryCapacity: draft.companySignatoryCapacity.trim(),
      companySignatoryDate: draft.companySignatoryDate,
      subscriberSignatoryName: draft.subscriberSignatoryName.trim(),
      subscriberSignatoryCapacity: draft.subscriberSignatoryCapacity.trim(),
      subscriberSignatoryDate: draft.subscriberSignatoryDate,
      agreementDate: draft.agreementDate,
      status: "outstanding",
      signatureStatus: "not_sent",
      issuedAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, safe: { instruments: [instrument, ...prev.safe.instruments] } }));
    setCreatedId(instrument.id);
    setView("preview");
  };

  const startNew = () => {
    setDraft(EMPTY_DRAFT);
    setCreatedId(null);
    setView("form");
  };

  const formatDate = (value: string) =>
    value ? new Date(value).toLocaleDateString("en-GB") : "-";

  return (
    <div>
      <PageHeader
        title="Future Equity Agreements"
        subtitle="Generate Future Equity Agreements and keep a register of every instrument issued."
      />

      {view === "list" && (
        <div className="space-y-6">
          <ModuleIntro
            icon={FileSignature}
            eyebrow="Future equity"
            title="Future Equity Agreements"
            description="Create a Future Equity Agreement in minutes, then track every instrument you've issued - outstanding or converted - in one register."
            color="#D2795A"
            status={status}
            stats={[
              { label: "Instruments", value: String(instruments.length) },
              { label: "Outstanding", value: GBP.format(totalOutstanding) },
            ]}
            ctaLabel="Create new FEA"
            onStart={startNew}
            hideStatus
          />

          <div className="rounded-none border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-stone-900">Instrument register</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {GBP.format(totalOutstanding)} outstanding across {instruments.filter((i) => i.status === "outstanding").length} instrument(s)
                </p>
              </div>
              <Button onClick={startNew}>
                <Plus className="mr-1.5 h-4 w-4" /> New agreement
              </Button>
            </div>

            {instruments.length === 0 ? (
              <p className="rounded-none border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                No instruments issued yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-none border border-stone-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Subscriber</th>
                      <th className="px-4 py-3 font-semibold text-right">Amount</th>
                      <th className="px-4 py-3 font-semibold text-right">Round threshold</th>
                      <th className="px-4 py-3 font-semibold text-right">Discount</th>
                      <th className="px-4 py-3 font-semibold text-right">Cap</th>
                      <th className="px-4 py-3 font-semibold">Longstop</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instruments.map((i) => (
                      <tr key={i.id} className="border-t border-stone-100">
                        <td className="px-4 py-3 font-medium text-stone-900">{i.investorName}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-stone-600">{GBP.format(i.amount)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-stone-600">
                          {GBP.format(i.financingRoundThreshold)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-stone-600">{i.discountRate}%</td>
                        <td className="px-4 py-3 text-right tabular-nums text-stone-600">{GBP.format(i.valuationCap)}</td>
                        <td className="px-4 py-3 text-stone-600">
                          {new Date(i.longstopDate).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={i.status} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={i.signatureStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "form" && (
        <div className="rounded-none border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="space-y-10">
            <FormSection
              step={1}
              title="Deal parties"
              description="Subscriber and company details for the agreement."
            >
              <div className="space-y-4">
                <FormSubGroup label="Subscriber">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="investorName">Subscriber name *</Label>
                      <Input
                        id="investorName"
                        placeholder="Individual or company name"
                        value={draft.investorName}
                        onChange={(e) => update("investorName", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="subscriberAddress">
                        Registered office / address *
                      </Label>
                      <Textarea
                        id="subscriberAddress"
                        rows={2}
                        value={draft.subscriberAddress}
                        onChange={(e) => update("subscriberAddress", e.target.value)}
                      />
                    </div>
                  </div>
                </FormSubGroup>

                <FormSubGroup label="Company">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company name *</Label>
                      <Input
                        id="companyName"
                        value={draft.companyName}
                        onChange={(e) => update("companyName", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyNumber">Company registered number *</Label>
                      <Input
                        id="companyNumber"
                        value={draft.companyNumber}
                        onChange={(e) => update("companyNumber", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="companyRegisteredOffice">Registered office *</Label>
                      <Textarea
                        id="companyRegisteredOffice"
                        rows={2}
                        value={draft.companyRegisteredOffice}
                        onChange={(e) => update("companyRegisteredOffice", e.target.value)}
                      />
                    </div>
                  </div>
                </FormSubGroup>
              </div>
            </FormSection>

            <div className="border-t border-stone-200 pt-10">
              <FormSection
                step={2}
                title="Deal economics"
                description="These figures feed the summary, Conversion Price definition and Financing Round threshold in the agreement."
              >
                <div className="space-y-4">
                  <FormSubGroup label="Investment">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Investment amount (£) *</Label>
                        <Input
                          id="amount"
                          inputMode="numeric"
                          className="text-left"
                          value={formatThousands(draft.amount)}
                          onChange={(e) => update("amount", parseThousands(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="financingRoundThreshold">
                          Financing Round threshold (£) *
                        </Label>
                        <Input
                          id="financingRoundThreshold"
                          inputMode="numeric"
                          className="text-left"
                          value={formatThousands(draft.financingRoundThreshold)}
                          onChange={(e) => update("financingRoundThreshold", parseThousands(e.target.value))}
                          placeholder="0"
                        />
                        <p className="text-xs text-stone-500">
                          Minimum new-money raise that counts as a qualifying round.
                        </p>
                      </div>
                    </div>
                  </FormSubGroup>

                  <FormSubGroup label="Conversion terms">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="discountRate">Discount rate (%) *</Label>
                        <Input
                          id="discountRate"
                          inputMode="numeric"
                          className="text-left"
                          value={draft.discountRate}
                          onChange={(e) => update("discountRate", e.target.value.replace(/[^\d.]/g, ""))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="valuationCap">Valuation cap (£) *</Label>
                        <Input
                          id="valuationCap"
                          inputMode="numeric"
                          className="text-left"
                          value={formatThousands(draft.valuationCap)}
                          onChange={(e) => update("valuationCap", parseThousands(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="longstopDate">Longstop date *</Label>
                        <Input
                          id="longstopDate"
                          type="date"
                          className="max-w-xs"
                          value={draft.longstopDate}
                          onChange={(e) => update("longstopDate", e.target.value)}
                        />
                        <p className="text-xs text-stone-500">
                          Deadline before automatic conversion if no round happens.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4 rounded-none border border-forest-200 bg-forest-50 px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-forest-700">
                          Illustrative pre-money valuation (derived)
                        </p>
                        <p className="mt-0.5 text-xs text-forest-700/80">
                          Cap ÷ (1 − discount) - updates automatically from the fields above.
                        </p>
                      </div>
                      <div className="shrink-0 text-xl font-bold text-forest-800">
                        {illustrativePreMoney != null
                          ? GBP.format(Math.round(illustrativePreMoney))
                          : "-"}
                      </div>
                    </div>
                  </FormSubGroup>
                </div>
              </FormSection>
            </div>

            <div className="border-t border-stone-200 pt-10">
              <FormSection step={3} title="Admin" description="Bank details, signatories and agreement date.">
                <div className="space-y-4">
                  <FormSubGroup label="Designated bank account">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank name</Label>
                        <Input
                          id="bankName"
                          value={draft.bankName}
                          onChange={(e) => update("bankName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankAccountName">Account name *</Label>
                        <Input
                          id="bankAccountName"
                          value={draft.bankAccountName}
                          onChange={(e) => update("bankAccountName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankAccountNumber">Account number *</Label>
                        <Input
                          id="bankAccountNumber"
                          value={draft.bankAccountNumber}
                          onChange={(e) => update("bankAccountNumber", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankSortCode">Sort code *</Label>
                        <Input
                          id="bankSortCode"
                          placeholder="00-00-00"
                          value={draft.bankSortCode}
                          onChange={(e) => update("bankSortCode", e.target.value)}
                        />
                      </div>
                    </div>
                  </FormSubGroup>

                  <FormSubGroup label="Company signatory">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="companySignatoryName">Name *</Label>
                        <Input
                          id="companySignatoryName"
                          value={draft.companySignatoryName}
                          onChange={(e) => update("companySignatoryName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companySignatoryCapacity">Capacity *</Label>
                        <Input
                          id="companySignatoryCapacity"
                          value={draft.companySignatoryCapacity}
                          onChange={(e) => update("companySignatoryCapacity", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companySignatoryDate">Date *</Label>
                        <Input
                          id="companySignatoryDate"
                          type="date"
                          value={draft.companySignatoryDate}
                          onChange={(e) => update("companySignatoryDate", e.target.value)}
                        />
                      </div>
                    </div>
                  </FormSubGroup>

                  <FormSubGroup label="Subscriber signatory">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="subscriberSignatoryName">Name *</Label>
                        <Input
                          id="subscriberSignatoryName"
                          value={draft.subscriberSignatoryName}
                          onChange={(e) => update("subscriberSignatoryName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subscriberSignatoryCapacity">Capacity *</Label>
                        <Input
                          id="subscriberSignatoryCapacity"
                          value={draft.subscriberSignatoryCapacity}
                          onChange={(e) => update("subscriberSignatoryCapacity", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subscriberSignatoryDate">Date *</Label>
                        <Input
                          id="subscriberSignatoryDate"
                          type="date"
                          value={draft.subscriberSignatoryDate}
                          onChange={(e) => update("subscriberSignatoryDate", e.target.value)}
                        />
                      </div>
                    </div>
                  </FormSubGroup>

                  <FormSubGroup label="Agreement date">
                    <div className="max-w-xs space-y-2">
                      <Label htmlFor="agreementDate">
                        Date the agreement takes effect *
                      </Label>
                      <Input
                        id="agreementDate"
                        type="date"
                        value={draft.agreementDate}
                        onChange={(e) => update("agreementDate", e.target.value)}
                      />
                      <p className="text-xs text-stone-500">
                        The Longstop Date and payment deadline count from this date.
                      </p>
                    </div>
                  </FormSubGroup>
                </div>
              </FormSection>
            </div>
          </div>

          <div className="mt-6 flex gap-3 border-t border-stone-200 pt-6">
            <Button type="button" variant="outline" onClick={() => setView("list")}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Button>
            <GradientButton
              type="button"
              variant="emerald"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="ml-auto flex-1 sm:flex-none"
            >
              Generate agreement
            </GradientButton>
          </div>
        </div>
      )}

      {view === "preview" && (
        <div className="rounded-none border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-stone-900">Agreement preview</h3>
              <StatusPill status="draft" label="Ready to send" />
            </div>

            <div className="rounded-none border border-stone-200 bg-stone-50/50 p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                Deal parties
              </p>
              <SummaryRow label="Subscriber" value={draft.investorName} />
              <SummaryRow label="Subscriber address" value={draft.subscriberAddress} />
              <SummaryRow label="Company" value={`${draft.companyName} (${draft.companyNumber})`} />
              <SummaryRow label="Registered office" value={draft.companyRegisteredOffice} />
            </div>

            <div className="rounded-none border border-stone-200 bg-stone-50/50 p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                Deal economics
              </p>
              <SummaryRow label="Investment amount" value={GBP.format(Number(draft.amount) || 0)} />
              <SummaryRow
                label="Financing Round threshold"
                value={GBP.format(Number(draft.financingRoundThreshold) || 0)}
              />
              <SummaryRow label="Discount rate" value={`${draft.discountRate}%`} />
              <SummaryRow label="Valuation cap" value={GBP.format(Number(draft.valuationCap) || 0)} />
              <SummaryRow
                label="Illustrative pre-money"
                value={
                  illustrativePreMoney != null
                    ? GBP.format(Math.round(illustrativePreMoney))
                    : "-"
                }
              />
              <SummaryRow label="Longstop date" value={formatDate(draft.longstopDate)} />
            </div>

            <div className="rounded-none border border-stone-200 bg-stone-50/50 p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                Admin
              </p>
              <SummaryRow
                label="Bank account"
                value={`${draft.bankAccountName} · ${draft.bankName} · ${draft.bankSortCode} · ${draft.bankAccountNumber}`}
              />
              <SummaryRow
                label="Company signatory"
                value={`${draft.companySignatoryName} (${draft.companySignatoryCapacity}) · ${formatDate(draft.companySignatoryDate)}`}
              />
              <SummaryRow
                label="Subscriber signatory"
                value={`${draft.subscriberSignatoryName} (${draft.subscriberSignatoryCapacity}) · ${formatDate(draft.subscriberSignatoryDate)}`}
              />
              <SummaryRow label="Agreement date" value={formatDate(draft.agreementDate)} />
            </div>

            <StubAction
              emphasized
              label="Send for signature"
              placeholderText="Connect an e-signature provider here - this demo does not send a real signature request."
              onActivated={() => {
                if (!createdId) return;
                setState((prev) => ({
                  ...prev,
                  safe: {
                    instruments: prev.safe.instruments.map((i) =>
                      i.id === createdId ? { ...i, signatureStatus: "sent" } : i
                    ),
                  },
                }));
              }}
            />

            <div className="flex gap-3 border-t border-stone-200 pt-6">
              <Button variant="outline" onClick={() => setView("list")}>
                Back to register
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
