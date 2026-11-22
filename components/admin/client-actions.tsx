"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, RefreshCw, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

async function act(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/admin/clients/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
}

export function LinkActions({ id, link, canResend, canCancel }: { id: string; link: string; canResend: boolean; canCancel: boolean }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const run = async (action: string) => {
    setBusy(action);
    setMessage("");
    try {
      await act(id, { action });
      setMessage(action === "resend" ? "Link emailed again." : "Link cancelled.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2">
        <code className="min-w-0 flex-1 truncate px-2 text-xs text-stone-700">{link}</code>
        <Button
          size="sm"
          variant="outline"
          className="bg-white"
          onClick={async () => {
            await navigator.clipboard.writeText(link).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {canResend && (
          <Button size="sm" variant="outline" onClick={() => run("resend")} disabled={Boolean(busy)}>
            {busy === "resend" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Email link again
          </Button>
        )}
        {canCancel && (
          <Button size="sm" variant="outline" onClick={() => setConfirmCancel(true)} disabled={Boolean(busy)} className="text-red-700 hover:text-red-800">
            <XCircle className="h-3.5 w-3.5" /> Cancel link
          </Button>
        )}
      </div>
      {message && <p className="text-sm text-stone-600">{message}</p>}
      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this link?"
        description="The client won't be able to use it any more. Nothing in GoCardless, Stripe or Xero is changed."
        confirmLabel="Cancel link"
        cancelLabel="Keep it"
        onConfirm={() => {
          setConfirmCancel(false);
          void run("cancel");
        }}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}

export function RetryDrive({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            await act(id, { action: "retry-drive" });
            router.refresh();
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Retry saving to Drive
      </Button>
      {message && <span className="text-xs text-red-700">{message}</span>}
    </div>
  );
}

export function ResolveFlag({ id, flagId }: { id: string; flagId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await act(id, { action: "resolve-flag", flagId });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="shrink-0 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-50"
    >
      {busy ? "Saving…" : "Mark as dealt with"}
    </button>
  );
}
