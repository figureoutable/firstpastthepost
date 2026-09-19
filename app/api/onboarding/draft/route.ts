import { NextResponse } from "next/server";
import {
  createDraft,
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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const onboardingType = parseType(body?.onboardingType);
    if (!onboardingType) {
      return NextResponse.json(
        { error: "onboardingType is required (business | self-assessment | both)" },
        { status: 400 }
      );
    }

    const draft = await createDraft({
      onboardingType,
      outerStep: Number(body?.outerStep) || 2,
      formStep: Number(body?.formStep) || 1,
      state: typeof body?.state === "object" && body.state ? body.state : {},
    });
    return NextResponse.json({ code: draft.code });
  } catch (err) {
    console.error("Failed to create onboarding draft", err);
    return NextResponse.json(
      { error: "Could not create a resume code. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code") || "";
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
