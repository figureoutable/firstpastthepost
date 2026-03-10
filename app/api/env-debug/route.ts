import { NextResponse } from "next/server";

// Temporary debug endpoint to verify which env vars are available at runtime.
// Safe to delete once AML issue is resolved.
export async function GET() {
    return NextResponse.json({
        amlInitiateSecretConfigured: !!process.env.AML_INITIATE_SECRET,
        nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    });
}

