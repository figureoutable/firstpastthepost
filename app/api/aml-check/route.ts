import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function toDisplayLabel(key: string): string {
    const customLabels: Record<string, string> = {
        onboardingType: "Onboarding Type",
        fullName: "Full Name",
        fullNamePassport: "Full Name (Passport)",
        email: "Email",
        companyName: "Company Name",
        registrationNumber: "Company Number",
        businessUtr: "Business UTR",
        personalUtr: "Personal UTR",
        utrNumber: "UTR Number",
        niNumber: "National Insurance Number",
        companyAuthCode: "Company Auth Code",
        hasPaye: "Has PAYE Scheme",
        accountsOfficeRef: "Accounts Office Reference",
        payeRef: "PAYE Reference",
        isVatRegistered: "VAT Registered",
        vatNumber: "VAT Number",
        vatRegDate: "VAT Registration Date",
        natureOfBusiness: "Nature of Business",
        sourceOfFunds: "Source of Funds",
        tradingAddress: "Trading Address",
        servicesRequired: "Services Required",
        incomeTypes: "Income Types",
        otherIncome: "Other Income",
        expectsForeignIncome: "Expects Foreign Income",
        foreignIncomeDetails: "Foreign Income Details",
        homeAddress: "Home Address",
        phoneNumber: "Phone Number",
        isPep: "Politically Exposed Person (PEP)",
        hasSanctions: "Links to Sanctioned/High-Risk Jurisdictions",
        hasHighRiskIncome: "High-Risk Jurisdictions/Income",
        highRiskDetails: "High-Risk Details",
        financialDifficulty: "Financial Difficulty History",
        financialDifficultyDetails: "Financial Difficulty Details",
        hasComplexStructure: "Complex Ownership Structure",
        structureDescription: "Structure Description",
        hasBankruptcy: "Bankruptcy/Disqualification History",
        bankruptcyDescription: "Bankruptcy/Disqualification Details",
        directors: "Directors/Owners",
        confirmed: "Final Confirmation",
    };

    if (customLabels[key]) return customLabels[key];
    return key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase())
        .trim();
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === "") return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return escapeHtml(value);
    if (Array.isArray(value)) {
        if (value.length === 0) return "None";
        if (value.every((item) => typeof item === "string" || typeof item === "number")) {
            return escapeHtml(value.join(", "));
        }

        return value
            .map((item, index) => {
                if (item && typeof item === "object") {
                    const lines = Object.entries(item as Record<string, unknown>)
                        .filter(([k]) => k !== "id")
                        .map(([k, v]) => `<div><strong>${escapeHtml(toDisplayLabel(k))}:</strong> ${formatValue(v)}</div>`)
                        .join("");
                    return `<div style="margin-bottom: 10px;"><strong>Entry ${index + 1}</strong>${lines}</div>`;
                }
                return `<div>${escapeHtml(String(item))}</div>`;
            })
            .join("");
    }

    if (typeof value === "object") {
        return escapeHtml(JSON.stringify(value));
    }

    return escapeHtml(String(value));
}

function renderRows(payload: Record<string, unknown>): string {
    const excluded = new Set(["photoId", "proofOfAddress"]);
    const preferredOrder = [
        "onboardingType",
        "fullNamePassport",
        "fullName",
        "email",
        "phoneNumber",
        "homeAddress",
        "companyName",
        "registrationNumber",
    ];

    const keys = Object.keys(payload).filter((k) => !excluded.has(k));
    keys.sort((a, b) => {
        const ai = preferredOrder.indexOf(a);
        const bi = preferredOrder.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });

    return keys
        .map((key) => {
            const value = payload[key];
            return `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; vertical-align: top; width: 40%;">${escapeHtml(toDisplayLabel(key))}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; vertical-align: top;">${formatValue(value)}</td>
                </tr>
            `;
        })
        .join("");
}

export async function GET() {
    return NextResponse.json({ message: 'Use POST' }, { status: 405 });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            onboardingType,
            companyName,
            registrationNumber,
            fullName,
            fullNamePassport,
            email,
            photoId,
            proofOfAddress
        } = body;

        // Basic Validation
        if (!onboardingType) {
            return NextResponse.json(
                { message: 'Missing onboarding type' },
                { status: 400 }
            );
        }

        if ((onboardingType === 'business' || onboardingType === 'both') && (!companyName || !registrationNumber)) {
            // Only strictly required for business/both types in this mock
            if (onboardingType === 'business') {
                return NextResponse.json(
                    { message: 'Missing Company Details' },
                    { status: 400 }
                );
            }
        }

        // Brief simulated AML check delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Simulate AML Check Logic (Mock)
        if (companyName && companyName.toLowerCase().includes("risky")) {
            return NextResponse.json(
                { message: 'AML Check Failed: Company flagged.' },
                { status: 403 }
            );
        }

        // Send Email via Resend if instance is available (with 10s timeout so API never hangs)
        if (resend) {
            try {
                await Promise.race([
                    resend.emails.send({
                    from: 'Figures Onboarding <onboarding@resend.dev>',
                    to: ['joshua@tryfigures.com'], // Updated to user's requested email
                    subject: `New Onboarding: ${companyName || fullName || fullNamePassport}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #111;">New Onboarding Submission</h2>
                            <p>A new ${onboardingType} onboarding request has been submitted.</p>
                            
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                ${renderRows(body as Record<string, unknown>)}
                            </table>

                            <h3 style="color: #111; margin-top: 30px;">Verification Documents</h3>
                            <div style="display: flex; gap: 10px; margin-top: 10px;">
                                ${photoId ? `<a href="${photoId}" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Photo ID</a>` : ''}
                                ${proofOfAddress ? `<a href="${proofOfAddress}" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Proof of Address</a>` : ''}
                            </div>

                            <p style="color: #666; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
                                This is an automated notification from the Figures Onboarding System.
                            </p>
                        </div>
                    `
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Email timeout")), 10000)),
                ]);
            } catch (emailError) {
                console.error("Resend Error:", emailError);
            }
        }

        return NextResponse.json(
            { message: 'Verification successful', status: 'cleared' },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
