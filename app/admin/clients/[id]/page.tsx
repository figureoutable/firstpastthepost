import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { AlertTriangle, ArrowLeft, ExternalLink, FileText, Pencil, Send } from "lucide-react";
import { AdminShell, card } from "@/components/admin/admin-shell";
import { LinkActions, ResolveFlag, RetryDrive } from "@/components/admin/client-actions";
import { amlState, StagePill } from "@/components/admin/stage-pill";
import { requireMember } from "@/lib/admin/session";
import { originFromHeaders } from "@/lib/env";
import { docUrl, folderUrl, isDriveConfigured } from "@/lib/google-drive";
import { amlFor } from "@/lib/engagements/aml";
import { isExpired, stageSummary } from "@/lib/engagements/flow";
import { formatPence, linePrice, totalsText } from "@/lib/engagements/letter";
import { getEngagement, openFlags } from "@/lib/engagements/store";
import { BILLING_LABEL, CLIENT_TYPE_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/engagements/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Client" };

function when(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-stone-500">{label}</dt>
      <dd className="min-w-0 text-sm text-stone-900">{children}</dd>
    </div>
  );
}

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const { id } = await params;
  const e = await getEngagement(id);
  if (!e) notFound();

  const aml = await amlFor(e);
  const s = stageSummary(e, aml);
  const flags = openFlags(e);
  const h = await headers();
  const link = `${originFromHeaders(h)}/start/${e.token}`;
  const drive = e.signature?.drive;
  const signedAny = Boolean(e.signature || e.letters?.some((l) => l.signature));
  const canEdit = e.status === "open" && !signedAny;
  const lettersToFile = (e.letters || []).some((l) => l.signature && !l.drive?.signedPdfFileId);
  const expired = isExpired(e);
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });

  return (
    <AdminShell member={member}>
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" /> All clients
      </Link>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-clay-700">{CLIENT_TYPE_LABEL[e.client.type]}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-[28px]">{e.client.companyName || e.client.name}</h1>
          <p className="text-sm text-stone-600">
            {e.client.companyName ? `${e.client.name} · ` : ""}
            {e.client.email}
            {e.client.companyNumber ? ` · Company ${e.client.companyNumber}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "self-start rounded-full px-3 py-1 text-xs font-semibold sm:self-auto",
            e.status === "complete" ? "bg-forest-50 text-forest-800" : e.status === "cancelled" ? "bg-stone-200 text-stone-600" : "bg-amber-50 text-amber-800"
          )}
        >
          {e.status === "complete" ? "Finished" : e.status === "cancelled" ? "Cancelled" : "In progress"}
        </span>
      </div>

      {flags.length > 0 && (
        <div className="mb-6 space-y-2">
          {flags.map((f) => (
            <div key={f.id} className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-red-900">{f.message}</p>
                <p className="text-xs text-red-700/80">{when(f.at)}</p>
              </div>
              <ResolveFlag id={e.id} flagId={f.id} />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-5">
          <section className={cn(card, "p-5 sm:p-6")}>
            <h2 className="mb-2 text-base font-semibold text-stone-900">Progress</h2>
            <dl className="divide-y divide-stone-100">
              <Row label="Link">
                <StagePill {...s.link} />
                <span className="ml-2 text-xs text-stone-500">
                  {e.firstOpenedAt ? `Opened ${when(e.firstOpenedAt)}` : e.linkSentAt ? `Sent ${when(e.linkSentAt)}` : "Not emailed. Copy it from the right."}
                  {e.reminderSentAt ? ` · Reminder sent ${when(e.reminderSentAt)}` : ""}
                </span>
              </Row>
              <Row label={(e.letters?.length || 0) > 1 ? "Engagement letters" : "Engagement letter"}>
                {e.letters?.length ? (
                  <div className="space-y-3">
                    <StagePill {...s.letter} />
                    {e.letters.map((l) => {
                      const base = `/api/admin/clients/${e.id}/letter?kind=${l.kind}`;
                      return (
                        <div key={l.kind} className="rounded-xl border border-stone-200 p-3">
                          <p className="text-sm font-medium text-stone-900">{l.title.replace(/^Engagement letter: /, "")}</p>
                          <p className="text-xs text-stone-500">
                            {l.signature
                              ? `Signed by ${l.signature.name}, ${when(l.signature.signedAt)}. ${l.signature.startNow ? "Asked us to start within the 14-day cancellation period." : "Did not ask us to start within the 14 days."}`
                              : `Issued ${when(l.issuedAt)}, not signed yet. ${l.pages ? `${l.pages} pages.` : ""}`}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            {l.signature && (
                              <a href={`${base}&version=signed`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-clay-700 hover:text-clay-800">
                                <FileText className="h-4 w-4" /> Signed PDF
                              </a>
                            )}
                            <a href={`${base}&version=issued`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900">
                              <FileText className="h-3.5 w-3.5" /> {l.signature ? "Letter as issued" : "View letter"}
                            </a>
                            {l.drive?.docFileId && (
                              <a href={docUrl(l.drive.docFileId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900">
                                <ExternalLink className="h-3.5 w-3.5" /> Google Doc
                              </a>
                            )}
                            {l.drive?.folderId && (
                              <a href={folderUrl(l.drive.folderId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900">
                                <ExternalLink className="h-3.5 w-3.5" /> Client folder
                              </a>
                            )}
                            {l.renderedBy === "libreoffice" && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">Local test copy</span>}
                          </div>
                        </div>
                      );
                    })}
                    {lettersToFile && isDriveConfigured() && <RetryDrive id={e.id} />}
                  </div>
                ) : !e.letter ? (
                  <div className="space-y-2">
                    <StagePill {...s.letter} />
                    <p className="text-xs text-stone-500">The letter is sent once the company is registered, with the details from Companies House.</p>
                    {e.status === "complete" && (
                      <Link
                        href={`/admin/new?from=${e.id}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-clay-500 px-3 text-sm font-semibold text-white hover:bg-clay-600"
                      >
                        <Send className="h-4 w-4" /> Send engagement letter
                      </Link>
                    )}
                  </div>
                ) : (
                <div className="space-y-2">
                  <div>
                    <StagePill {...s.letter} />
                    {e.signature && <span className="ml-2 text-xs text-stone-500">by {e.signature.name}, {when(e.signature.signedAt)}</span>}
                  </div>
                  {e.signature && (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <a href={`/api/admin/clients/${e.id}/letter`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-clay-700 hover:text-clay-800">
                        <FileText className="h-4 w-4" /> View signed PDF
                      </a>
                      {drive?.folderId ? (
                        <a href={`https://drive.google.com/drive/folders/${drive.folderId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900">
                          <ExternalLink className="h-3.5 w-3.5" /> Open in Google Drive
                        </a>
                      ) : (
                        <span className="text-xs text-stone-500">{drive?.error ? "Not saved to Drive yet." : "Google Drive not connected yet."}</span>
                      )}
                    </div>
                  )}
                  {e.signature && !drive?.folderId && isDriveConfigured() && <RetryDrive id={e.id} />}
                </div>
                )}
              </Row>
              <Row label="Payment">
                <div className="space-y-1">
                  <div>
                    <StagePill {...s.payment} />
                    <span className="ml-2 text-xs text-stone-500">{PAYMENT_METHOD_LABEL[e.payment.method]}</span>
                    {e.payment.simulated && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">Test only</span>}
                  </div>
                  {e.paymentNote && <p className="text-xs text-stone-500">Note: {e.paymentNote}</p>}
                  {e.payment.method !== "direct_debit" && (
                    <p className="text-xs text-stone-500">Chosen by {e.paymentChosenBy}</p>
                  )}
                  {e.payment.gocardless?.mandateId && <p className="text-xs text-stone-500">GoCardless mandate {e.payment.gocardless.mandateId}</p>}
                  {e.payment.method === "card" && <p className="text-xs text-stone-500">Amount {formatPence(e.payment.stripe?.amountPence ?? e.cardAmountPence ?? 0)}</p>}
                  {e.payment.method === "direct_debit" && ["submitted", "active"].includes(e.payment.status) && (
                    <p className="text-xs text-stone-500">Raise the repeating invoice in Xero as usual. GoCardless in Xero will collect it.</p>
                  )}
                </div>
              </Row>
              <Row label="Details and ID">
                <StagePill {...s.onboarding} />
                {e.onboarding?.completedAt && <span className="ml-2 text-xs text-stone-500">{when(e.onboarding.completedAt)}. Full details are in the email.</span>}
              </Row>
              <Row label="AML">
                <StagePill state={amlState(aml.state)} label={aml.label} />
                {aml.state === "not_started" && e.onboarding?.completedAt && (
                  <span className="ml-2 text-xs text-stone-500">Start it from the onboarding email, as now.</span>
                )}
              </Row>
            </dl>
          </section>

          <section className={cn(card, "p-5 sm:p-6")}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-stone-900">Services and fees</h2>
              {canEdit && (
                <Link
                  href={`/admin/clients/${e.id}/edit`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-xs font-medium text-stone-800 hover:bg-stone-50"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
              )}
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-stone-100">
                {e.lines.map((l) => (
                  <tr key={l.serviceId}>
                    <td className="py-2 text-stone-800">{l.name}</td>
                    <td className="py-2 text-stone-500">{BILLING_LABEL[l.billing]}</td>
                    <td className="py-2 text-right tabular-nums text-stone-900">{linePrice(l.pricePence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {e.client.type === "formation" && e.lines.length === 0 ? (
              <p className="text-sm text-stone-600">Company formation: free when they appoint us as accountants.</p>
            ) : (
              <p className="mt-3 text-sm font-semibold text-stone-900">Total: {totalsText(e.lines).join(", ") || "Free"}</p>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className={cn(card, "p-5")}>
            <h2 className="mb-3 text-base font-semibold text-stone-900">Client link</h2>
            {e.status === "cancelled" ? (
              <p className="text-sm text-stone-500">This link was cancelled and no longer works.</p>
            ) : (
              <>
                <LinkActions id={e.id} link={link} canResend={e.status === "open"} canCancel={e.status === "open"} />
                {e.status === "open" && e.expiresAt && (
                  <p className={cn("mt-3 text-xs", expired ? "font-medium text-red-700" : "text-stone-500")}>
                    {expired
                      ? `Expired on ${day(e.expiresAt)}. Email the link again to give it another 60 days.`
                      : `Works until ${day(e.expiresAt)}. Emailing it again adds another 60 days.`}
                  </p>
                )}
                {canEdit && <p className="mt-2 text-xs text-stone-500">You can edit the details and fees until the client signs.</p>}
              </>
            )}
          </section>

          <section className={cn(card, "p-5")}>
            <h2 className="mb-3 text-base font-semibold text-stone-900">Activity</h2>
            <ol className="relative space-y-3 border-l border-stone-200 pl-4">
              {[...e.events].reverse().map((ev, i) => (
                <li key={`${ev.at}-${i}`} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-stone-300 ring-4 ring-white" />
                  <p className="text-sm text-stone-800">{ev.action}</p>
                  <p className="text-xs text-stone-500">
                    {when(ev.at)} · {ev.by === "client" ? "Client" : ev.by === "system" ? "Automatic" : ev.by}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
