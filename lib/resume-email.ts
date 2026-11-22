import { escapeHtml } from "@/lib/email-html";
import { FIRM } from "@/lib/figures-config";

export function resumeCodeEmailHtml(code: string, link: string, what: string): string {
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1917;">
    <p style="font-size:20px;font-weight:700;margin:0 0 16px;">figures</p>
    <p style="font-size:15px;line-height:1.5;margin:0 0 16px;">Here is your code in case you need to finish your ${escapeHtml(what)} later or on another device.</p>
    <p style="font-family:ui-monospace,Menlo,monospace;font-size:28px;font-weight:700;letter-spacing:4px;margin:8px 0 16px;color:#c2410c;">${escapeHtml(code)}</p>
    <p style="font-size:15px;line-height:1.5;margin:0 0 16px;">Go to <a href="${link}" style="color:#c2410c;">${escapeHtml(link.replace(/^https?:\/\//, ""))}</a>, choose "Already started?" and enter the code. Your progress saves as you go.</p>
    <p style="font-size:14px;color:#57534e;">Questions? Reply to this email or write to <a href="mailto:${FIRM.contactEmail}" style="color:#c2410c;">${FIRM.contactEmail}</a>.</p>
  </div>`;
}
