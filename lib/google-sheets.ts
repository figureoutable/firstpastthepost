import { google, type sheets_v4 } from "googleapis";

const ONBOARDING_SHEET = "Onboarding";
const INCORPORATION_SHEET = "Incorporation";

const ONBOARDING_HEADERS = [
    "Submitted At",
    "Submission ID",
    "Type",
    "Full Name",
    "Email",
    "Phone",
    "Company Name",
    "Company Number",
    "Business UTR",
    "Personal UTR",
    "NI Number",
    "Nature of Business",
    "Source of Funds",
    "Services Required",
    "Income Types",
    "Photo ID URL",
    "Proof of Address URL",
    "Full Payload (JSON)",
] as const;

const INCORPORATION_HEADERS = [
    "Submitted At",
    "Company Name",
    "Ending",
    "Registered Email",
    "Region",
    "Registered Office",
    "Business Description",
    "SIC Codes",
    "Directors",
    "Shareholders",
    "Total Shares",
    "PSCs",
    "Full Payload (JSON)",
] as const;

let sheetsClient: sheets_v4.Sheets | null = null;

function cell(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (Array.isArray(value)) {
        if (value.every((item) => typeof item === "string" || typeof item === "number")) {
            return value.join(", ");
        }
        return JSON.stringify(value);
    }
    return JSON.stringify(value);
}

function getCredentials(): { client_email: string; private_key: string } | null {
    const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
    if (json) {
        try {
            const parsed = JSON.parse(json) as { client_email?: string; private_key?: string };
            if (parsed.client_email && parsed.private_key) {
                return {
                    client_email: parsed.client_email,
                    private_key: parsed.private_key.replace(/\\n/g, "\n"),
                };
            }
        } catch {
            return null;
        }
    }

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
    if (email && key) {
        return { client_email: email, private_key: key };
    }

    return null;
}

export function isGoogleSheetsConfigured(): boolean {
    return Boolean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() && getCredentials());
}

function getSheetsClient(): sheets_v4.Sheets | null {
    if (sheetsClient) return sheetsClient;

    const credentials = getCredentials();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
    if (!credentials || !spreadsheetId) return null;

    const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    sheetsClient = google.sheets({ version: "v4", auth });
    return sheetsClient;
}

async function ensureSheetTab(sheetName: string): Promise<void> {
    const client = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
    if (!client || !spreadsheetId) return;

    const meta = await client.spreadsheets.get({ spreadsheetId });
    const exists = meta.data.sheets?.some((sheet) => sheet.properties?.title === sheetName);
    if (exists) return;

    await client.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [{ addSheet: { properties: { title: sheetName } } }],
        },
    });
}

async function ensureHeaders(sheetName: string, headers: readonly string[]): Promise<void> {
    const client = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
    if (!client || !spreadsheetId) return;

    const existing = await client.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetName}'!A1:1`,
    });

    if (existing.data.values?.length) return;

    await client.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetName}'!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[...headers]] },
    });
}

async function appendRow(sheetName: string, headers: readonly string[], values: string[]): Promise<void> {
    const client = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
    if (!client || !spreadsheetId) {
        console.warn("[google-sheets] Not configured — skipping row append");
        return;
    }

    await ensureSheetTab(sheetName);
    await ensureHeaders(sheetName, headers);

    await client.spreadsheets.values.append({
        spreadsheetId,
        range: `'${sheetName}'!A:Z`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [values] },
    });
}

async function safeAppend(
    sheetName: string,
    headers: readonly string[],
    values: string[]
): Promise<void> {
    try {
        await appendRow(sheetName, headers, values);
    } catch (error) {
        console.error("[google-sheets] Failed to append row:", error);
    }
}

function formatAddress(address?: {
    line1?: string;
    line2?: string;
    town?: string;
    postcode?: string;
    country?: string;
}): string {
    if (!address) return "";
    return [address.line1, address.line2, address.town, address.postcode, address.country]
        .filter(Boolean)
        .join(", ");
}

