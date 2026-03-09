import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const DEFAULT_TO = "joshua@tryfigures.com";

export async function sendInternalEmail(subject: string, html: string): Promise<void> {
    if (!resend) return;
    await resend.emails.send({
        from: "Figures Onboarding <onboarding@resend.dev>",
        to: [DEFAULT_TO],
        subject,
        html,
    });
}
