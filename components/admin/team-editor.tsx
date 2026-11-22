"use client";

import { useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamMember } from "@/lib/admin/team";

export function TeamEditor({ team: initial, owners, me }: { team: TeamMember[]; owners: string[]; me: string }) {
  const [team, setTeam] = useState(initial);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save.");
      setTeam(data.team);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
        {team.map((m) => (
          <li key={m.email} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-stone-900">
                {m.email} {m.email === me && <span className="text-stone-400">(you)</span>}
              </p>
              <p className="text-xs text-stone-500">{m.role === "admin" ? "Admin: can change prices and the team" : "Team: can add clients and see the board"}</p>
            </div>
            {!owners.includes(m.email) && (
              <button type="button" aria-label={`Remove ${m.email}`} disabled={busy} onClick={() => call({ action: "remove", email: m.email })} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input type="email" aria-label="Email to add" placeholder="name@tryfigures.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as "staff" | "admin")} className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm">
          <option value="staff">Team</option>
          <option value="admin">Admin</option>
        </select>
        <Button type="button" onClick={() => call({ action: "add", email, role })} disabled={busy || !email}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-stone-500">They sign in with an emailed link. Removing someone signs them out straight away.</p>
    </div>
  );
}
