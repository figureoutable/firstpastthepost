import { redirect } from "next/navigation";
import { AdminShell, AdminTitle, card } from "@/components/admin/admin-shell";
import { OptionsEditor } from "@/components/admin/options-editor";
import { PriceListEditor } from "@/components/admin/price-list-editor";
import { TeamEditor } from "@/components/admin/team-editor";
import { requireMember } from "@/lib/admin/session";
import { getTeam, ownerEmails } from "@/lib/admin/team";
import { getPriceList } from "@/lib/engagements/price-list";
import { getSettings } from "@/lib/engagements/settings";
import { isDriveConfigured } from "@/lib/google-drive";
import { goCardlessEnvironment, isGoCardlessConfigured } from "@/lib/payments/gocardless";
import { isStripeConfigured } from "@/lib/payments/stripe";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

function Status({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", ok ? "bg-forest-500" : "bg-stone-300")} />
      <div>
        <p className="text-sm font-medium text-stone-900">{label}</p>
        <p className="text-xs text-stone-500">{detail}</p>
      </div>
    </li>
  );
}

export default async function SettingsPage() {
  const member = await requireMember();
  if (member.role !== "admin") redirect("/admin");
  const [priceList, team, options] = await Promise.all([getPriceList(), getTeam(), getSettings()]);
  const gc = isGoCardlessConfigured();

  return (
    <AdminShell member={member}>
      <AdminTitle title="Settings" />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
        <section className={cn(card, "p-5 sm:p-6")}>
          <h2 className="mb-1 text-base font-semibold text-stone-900">Price list</h2>
          <p className="mb-4 text-sm text-stone-500">The services you can tick on the New client screen. You can still change a price for one client.</p>
          <PriceListEditor items={priceList.items} examples={priceList.examples} />
        </section>
        <div className="space-y-5">
          <section className={cn(card, "p-5")}>
            <h2 className="mb-1 text-base font-semibold text-stone-900">Automatic steps</h2>
            <OptionsEditor initial={{ autoStartAml: options.autoStartAml, dailySummary: options.dailySummary }} />
          </section>
          <section className={cn(card, "p-5")}>
            <h2 className="mb-3 text-base font-semibold text-stone-900">Team</h2>
            <TeamEditor team={team} owners={ownerEmails()} me={member.email} />
          </section>
          <section className={cn(card, "p-5")}>
            <h2 className="mb-1 text-base font-semibold text-stone-900">Connections</h2>
            <ul className="divide-y divide-stone-100">
              <Status ok={gc} label="GoCardless" detail={gc ? `Connected (${goCardlessEnvironment() === "live" ? "live" : "test mode"})` : "Not connected. Payments can only be simulated on test builds."} />
              <Status ok={isStripeConfigured()} label="Stripe" detail={isStripeConfigured() ? "Connected" : "Not connected"} />
              <Status ok={isDriveConfigured()} label="Google Drive" detail={isDriveConfigured() ? "Saving letters to Clients folder" : "Not connected. Letters are kept here and emailed."} />
              <Status ok={Boolean(process.env.EMAIL_FROM)} label="Emails from joshua@" detail={process.env.EMAIL_FROM ? process.env.EMAIL_FROM : "Not set. Client emails may not arrive."} />
              <Status ok={Boolean(process.env.COMPANIES_HOUSE_API_KEY)} label="Companies House lookup" detail={process.env.COMPANIES_HOUSE_API_KEY ? "Connected" : "Optional. Not connected."} />
            </ul>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
