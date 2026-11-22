import { NextResponse } from "next/server";
import {
  getDraft,
  normalizeCode,
  updateDraft,
  type OnboardingType,
} from "@/lib/onboarding-draft-store";

function parseType(value: unknown): OnboardingType | null {
  if (value === "business" || value === "self-assessment" || value === "both") {
    return value;
  }
  return null;
}

/**
 * New public forms are switched off: new clients now get a personal link from the team,
 * which creates its draft on the server. Drafts started before the switch can still be resumed.
 */
export async function POST() {
  return NextResponse.json(
    { error: "New clients now get a personal link from us. Please book a free call and we'll send yours." },
    { status: 410 }
  );
}

export async function GET(request: Request) {
  try {
    // The code is sent in a header so it stays out of URLs and server logs.
    const code = request.headers.get("x-resume-code") || new URL(request.url).searchParams.get("code") || "";
    const draft = await getDraft(code);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    return NextResponse.json(draft);
  } catch (err) {
    console.error("Failed to load onboarding draft", err);
    return NextResponse.json(
      { error: "Could not load draft. Please try again." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const code = normalizeCode(String(body?.code || ""));
    const onboardingType = parseType(body?.onboardingType);
    const outerStep = Number(body?.outerStep);
    const formStep = Number(body?.formStep);
    const state = body?.state;

    if (!code || !onboardingType || !Number.isFinite(outerStep) || !Number.isFinite(formStep) || !state) {
      return NextResponse.json(
        { error: "code, onboardingType, outerStep, formStep, and state are required" },
        { status: 400 }
      );
    }

    const draft = await updateDraft({
      code,
      onboardingType,
      outerStep,
      formStep,
      state,
    });
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, code: draft.code, updatedAt: draft.updatedAt });
  } catch (err) {
    console.error("Failed to save onboarding draft", err);
    return NextResponse.json(
      { error: "Could not save draft. Please try again." },
      { status: 500 }
    );
  }
}
