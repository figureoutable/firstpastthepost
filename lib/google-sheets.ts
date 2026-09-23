import { createSign } from "crypto";
import { sendInternalEmail } from "@/lib/notifications";
import { escapeHtml } from "@/lib/email-html";

const ONBOARDING_SHEET = "Onboarding";
const INCORPORATION_SHEET = "Incorporation";

const ONBOARDING_HEADERS = [
    "Submitted At",
    "Submission ID",
    "Type",
    "Full Name",
    "Email",
    "Phone",
    "Home Address",
    "Company Name",
    "Company Number",
    "Company Auth Code",
    "Business UTR",
    "Personal UTR",
    "NI Number",
    "Has PAYE",
    "Accounts Office Ref",
    "PAYE Reference",
    "VAT Registered",
    "VAT Number",
    "VAT Reg Date",
    "Nature of Business",
    "Source of Funds",
    "Trading Address",
    "Services Required",
    "Income Types",
    "Directors/Owners",
    "Photo ID URL",
    "Proof of Address URL",
    "Full Payload (JSON)",
] as const;

const INCORPORATION_HEADERS = [
    "Submitted At",
    "Company Name",
    "Ending",
    "Backup Name",
    "Registered Email",
    "HMRC Phone",
    "Region",
    "Registered Office",
    "Principal Place of Business",
    "Business Description",
    "SIC Codes",
    "Directors",
    "Shareholders",
    "Total Shares",
    "Share Structure",
    "PSCs",
    "Director Personal Codes",
    "Full Payload (JSON)",
] as const;

type ServiceAccountCredentials = {
    client_email: string;
    private_key: string;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

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

function getCredentials(): ServiceAccountCredentials | null {
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
            console.error("[google-sheets] GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key");
            return null;
        } catch {
            console.error("[google-sheets] GOOGLE_SERVICE_ACCOUNT_JSON is set but is not valid JSON");
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

function base64Url(input: string | Buffer): string {
    return Buffer.from(input).toString("base64url");
}

async function getAccessToken(): Promise<string | null> {
    const credentials = getCredentials();
    if (!credentials) return null;

    if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
        return cachedAccessToken.token;
    }

    const now = Math.floor(Date.now() / 1000);
    const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claim = base64Url(
        JSON.stringify({
            iss: credentials.client_email,
            scope: "https://www.googleapis.com/auth/spreadsheets",
            aud: "https://oauth2.googleapis.com/token",
            iat: now,
            exp: now + 3600,
        })
    );
    const unsigned = `${header}.${claim}`;
    const signer = createSign("RSA-SHA256");
    signer.update(unsigned);
    const jwt = `${unsigned}.${signer.sign(credentials.private_key, "base64url")}`;

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
        }),
    });

    const data = (await response.json()) as { access_token?: string; expires_in?: number; error?: string };
    if (!response.ok || !data.access_token) {
        throw new Error(`Google auth failed: ${data.error || response.status}`);
    }

    cachedAccessToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return data.access_token;
}

function valuesRange(sheetName: string, a1: string): string {
    return `/values/${encodeURIComponent(`'${sheetName}'!${a1}`)}`;
}

