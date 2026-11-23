import { NextResponse } from "next/server";
import { withMember } from "@/lib/admin/api";
import { FlowError } from "@/lib/engagements/actions";

/** Looks up a company's name and address. Needs COMPANIES_HOUSE_API_KEY (free from Companies House). */
export async function GET(request: Request) {
  return withMember(async () => {
    const key = process.env.COMPANIES_HOUSE_API_KEY?.trim();
    if (!key) throw new FlowError("Company lookup is not connected yet. Type the details in.", 503);
    const number = (new URL(request.url).searchParams.get("number") || "").toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9]{6,8}$/.test(number)) throw new FlowError("Company numbers are 8 characters, for example 12345678.");
    const res = await fetch(`https://api.company-information.service.gov.uk/company/${number.padStart(8, "0")}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
    });
    if (res.status === 404) throw new FlowError("No company found with that number.", 404);
    if (!res.ok) throw new FlowError("Companies House did not respond. Try again or type the details in.", 502);
    const data = (await res.json()) as {
      company_name?: string;
      company_number?: string;
      company_status?: string;
      registered_office_address?: Record<string, string>;
      accounts?: { next_made_up_to?: string; next_accounts?: { period_end_on?: string } };
    };
    const a = data.registered_office_address || {};
    const parts = [a.premises && a.address_line_1 ? `${a.premises} ${a.address_line_1}` : a.premises || a.address_line_1, a.address_line_2, a.locality, a.region, a.postal_code];
    const addressLines = parts.map((p) => (p || "").trim()).filter(Boolean);
    // The next accounts due: the first year end we would take over.
    const yearEnd = data.accounts?.next_accounts?.period_end_on || data.accounts?.next_made_up_to || "";
    return NextResponse.json({
      name: data.company_name,
      number: data.company_number,
      status: data.company_status,
      address: addressLines.join(", "),
      addressLines,
      yearEnd,
    });
  });
}
