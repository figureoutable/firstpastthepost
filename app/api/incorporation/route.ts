import { NextResponse } from "next/server";
import { sendInternalEmail, sendClientEmail } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
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

    const html = `
      <h2 style="font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;">New incorporation request</h2>

      <h3 style="margin-top:16px;">Overview</h3>
      <table style="border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:4px 8px;font-weight:600;">Company name</td>
          <td style="padding:4px 8px;">${step2?.name || ""} ${step2?.ending || ""}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px;font-weight:600;">Company type</td>
          <td style="padding:4px 8px;">${companyTypeSummary}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px;font-weight:600;">Region</td>
          <td style="padding:4px 8px;">${regionMap[step3?.region] || step3?.region || ""}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px;font-weight:600;">Registered email</td>
          <td style="padding:4px 8px;">${registeredEmail}</td>
        </tr>
      </table>

      <h3 style="margin-top:16px;">Registered office</h3>
      <p style="font-size:14px;margin:4px 0;">
        ${[
          step3?.registered?.line1,
          step3?.registered?.line2,
          step3?.registered?.town,
          step3?.registered?.postcode,
          step3?.registered?.country,
        ]
          .filter(Boolean)
          .join(", ")}
      </p>

      <h3 style="margin-top:16px;">Business details</h3>
      <p style="font-size:14px;margin:4px 0;">${step4?.businessDescription || ""}</p>
      <p style="font-size:14px;margin:4px 0;">
        SIC: ${(Array.isArray(step4?.sicCodes) ? step4.sicCodes : [])
          .map((c: any) => c.code)
          .join(", ")}
      </p>

      <h3 style="margin-top:16px;">Directors (${Array.isArray(step5?.directors) ? step5.directors.length : 0})</h3>
      <ul style="font-size:14px;margin:4px 0 0 16px;padding:0;list-style-type:none;">
        ${(Array.isArray(step5?.directors) ? step5.directors : [])
          .map((d: any) => {
            const corrAddress = [
              d.corrAddress?.line1,
              d.corrAddress?.line2,
              d.corrAddress?.town,
              d.corrAddress?.postcode,
              d.corrAddress?.country,
            ]
              .filter(Boolean)
              .join(", ");
            const homeAddress = [
              d.homeAddress?.line1,
              d.homeAddress?.line2,
              d.homeAddress?.town,
              d.homeAddress?.postcode,
              d.homeAddress?.country,
            ]
              .filter(Boolean)
              .join(", ");
            const dob =
              d.dobDay && d.dobMonth && d.dobYear
                ? `${d.dobDay}/${d.dobMonth}/${d.dobYear}`
                : "";
            return `
              <li style="margin-bottom:12px;">
                <div><strong>${d.firstName || ""} ${d.lastName || ""}</strong></div>
                <div>Country of residence: ${d.countryResidence || ""}</div>
                <div>Date of birth: ${dob}</div>
                <div>Nationality: ${d.nationality || ""}</div>
                <div style="margin-top:4px;"><em>Correspondence address (public)</em><br/>${corrAddress}</div>
                <div style="margin-top:4px;"><em>Home address (private)</em><br/>${homeAddress}</div>
                <div style="margin-top:4px;">Email for filing reminders: ${d.emailReminders || "—"}</div>
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
              ? sh.businessName
              : `${sh.firstName || ""} ${sh.lastName || ""}`;
            const shares = step7?.allocations?.[sh.id] || 0;
            const addr = [
              (sh.addr || sh.businessAddress)?.line1,
              (sh.addr || sh.businessAddress)?.line2,
              (sh.addr || sh.businessAddress)?.town,
              (sh.addr || sh.businessAddress)?.postcode,
              (sh.addr || sh.businessAddress)?.country,
            ]
              .filter(Boolean)
              .join(", ");
            const acting =
              isBusiness && (sh.actingFirst || sh.actingLast)
                ? `${sh.actingFirst || ""} ${sh.actingLast || ""}`
                : "";
            return `
              <li style="margin-bottom:12px;">
                <div><strong>${name}</strong> — ${isBusiness ? "Business shareholder" : "Individual shareholder"}</div>
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
          .map(
            (p: any) =>
              `<li>${p.name} — ${p.pct?.toFixed ? p.pct.toFixed(1) : p.pct}% (>${
                p.pct
              }% shares)</li>`
          )
          .join("") || "<li>None (confirmed no one controls more than 25%)</li>"}
      </ul>

      <h3 style="margin-top:24px;">Raw payload (for debugging)</h3>
      <pre style="font-size:12px;white-space:pre-wrap;max-height:500px;overflow:auto;border:1px solid #eee;padding:8px;border-radius:4px;">
${JSON.stringify(payload, null, 2)}
      </pre>
    `;
    await sendInternalEmail("Incorporation request submitted", html);

    const clientBody = `
      <p>Congrats on the first step to your new Limited company!</p>
      <p>We have received everything we need and will be in touch with you shortly.</p>
      <p>Kind regards,<br/>The Figures Team</p>
    `;
    await sendClientEmail(
      registeredEmail,
      "Your company incorporation request - next steps",
      clientBody
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Submit failed" },
      { status: 500 }
    );
  }
}