async function sheetsRequest<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
    const token = await getAccessToken();
    if (!spreadsheetId || !token) {
        throw new Error("Google Sheets is not configured");
    }

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...(init?.headers || {}),
        },
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Sheets API ${response.status}: ${text}`);
    }
    return (text ? JSON.parse(text) : {}) as T;
}

function isAlreadyExistsError(error: unknown): boolean {
    return /already exists/i.test(error instanceof Error ? error.message : String(error));
}

async function ensureSheetTab(sheetName: string): Promise<void> {
    const meta = await sheetsRequest<{ sheets?: Array<{ properties?: { title?: string } }> }>("");
    const exists = meta.sheets?.some((sheet) => sheet.properties?.title === sheetName);
    if (exists) return;

    try {
        await sheetsRequest(":batchUpdate", {
            method: "POST",
            body: JSON.stringify({
                requests: [{ addSheet: { properties: { title: sheetName } } }],
            }),
        });
    } catch (error) {
        // Two submits at once can both try to create the tab; the loser should continue.
        if (!isAlreadyExistsError(error)) throw error;
    }
}

async function ensureHeaders(sheetName: string, headers: readonly string[]): Promise<void> {
    const existing = await sheetsRequest<{ values?: string[][] }>(valuesRange(sheetName, "A1:1"));
    const current = existing.values?.[0] ?? [];

    if (current.length === 0) {
        await sheetsRequest(`${valuesRange(sheetName, "A1")}?valueInputOption=RAW`, {
            method: "PUT",
            body: JSON.stringify({ values: [[...headers]] }),
        });
        return;
    }

    const exactMatch =
        current.length === headers.length &&
        headers.every((header, index) => current[index] === header);
    if (exactMatch) return;

    // Only grow to the right. Never rewrite existing header names — that would
    // misalign rows already on the sheet.
    const isPrefix = current.every((header, index) => header === headers[index]);
    if (isPrefix && headers.length > current.length) {
        const extra = headers.slice(current.length);
        const startCol = columnLetter(current.length + 1);
        await sheetsRequest(`${valuesRange(sheetName, `${startCol}1`)}?valueInputOption=RAW`, {
            method: "PUT",
            body: JSON.stringify({ values: [extra] }),
        });
        return;
    }

    console.error(
        `[google-sheets] Header row on "${sheetName}" does not match code. Leaving it unchanged to avoid scrambling existing rows.`
    );
}

function columnLetter(index: number): string {
    let n = index;
    let letter = "";
    while (n > 0) {
        const rem = (n - 1) % 26;
        letter = String.fromCharCode(65 + rem) + letter;
        n = Math.floor((n - 1) / 26);
    }
    return letter;
}

async function appendRow(sheetName: string, headers: readonly string[], values: string[]): Promise<void> {
    if (!isGoogleSheetsConfigured()) {
        throw new Error("Google Sheets is not configured (missing spreadsheet ID or service account)");
    }

    await ensureSheetTab(sheetName);
    await ensureHeaders(sheetName, headers);

    // RAW preserves leading zeros (phones, company numbers, auth codes).
    await sheetsRequest(
        `${valuesRange(sheetName, "A1")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        {
            method: "POST",
            body: JSON.stringify({ values: [values] }),
        }
    );
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

async function notifySheetsFailure(sheetName: string, values: string[], error: unknown): Promise<void> {
    const summary = values
        .slice(0, 6)
        .map((value) => escapeHtml(value || "—"))
        .join(" · ");

    try {
        await sendInternalEmail(
            `Google Sheets failed — ${sheetName} tab was not updated`,
            `
            <p>A client submission succeeded, but it was <strong>not written to Google Sheets</strong>.</p>
            <p>The client still got through and the normal notification email should still have sent. This row is missing from the spreadsheet until you add it by hand.</p>
            <table style="border-collapse:collapse;font-size:14px;margin:12px 0;">
              <tr><td style="padding:4px 8px;font-weight:600;">Tab</td><td style="padding:4px 8px;">${escapeHtml(sheetName)}</td></tr>
              <tr><td style="padding:4px 8px;font-weight:600;">When</td><td style="padding:4px 8px;">${escapeHtml(new Date().toISOString())}</td></tr>
              <tr><td style="padding:4px 8px;font-weight:600;">Details</td><td style="padding:4px 8px;">${summary}</td></tr>
              <tr><td style="padding:4px 8px;font-weight:600;">Error</td><td style="padding:4px 8px;font-family:monospace;">${escapeHtml(errorMessage(error))}</td></tr>
            </table>
            `
        );
    } catch (notifyError) {
        console.error("[google-sheets] Also failed to send the failure alert email:", notifyError);
    }
}

async function safeAppend(
    sheetName: string,
    headers: readonly string[],
    values: string[]
): Promise<void> {
    if (!isGoogleSheetsConfigured()) {
        console.error("[google-sheets] Not configured - skipping row append");
        await notifySheetsFailure(
            sheetName,
            values,
            new Error("Google Sheets is not configured (missing spreadsheet ID or service account)")
        );
        return;
    }

    try {
        await appendRow(sheetName, headers, values);
    } catch (firstError) {
        console.error("[google-sheets] First append failed, retrying once:", firstError);
        try {
            await appendRow(sheetName, headers, values);
        } catch (secondError) {
            console.error("[google-sheets] Failed to append row after retry:", secondError);
            await notifySheetsFailure(sheetName, values, secondError);
        }
    }
}

