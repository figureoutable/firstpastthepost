"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, FileText, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "company" | "sa" | "partnership";
type Info = { fileName: string; uploadedAt: string; uploadedBy: string };

const LETTERS: { kind: Kind; label: string; detail: string }[] = [
  { kind: "company", label: "Company", detail: "Accounts, corporation tax, VAT and payroll" },
  { kind: "sa", label: "Self Assessment", detail: "Includes Making Tax Digital for Income Tax" },
  { kind: "partnership", label: "Partnership", detail: "Partnership tax return" },
];

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Row({ kind, label, detail, info }: { kind: Kind; label: string; detail: string; info?: Info }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const upload = async (file: File) => {
    setError("");
    setDone(false);
    setBusy(true);
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      const res = await fetch("/api/admin/settings/letter-templates", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not upload.");
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", info ? "bg-forest-50 text-forest-600" : "bg-stone-100 text-stone-400")}>
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-stone-900">{label}</p>
          <p className="text-xs text-stone-500">{info ? `${info.fileName}, ${when(info.uploadedAt)}` : detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {info && (
            <a href={`/api/admin/settings/letter-templates?kind=${kind}`} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label={`Download the ${label} template`}>
              <Download className="h-4 w-4" />
            </a>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 text-xs font-medium text-stone-800 hover:bg-stone-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <Check className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
            {info ? "Replace" : "Upload"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </div>
      </div>
      {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
    </li>
  );
}

export function LetterTemplatesEditor({ meta }: { meta: Partial<Record<Kind, Info>> }) {
  return (
    <div>
      <ul className="divide-y divide-stone-100">
        {LETTERS.map((l) => (
          <Row key={l.kind} {...l} info={meta[l.kind]} />
        ))}
      </ul>
      <p className="mt-2 text-xs leading-relaxed text-stone-500">
        Your Word templates. The site only fills in the date, address, Dear, period end dates and the fee table, removes the Parts not needed and the yellow highlights. Replacing a
        template only affects new letters.
      </p>
    </div>
  );
}
