"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setState("sending");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Please try again.");
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
      setState("idle");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-baseline justify-center gap-2">
          <Image src="/figures-logo.png" alt="Figures" width={693} height={206} className="h-6 w-auto" priority />
          <span className="text-sm font-medium text-stone-400">Team</span>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          {state === "sent" ? (
            <div className="space-y-3 text-center">
              <MailCheck className="mx-auto h-10 w-10 text-forest-600" />
              <h1 className="text-lg font-semibold text-stone-900">Check your email</h1>
              <p className="text-sm text-stone-600">
                If <strong>{email}</strong> is on the team, a sign-in link is on its way. It works once and expires in 15 minutes.
              </p>
              <button type="button" onClick={() => setState("idle")} className="text-sm font-medium text-clay-700 hover:text-clay-800">
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h1 className="text-lg font-semibold text-stone-900">Sign in</h1>
                <p className="mt-1 text-sm text-stone-600">We&apos;ll email you a link. No password needed.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@tryfigures.com" />
              </div>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <Button type="submit" className="w-full" disabled={state === "sending"}>
                {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Email me a sign-in link
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
