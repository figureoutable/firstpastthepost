import { NextResponse } from "next/server";
import { initialState } from "@/components/incorporation/state";
import {
  createDraft,
  getDraft,
  normalizeCode,
  updateDraft,
} from "@/lib/incorporation-draft-store";

export async function POST() {
  try {
    const draft = await createDraft({
      step: 1,
      phase: "form",
      state: initialState(),
    });
    return NextResponse.json({ code: draft.code });
  } catch (err) {
    console.error("Failed to create incorporation draft", err);
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
    console.error("Failed to load incorporation draft", err);
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
    const step = Number(body?.step);
    const phase = body?.phase === "banner" || body?.phase === "form" ? body.phase : null;
    const state = body?.state;

    if (!code || !Number.isFinite(step) || !phase || !state) {
      return NextResponse.json(
        { error: "code, step, phase, and state are required" },
        { status: 400 }
      );
    }

    const draft = await updateDraft({ code, step, phase, state });
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, code: draft.code, updatedAt: draft.updatedAt });
  } catch (err) {
    console.error("Failed to save incorporation draft", err);
    return NextResponse.json(
      { error: "Could not save draft. Please try again." },
      { status: 500 }
    );
  }
}