export async function appendOnboardingSubmission(
    submissionId: string,
    payload: Record<string, unknown>
): Promise<void> {
    const submittedAt = new Date().toISOString();
    const fullName =
        cell(payload.fullNamePassport) ||
        cell(payload.fullName) ||
        "";

    await safeAppend(ONBOARDING_SHEET, ONBOARDING_HEADERS, [
        submittedAt,
        submissionId,
        cell(payload.onboardingType),
        fullName,
        cell(payload.email),
        cell(payload.phoneNumber),
        cell(payload.companyName),
        cell(payload.registrationNumber),
        cell(payload.businessUtr ?? payload.utrNumber),
        cell(payload.personalUtr),
        cell(payload.niNumber),
        cell(payload.natureOfBusiness),
        cell(payload.sourceOfFunds),
        cell(payload.servicesRequired),
        cell(payload.incomeTypes),
        cell(payload.photoId),
        cell(payload.proofOfAddress),
        JSON.stringify(payload),
    ]);
}

export async function appendIncorporationSubmission(payload: Record<string, unknown>): Promise<void> {
    const step2 = (payload.step2 ?? {}) as Record<string, unknown>;
    const step3 = (payload.step3 ?? {}) as Record<string, unknown>;
    const step4 = (payload.step4 ?? {}) as Record<string, unknown>;
    const step5 = (payload.step5 ?? {}) as { directors?: unknown[] };
    const step6 = (payload.step6 ?? {}) as { shareholders?: Array<Record<string, unknown>> };
    const step7 = (payload.step7 ?? {}) as { allocations?: Record<string, number> };
    const pscSummary = Array.isArray(payload.pscSummary) ? payload.pscSummary : [];

    const regionMap: Record<string, string> = {
        EW: "England & Wales",
        S: "Scotland",
        NI: "Northern Ireland",
        W: "Wales",
    };

    const registered = (step3.registered ?? {}) as {
        line1?: string;
        line2?: string;
        town?: string;
        postcode?: string;
        country?: string;
    };

    const sicCodes = Array.isArray(step4.sicCodes)
        ? step4.sicCodes
              .map((item) => {
                  if (item && typeof item === "object" && "code" in item) {
                      const code = (item as { code?: string; description?: string }).code ?? "";
                      const description = (item as { code?: string; description?: string }).description ?? "";
                      return description ? `${code} — ${description}` : code;
                  }
                  return "";
              })
              .filter(Boolean)
              .join("; ")
        : "";

    const directors = Array.isArray(step5.directors)
        ? step5.directors
              .map((director) => {
                  if (!director || typeof director !== "object") return "";
                  const d = director as Record<string, unknown>;
                  return `${cell(d.firstName)} ${cell(d.lastName)}`.trim();
              })
              .filter(Boolean)
              .join("; ")
        : "";

    const totalShares = Array.isArray(step6.shareholders)
        ? step6.shareholders.reduce(
              (sum, shareholder) => sum + (step7.allocations?.[String(shareholder.id)] || 0),
              0
          )
        : 0;

    const shareholders = Array.isArray(step6.shareholders)
        ? step6.shareholders
              .map((shareholder) => {
                  const shares = step7.allocations?.[String(shareholder.id)] || 0;
                  const name =
                      shareholder.kind === "business"
                          ? cell(shareholder.businessName)
                          : `${cell(shareholder.firstName)} ${cell(shareholder.lastName)}`.trim();
                  return name ? `${name} (${shares} shares)` : "";
              })
              .filter(Boolean)
              .join("; ")
        : "";

    const pscs = pscSummary
        .map((psc) => {
            if (!psc || typeof psc !== "object") return "";
            const p = psc as { name?: string; pct?: number };
            return p.name ? `${p.name} (${typeof p.pct === "number" ? p.pct.toFixed(1) : p.pct}%)` : "";
        })
        .filter(Boolean)
        .join("; ");

    await safeAppend(INCORPORATION_SHEET, INCORPORATION_HEADERS, [
        new Date().toISOString(),
        cell(step2.name),
        cell(step2.ending),
        cell(step3.registeredEmail),
        regionMap[String(step3.region ?? "")] ?? cell(step3.region),
        formatAddress(registered),
        cell(step4.businessDescription),
        sicCodes,
        directors,
        shareholders,
        String(totalShares),
        pscs || "None over 25%",
        JSON.stringify(payload),
    ]);
}

export async function appendSpecialIncorporationLead(payload: Record<string, unknown>): Promise<void> {
    await safeAppend(INCORPORATION_SHEET, INCORPORATION_HEADERS, [
        new Date().toISOString(),
        "Special structure lead",
        "",
        "",
        "",
        "",
        `CIC: ${cell(payload.cic)}; Limited by guarantee: ${cell(payload.limitedByGuarantee)}`,
        "",
        "",
        "",
        "",
        "Needs team follow-up",
        JSON.stringify(payload),
    ]);
}
