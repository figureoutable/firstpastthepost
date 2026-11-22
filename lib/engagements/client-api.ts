import { NextResponse } from "next/server";
import { FlowError } from "./actions";
import { getEngagementByToken } from "./store";
import type { Engagement } from "./types";

/** Runs a client-link API handler. The token in the link is the only key. */
export async function withEngagement(
  params: Promise<{ token: string }>,
  handler: (e: Engagement) => Promise<Response>
): Promise<Response> {
  try {
    const { token } = await params;
    const e = await getEngagementByToken(token);
    if (!e) return NextResponse.json({ error: "This link is not valid. Please check it or contact us." }, { status: 404 });
    return await handler(e);
  } catch (error) {
    if (error instanceof FlowError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[start]", error);
    return NextResponse.json({ error: "Something went wrong. Please try again in a moment." }, { status: 500 });
  }
}
