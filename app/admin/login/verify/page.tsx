"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The token sits after # in the link, so it never reaches server logs. A button press uses it. */
export default function VerifyPage() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Read once on load: the token lives in the part of the address after #.
    setToken(window.location.hash.slice(1));
  }, []);

  const signIn = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Please ask for a new link.");
      // Full page load, so the new sign-in is picked up everywhere.
      window.location.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please ask for a new link.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <Image src="/figures-logo.png" alt="Figures" width={693} height={206} className="mx-auto mb-6 h-6 w-auto" />
        {error ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-red-700">{error}</p>
            <a href="/admin/login" className="text-sm font-medium text-clay-700">Get a new link</a>
          </div>
        ) : (
          <Button onClick={signIn} disabled={!token || busy} className="w-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in to Figures team
          </Button>
        )}
      </div>
    </div>
  );
}
