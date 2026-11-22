import { NextResponse } from "next/server";
import { FlowError } from "@/lib/engagements/actions";
import { memberForApi } from "./session";
import type { TeamMember } from "./team";

export const unauthorised = () => NextResponse.json({ error: "Please sign in again." }, { status: 401 });

/** Runs a team API handler, signed-in members only. Admin-only when `adminOnly` is set. */
export async function withMember(
  handler: (member: TeamMember) => Promise<Response>,
  opts: { adminOnly?: boolean } = {}
): Promise<Response> {
  const member = await memberForApi();
  if (!member) return unauthorised();
  if (opts.adminOnly && member.role !== "admin") {
    return NextResponse.json({ error: "Only admins can do that." }, { status: 403 });
  }
  try {
    return await handler(member);
  } catch (error) {
    return errorResponse(error);
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof FlowError) return NextResponse.json({ error: error.message, ...(error.details || {}) }, { status: error.status });
  if (error instanceof Error && /^(Enter|Choose|Check|Price list|Service|Owners|That person)/.test(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error("[admin]", error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
