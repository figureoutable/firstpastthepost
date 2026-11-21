import { NextResponse } from "next/server";
import { sendInternalEmail, sendClientEmail } from "@/lib/notifications";
import { appendIncorporationSubmission } from "@/lib/google-sheets";
import { escapeHtml, escapeHtmlMultiline } from "@/lib/email-html";
import { createSubmission, type AmlPerson } from "@/lib/submission-store";
import { signSubmissionId } from "@/lib/aml-signature";
import { deleteDraft } from "@/lib/incorporation-draft-store";
import { appOrigin, isPreview } from "@/lib/env";
import { incorporationNextSteps, nextStepsEmailHtml } from "@/lib/next-steps";
import { FIRM } from "@/lib/figures-config";

type Address = {
  line1?: string;
  line2?: string;
  town?: string;
  county?: string;
  postcode?: string;
  country?: string;
};

function plainAddress(addr: Address | undefined | null): string {
  return [addr?.line1, addr?.line2, addr?.town, addr?.county, addr?.postcode, addr?.country]
    .filter(Boolean)
    .join(", ");
}

/** Directors to run individual AML checks on (the company has no number yet). */
function amlPeopleFrom(payload: any, registeredEmail: string): AmlPerson[] {
  const directors: any[] = Array.isArray(payload?.step5?.directors) ? payload.step5.directors : [];
  const registered = payload?.step3?.registered;
  return directors
    .map((d, index) => {
      const fullName = [d.firstName, d.middleName, d.lastName].filter(Boolean).join(" ").trim();
      const dob =
        d.dobYear && d.dobMonth && d.dobDay
          ? `${d.dobYear}-${String(d.dobMonth).padStart(2, "0")}-${String(d.dobDay).padStart(2, "0")}`
          : undefined;
      const home =
        d.homeType === "other" ? d.homeAddress : d.corrType === "other" ? d.corrAddress : registered;
      return {
        fullName,
        email: (d.emailReminders || "").trim() || (index === 0 ? registeredEmail : undefined),
        dob,
        address: plainAddress(home) || undefined,
      };
    })
    .filter((person) => person.fullName);
}

