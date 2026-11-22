/** What happens after a client submits. Shared by the success pages and client emails. */

export type NextStep = { title: string; detail: string };

export function onboardingNextSteps(opts: { hasPreviousAccountant?: boolean; letterSigned?: boolean } = {}): NextStep[] {
  let steps: NextStep[] = [
    {
      title: "We review your details",
      detail: "We check everything you sent and come back to you if anything is missing.",
    },
    {
      title: "Confirm your identity",
      detail:
        "You may get an email from Firmcheck, our identity check partner. Follow the link in it to confirm who you are.",
    },
    {
      title: "Sign your engagement letter",
      detail: "We email you an engagement letter setting out our services and fees for you to sign.",
    },
    {
      title: "We register as your agent with HMRC",
      detail:
        "HMRC may post you a code or email you a link to approve us. Please send it to us when it arrives.",
    },
  ];
  // Clients who came through a New client link have already signed.
  if (opts.letterSigned) steps = steps.filter((s) => s.title !== "Sign your engagement letter");
  if (opts.hasPreviousAccountant) {
    steps.push({
      title: "We contact your previous accountant",
      detail: "We ask them for a handover so nothing is missed. You do not need to do anything.",
    });
  }
  return steps;
}

export function incorporationNextSteps(opts: { letterSigned?: boolean } = {}): NextStep[] {
  const steps: NextStep[] = [
    {
      title: "We check your details",
      detail: "We review the company details and come back to you if anything needs changing.",
    },
    {
      title: "Identity checks",
      detail:
        "Each director may get an email from Firmcheck, our identity check partner, to confirm who they are.",
    },
    {
      title: "Sign your engagement letter",
      detail: "We email you an engagement letter setting out our services and fees for you to sign.",
    },
    {
      title: "We file with Companies House",
      detail: "Once everything is approved we submit the application and send you the certificate.",
    },
  ];
  return opts.letterSigned ? steps.filter((step) => step.title !== "Sign your engagement letter") : steps;
}

export function nextStepsEmailHtml(intro: string, steps: NextStep[], contactEmail: string): string {
  const items = steps
    .map(
      (step, i) => `
      <tr>
        <td style="vertical-align:top;padding:8px 12px 8px 0;">
          <div style="width:24px;height:24px;border-radius:12px;background:#f97316;color:#fff;font-size:12px;font-weight:600;line-height:24px;text-align:center;">${i + 1}</div>
        </td>
        <td style="vertical-align:top;padding:8px 0;">
          <div style="font-weight:600;color:#1c1917;">${step.title}</div>
          <div style="color:#57534e;font-size:14px;margin-top:2px;">${step.detail}</div>
        </td>
      </tr>`
    )
    .join("");
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1917;">
    <p style="font-size:20px;font-weight:700;margin:0 0 16px;">figures</p>
    <p style="font-size:15px;line-height:1.5;margin:0 0 16px;">${intro}</p>
    <p style="font-size:15px;font-weight:600;margin:24px 0 4px;">What happens next</p>
    <table style="border-collapse:collapse;">${items}</table>
    <p style="font-size:14px;color:#57534e;margin-top:24px;">Questions? Reply to this email or write to <a href="mailto:${contactEmail}" style="color:#c2410c;">${contactEmail}</a>.</p>
    <p style="font-size:14px;margin-top:16px;">The Figures team</p>
  </div>`;
}
