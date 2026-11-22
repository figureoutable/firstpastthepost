import { putJson, readJson } from "@/lib/private-blob";
import { isEmail } from "@/lib/onboarding-fields";

export type Role = "admin" | "staff";
export interface TeamMember {
  email: string;
  role: Role;
  addedAt: string;
  addedBy: string;
}

const PATH = "settings/team.json";

/** Always admins, and cannot be removed from the screen. Defaults to Josh. */
export function ownerEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "joshua@tryfigures.com";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getTeam(): Promise<TeamMember[]> {
  const saved = (await readJson<TeamMember[]>(PATH)) || [];
  const owners = ownerEmails();
  const merged: TeamMember[] = owners.map((email) => ({ email, role: "admin", addedAt: "", addedBy: "owner" }));
  for (const member of saved) {
    if (!owners.includes(member.email)) merged.push(member);
  }
  return merged;
}

export async function findMember(email: string): Promise<TeamMember | null> {
  const normalized = email.trim().toLowerCase();
  const team = await getTeam();
  return team.find((m) => m.email === normalized) || null;
}

export async function addMember(email: string, role: Role, by: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!isEmail(normalized)) throw new Error("Enter a valid email address.");
  if (ownerEmails().includes(normalized)) throw new Error("That person is already an admin.");
  const saved = ((await readJson<TeamMember[]>(PATH)) || []).filter((m) => m.email !== normalized);
  saved.push({ email: normalized, role, addedAt: new Date().toISOString(), addedBy: by });
  await putJson(PATH, saved);
}

export async function removeMember(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (ownerEmails().includes(normalized)) throw new Error("Owners can only be changed in Vercel (ADMIN_EMAILS).");
  const saved = ((await readJson<TeamMember[]>(PATH)) || []).filter((m) => m.email !== normalized);
  await putJson(PATH, saved);
}