function formatAddress(addr: Address | undefined | null): string {
  return [addr?.line1, addr?.line2, addr?.town, addr?.county, addr?.postcode, addr?.country]
    .filter(Boolean)
    .map((part) => escapeHtml(part))
    .join(", ");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resumeCode = typeof body?.resumeCode === "string" ? body.resumeCode : "";
    const payload = { ...body };
    delete payload.resumeCode;
    const registeredEmail = String(payload?.step3?.registeredEmail || "").trim();
    if (!registeredEmail) {
      return NextResponse.json({ error: "Registered email missing" }, { status: 400 });
    }

    const {
      step1,
      step2,
      step3,
      step4,
      step5,
      step6,
      step7,
      step8,
      step9,
      pscSummary,
    } = payload;

    const regionMap: Record<string, string> = {
      EW: "England & Wales",
      S: "Scotland",
      NI: "Northern Ireland",
      W: "Wales",
    };

    const companyTypeSummary =
      step1?.cic === "no" && step1?.limitedByGuarantee === "no"
        ? "Standard private company limited by shares"
        : `CIC: ${step1?.cic === "yes" ? "Yes" : "No"}, limited by guarantee: ${
            step1?.limitedByGuarantee === "yes" ? "Yes" : "No"
          }`;

    const totalShares = Array.isArray(step6?.shareholders)
      ? step6.shareholders.reduce(
          (sum: number, sh: any) => sum + (step7?.allocations?.[sh.id] || 0),
          0
        )
      : 0;

    const registeredAddr: Address = step3?.registered || {};

    const amlPeople = amlPeopleFrom(payload, registeredEmail);
    const submission = await createSubmission(payload, { kind: "incorporation", amlPeople });
    await appendIncorporationSubmission(payload as Record<string, unknown>, submission.id);

    const amlSection = isPreview()
      ? `<p style="color:#9a3412;">This is a test submission from a preview build, so the paid Firmcheck AML button is hidden.</p>`
      : `<p>Forming a company is AML-regulated work. Use the button below to run individual checks on the ${amlPeople.length} director(s). You will be asked to confirm first.</p>
         <a href="${appOrigin(request)}/api/firmcheck/initiate?submissionId=${encodeURIComponent(submission.id)}&sig=${signSubmissionId(submission.id)}" style="display:inline-block;padding:10px 16px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;">Review and start AML check</a>`;

    const html = `
      <h2 style="font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;">New incorporation request</h2>

      <h3 style="margin-top:16px;">Overview</h3>
      <table style="border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:4px 8px;font-weight:600;">Company name</td>
          <td style="padding:4px 8px;">${escapeHtml(step2?.name)} ${escapeHtml(step2?.ending)}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px;font-weight:600;">Company type</td>
          <td style="padding:4px 8px;">${escapeHtml(companyTypeSummary)}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px;font-weight:600;">Region</td>
          <td style="padding:4px 8px;">${escapeHtml(regionMap[step3?.region] || step3?.region)}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px;font-weight:600;">Registered email</td>
          <td style="padding:4px 8px;">${escapeHtml(registeredEmail)}</td>
        </tr>
      </table>

      <h3 style="margin-top:16px;">Registered office</h3>
      <p style="font-size:14px;margin:4px 0;">
        ${formatAddress(registeredAddr)}
      </p>

      <h3 style="margin-top:16px;">Business details</h3>
      <p style="font-size:14px;margin:4px 0;">${escapeHtmlMultiline(step4?.businessDescription)}</p>
      <p style="font-size:14px;margin:4px 0;">
        SIC: ${escapeHtml(
          (Array.isArray(step4?.sicCodes) ? step4.sicCodes : [])
            .map((c: any) => c.code)
            .filter(Boolean)
            .join(", ")
        ) || "-"}
      </p>

      <h3 style="margin-top:16px;">Directors (${Array.isArray(step5?.directors) ? step5.directors.length : 0})</h3>
      <ul style="font-size:14px;margin:4px 0 0 16px;padding:0;list-style-type:none;">
        ${(Array.isArray(step5?.directors) ? step5.directors : [])
          .map((d: any) => {
            // "registered"/"same" are shorthand for "use the registered office
            // address" — resolve them here so the email never shows a blank line.
            const corrAddress =
              d.corrType === "other"
                ? formatAddress(d.corrAddress)
                : `${formatAddress(registeredAddr)} <span style="color:#888;">(same as registered office)</span>`;
            const homeAddress =
              d.homeType === "other"
                ? formatAddress(d.homeAddress)
                : `${d.corrType === "other" ? formatAddress(d.corrAddress) : formatAddress(registeredAddr)} <span style="color:#888;">(same as correspondence address)</span>`;
            const dob =
              d.dobDay && d.dobMonth && d.dobYear
                ? escapeHtml(`${d.dobDay}/${d.dobMonth}/${d.dobYear}`)
                : "-";
            return `
              <li style="margin-bottom:12px;">
                <div><strong>${escapeHtml(d.firstName)} ${escapeHtml(d.lastName)}</strong></div>
                <div>Country of residence: ${escapeHtml(d.countryResidence) || "-"}</div>
                <div>Date of birth: ${dob}</div>
                <div>Nationality: ${escapeHtml(d.nationality) || "-"}</div>
                <div style="margin-top:4px;"><em>Correspondence address (public)</em><br/>${corrAddress}</div>
                <div style="margin-top:4px;"><em>Home address (private)</em><br/>${homeAddress}</div>
                <div style="margin-top:4px;">Email for filing reminders: ${escapeHtml(d.emailReminders) || "-"}</div>
              </li>
            `;
          })
          .join("")}
      </ul>

      <h3 style="margin-top:16px;">Shareholders (${Array.isArray(step6?.shareholders) ? step6.shareholders.length : 0})</h3>
      <ul style="font-size:14px;margin:4px 0 0 16px;padding:0;list-style-type:none;">
        ${(Array.isArray(step6?.shareholders) ? step6.shareholders : [])
          .map((sh: any) => {
            const isBusiness = sh.kind === "business";
            const name = isBusiness
              ? escapeHtml(sh.businessName)
              : `${escapeHtml(sh.firstName)} ${escapeHtml(sh.lastName)}`;
            const shares = step7?.allocations?.[sh.id] || 0;
            const addr = isBusiness
              ? formatAddress(sh.businessAddress)
              : sh.addrType === "other"
                ? formatAddress(sh.addr)
                : `${formatAddress(registeredAddr)} <span style="color:#888;">(same as registered office)</span>`;
            const acting =
              isBusiness && (sh.actingFirst || sh.actingLast)
                ? `${escapeHtml(sh.actingFirst)} ${escapeHtml(sh.actingLast)}`
                : "";
            return `
              <li style="margin-bottom:12px;">
                <div><strong>${name}</strong> - ${isBusiness ? "Business shareholder" : "Individual shareholder"}</div>
                <div>Shares: ${shares} share${shares === 1 ? "" : "s"}</div>
                <div>Registered address (public): ${addr}</div>
                ${acting ? `<div>Acting person: ${acting}</div>` : ""}
              </li>
            `;
          })
          .join("")}
      </ul>
      <p style="font-size:14px;margin:4px 0;">Total shares: ${totalShares}</p>

      <h3 style="margin-top:16px;">PSCs</h3>
      <ul style="font-size:14px;margin:4px 0 0 16px;padding:0;">
        ${(Array.isArray(pscSummary) ? pscSummary : [])
          .map((p: any) => {
            const pct = typeof p.pct === "number" ? p.pct.toFixed(1) : p.pct;
            return `<li>${escapeHtml(p.name)} - controls ${pct}% of shares</li>`;
          })
          .join("") || "<li>None (confirmed no one controls more than 25%)</li>"}
      </ul>

      <h3 style="margin-top:24px;">Firmcheck AML</h3>
      ${amlSection}
    `;

    try {
      await sendInternalEmail(`New company formation: ${step2?.name || ""} ${step2?.ending || ""}`.trim(), html);
    } catch (error) {
      console.error("[incorporation] Internal email failed", error);
    }

    const firstName = String(step5?.directors?.[0]?.firstName || "").trim() || "there";
    await sendClientEmail(
      registeredEmail,
      "We've received your company formation request",
      nextStepsEmailHtml(
        `Hi ${escapeHtml(firstName)}, thank you for asking Figures to form ${escapeHtml(`${step2?.name || "your company"} ${step2?.ending || ""}`.trim())}. Here is what happens next.`,
        incorporationNextSteps(),
        FIRM.contactEmail
      )
    );

    if (resumeCode) {
      await deleteDraft(resumeCode).catch((error) => console.error("[incorporation] Draft cleanup failed", error));
    }

    return NextResponse.json({ ok: true, submissionId: submission.id });
  } catch (e) {
    return NextResponse.json(
      { error: "We could not save your request. Please try again in a moment." },
      { status: 500 }
    );
  }
}