function formatAddress(address?: {
    line1?: string;
    line2?: string;
    town?: string;
    county?: string;
    postcode?: string;
    country?: string;
}): string {
    if (!address) return "";
    return [address.line1, address.line2, address.town, address.county, address.postcode, address.country]
        .filter(Boolean)
        .join(", ");
}

function formatDirectorsList(directors: unknown): string {
    if (!Array.isArray(directors) || directors.length === 0) return "";
    return directors
        .map((director) => {
            if (!director || typeof director !== "object") return "";
            const d = director as Record<string, unknown>;
            const name = `${cell(d.firstName)} ${cell(d.lastName)}`.trim();
            if (!name) return "";
            const bits = [name];
            if (d.role) bits.push(cell(d.role));
            if (d.dob) bits.push(`DOB ${cell(d.dob)}`);
            if (d.address) bits.push(cell(d.address));
            return bits.join(" — ");
        })
        .filter(Boolean)
        .join("; ");
}

function resolveShareholderName(
    shareholder: Record<string, unknown>,
    directors: Array<Record<string, unknown>>
): string {
    if (shareholder.kind === "business") {
        return cell(shareholder.businessName);
    }

    // Form leaves first/last blank when "also a director" — resolve via directorId.
    if (shareholder.isDirector === "yes" && shareholder.directorId) {
        const director = directors.find((d) => d.id === shareholder.directorId);
        if (director) {
            return `${cell(director.firstName)} ${cell(director.lastName)}`.trim();
        }
    }

    return `${cell(shareholder.firstName)} ${cell(shareholder.lastName)}`.trim();
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
        cell(payload.homeAddress),
        cell(payload.companyName),
        cell(payload.registrationNumber),
        cell(payload.companyAuthCode),
        cell(payload.businessUtr ?? payload.utrNumber),
        cell(payload.personalUtr),
        cell(payload.niNumber),
        cell(payload.hasPaye),
        cell(payload.accountsOfficeRef),
        cell(payload.payeRef),
        cell(payload.isVatRegistered),
        cell(payload.vatNumber),
        cell(payload.vatRegDate),
        cell(payload.natureOfBusiness),
        cell(payload.sourceOfFunds),
        cell(payload.tradingAddress),
        cell(payload.servicesRequired),
        cell(payload.incomeTypes),
        formatDirectorsList(payload.directors),
        cell(payload.photoId),
        cell(payload.proofOfAddress),
        JSON.stringify(payload),
    ]);
}

