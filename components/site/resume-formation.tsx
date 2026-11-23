"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** The resume box on the home page. The formation form picks the code up when it opens. */
export function ResumeFormation() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const resume = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length !== 8) return setError("Codes are 8 characters, for example AB3K7MPQ.");
    setBusy(true);
    try {
      const res = await fetch("/api/incorporation/draft", { headers: { "x-resume-code": clean } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(res.status === 404 ? "We couldn't find a form with that code." : data.error || "Please try again.");
      }
      try {
        sessionStorage.setItem("incorporation-resume-code", clean);
      } catch {
        /* the form will ask for the code again */
      }
      router.push("/incorporate");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
      setBusy(false);
    }
  };

  return (
    <form
      id="resume"
      onSubmit={resume}
      className="flex scroll-mt-24 flex-wrap items-center justify-between gap-4 rounded-[20px] border border-stone-200 bg-white p-6"
    >
      <div className="min-w-0 flex-[1_1_320px] space-y-1">
        <label htmlFor="resume-code" className="text-base font-semibold text-stone-900">
          Already started your company form?
        </label>
        <p className="text-sm text-stone-600">Enter the 8-character code we gave you to carry on where you left off.</p>
        {error && (
          <p role="alert" className="pt-1 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2.5">
        <input
          id="resume-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="AB3K7MPQ"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          className="h-12 w-44 rounded-xl border border-stone-300 bg-white px-3.5 font-mono text-base uppercase tracking-[0.1em] text-stone-900 outline-none placeholder:text-stone-400 focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-12 items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 text-base font-medium text-stone-900 hover:bg-stone-50 disabled:opacity-70"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Resume
        </button>
      </div>
    </form>
  );
}
