import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { deleteFiles, putJson, readJson } from "@/lib/private-blob";
import { findMember, type TeamMember } from "./team";

/**
 * Team sign-in by emailed link. No passwords and no Google set-up needed.
 * The link is single use and lasts 15 minutes; the session lasts 30 days.
 */
export const SESSION_COOKIE = "figures_team";
const SESSION_DAYS = 30;
const LOGIN_MINUTES = 15;

function secret(): string | null {
  const value = process.env.ADMIN_SESSION_SECRET || process.env.AML_INITIATE_SECRET;
  if (value) return value;
  // Local development only.
  if (!process.env.VERCEL) return "local-development-only-secret";
  return null;
}

export function isSignInConfigured(): boolean {
  return secret() !== null;
}

function hmac(value: string): string {
  const key = secret();
  if (!key) throw new Error("ADMIN_SESSION_SECRET is not set");
  return crypto.createHmac("sha256", key).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function sessionValue(email: string): string {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ email, expires })).toString("base64url");
  return `${payload}.${hmac(`session:${payload}`)}`;
}

function readSessionValue(value: string | undefined): string | null {
  if (!value || !secret()) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig || !safeEqual(sig, hmac(`session:${payload}`))) return null;
  try {
    const { email, expires } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof email !== "string" || typeof expires !== "number" || expires < Date.now()) return null;
    return email;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

/** The signed-in team member, or null. Removing someone from the team signs them out straight away. */
export async function currentMember(): Promise<TeamMember | null> {
  const store = await cookies();
  const email = readSessionValue(store.get(SESSION_COOKIE)?.value);
  if (!email) return null;
  return findMember(email);
}

/** For pages: sends anyone not signed in to the sign-in page. */
export async function requireMember(): Promise<TeamMember> {
  const member = await currentMember();
  if (!member) redirect("/admin/login");
  return member;
}

/** For API routes: returns the member or null (caller returns 401). */
export async function memberForApi(): Promise<TeamMember | null> {
  return currentMember();
}

// ---- Sign-in links ----

const LOGIN_PREFIX = "auth/login-links/";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createLoginToken(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  await putJson(`${LOGIN_PREFIX}${hashToken(token)}.json`, {
    email,
    expires: Date.now() + LOGIN_MINUTES * 60 * 1000,
  });
  return token;
}

/** Uses up a sign-in link. Returns the email it was for, or null if it is invalid, used or expired. */
export async function consumeLoginToken(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const path = `${LOGIN_PREFIX}${hashToken(token)}.json`;
  const record = await readJson<{ email: string; expires: number }>(path);
  if (!record) return null;
  await deleteFiles([path]).catch(() => {});
  if (record.expires < Date.now()) return null;
  return record.email;
}