export async function appendIncorporationSubmission(payload: Record<string, unknown>): Promise<void> {
    const step2 = (payload.step2 ?? {}) as Record<string, unknown>;
    const step3 = (payload.step3 ?? {}) as Record<string, unknown>;
    const step4 = (payload.step4 ?? {}) as Record<string, unknown>;
    const step5 = (payload.step5 ?? {}) as { directors?: Array<Record<string, unknown>> };
    const step6 = (payload.step6 ?? {}) as { shareholders?: Array<Record<string, unknown>> };
    const step7 = (payload.step7 ?? {}) as {
        allocations?: Record<string, number>;
        standard?: boolean;
        customShareDescription?: string;
        shareClass?: string;
        valuePerShare?: string;
        currency?: string;
    };
    const step9 = (payload.step9 ?? {}) as { directorPersonalCodes?: Record<string, string> };
    const pscSummary = Array.isArray(payload.pscSummary) ? payload.pscSummary : [];
    const directorsList = Array.isArray(step5.directors) ? step5.directors : [];

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
        county?: string;
        postcode?: string;
        country?: string;
    };

    const principalLabel =
        step3.principal === "same"
            ? "Same as registered office"
            : step3.principal === "none"
              ? "No fixed principal place yet"
              : formatAddress(step3.principalAddr as typeof registered);

    const sicCodes = Array.isArray(step4.sicCodes)
        ? step4.sicCodes
              .map((item) => {
                  if (item && typeof item === "object" && "code" in item) {
                      const code = (item as { code?: string; description?: string }).code ?? "";
                      const description = (item as { code?: string; description?: string }).description ?? "";
                      if (!code) return "";
                      return description ? `${code} - ${description}` : code;
                  }
                  return "";
              })
              .filter(Boolean)
              .join("; ")
        : "";

    const directors = directorsList
        .map((d) => {
            const name = `${cell(d.firstName)} ${cell(d.lastName)}`.trim();
            if (!name) return "";
            const dob =
                d.dobDay && d.dobMonth && d.dobYear
                    ? `${cell(d.dobDay)}/${cell(d.dobMonth)}/${cell(d.dobYear)}`
                    : "";
            const corrAddress =
                d.corrType === "other"
                    ? formatAddress(d.corrAddress as typeof registered)
                    : `${formatAddress(registered)} (same as registered office)`;
            const homeAddress =
                d.homeType === "other"
                    ? formatAddress(d.homeAddress as typeof registered)
                    : `${d.corrType === "other" ? formatAddress(d.corrAddress as typeof registered) : formatAddress(registered)} (same as correspondence)`;
            const bits = [name];
            if (d.nationality) bits.push(cell(d.nationality));
            if (dob) bits.push(`DOB ${dob}`);
            if (d.countryResidence) bits.push(`resides ${cell(d.countryResidence)}`);
            if (corrAddress) bits.push(`corr: ${corrAddress}`);
            if (homeAddress) bits.push(`home: ${homeAddress}`);
            if (d.emailReminders) bits.push(`email ${cell(d.emailReminders)}`);
            return bits.join(" — ");
        })
        .filter(Boolean)
        .join("; ");

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
                  const name = resolveShareholderName(shareholder, directorsList);
                  if (!name) return "";
                  const kind = shareholder.kind === "business" ? "business" : "person";
                  const addr =
                      shareholder.kind === "business"
                          ? formatAddress(shareholder.businessAddress as typeof registered)
                          : shareholder.addrType === "other"
                            ? formatAddress(shareholder.addr as typeof registered)
                            : `${formatAddress(registered)} (same as registered office)`;
                  const acting =
                      shareholder.kind === "business" && (shareholder.actingFirst || shareholder.actingLast)
                          ? `; acting ${cell(shareholder.actingFirst)} ${cell(shareholder.actingLast)}`.trimEnd()
                          : "";
                  return `${name} (${shares} shares, ${kind}${addr ? `; ${addr}` : ""}${acting})`;
              })
              .filter(Boolean)
              .join("; ")
        : "";

    const shareStructure = step7.standard
        ? "Standard £1 ordinary shares"
        : cell(step7.customShareDescription) ||
          [cell(step7.shareClass), cell(step7.valuePerShare), cell(step7.currency)]
              .filter(Boolean)
              .join(" / ");

    const pscs = pscSummary
        .map((psc) => {
            if (!psc || typeof psc !== "object") return "";
            const p = psc as { name?: string; pct?: number };
            return p.name ? `${p.name} (${typeof p.pct === "number" ? p.pct.toFixed(1) : p.pct}%)` : "";
        })
        .filter(Boolean)
        .join("; ");

    const personalCodes = directorsList
        .map((d) => {
            const name = `${cell(d.firstName)} ${cell(d.lastName)}`.trim() || "Director";
            const code = step9.directorPersonalCodes?.[String(d.id)] ?? "";
            return code ? `${name}: ${code}` : "";
        })
        .filter(Boolean)
        .join("; ");

    const backupName = [cell(step2.backupName), cell(step2.backupEnding)].filter(Boolean).join(" ");

    await safeAppend(INCORPORATION_SHEET, INCORPORATION_HEADERS, [
        new Date().toISOString(),
        cell(step2.name),
        cell(step2.ending),
        backupName,
        cell(step3.registeredEmail),
        cell(step3.hmrcPhone),
        regionMap[String(step3.region ?? "")] ?? cell(step3.region),
        formatAddress(registered),
        principalLabel,
        cell(step4.businessDescription),
        sicCodes,
        directors,
        shareholders,
        String(totalShares),
        shareStructure,
        pscs || "None over 25%",
        personalCodes,
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
        "",
        "",
        "",
        `CIC: ${cell(payload.cic)}; Limited by guarantee: ${cell(payload.limitedByGuarantee)}`,
        "",
        "",
        "",
        "",
        "",
        "Needs team follow-up",
        "",
        JSON.stringify(payload),
    ]);
}
