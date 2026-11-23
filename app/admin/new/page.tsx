import { AdminShell, AdminTitle } from "@/components/admin/admin-shell";
import { NewClientForm, type ClientFormPrefill } from "@/components/admin/new-client-form";
import { requireMember } from "@/lib/admin/session";
import { letterSetupNote } from "@/lib/engagements/letters";
import { getPriceList } from "@/lib/engagements/price-list";
import { getEngagement } from "@/lib/engagements/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "New client" };

export default async function NewClientPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const member = await requireMember();
  const { from } = await searchParams;
  const [priceList, letterNote, source] = await Promise.all([getPriceList(), letterSetupNote(), from ? getEngagement(from) : null]);
  // From a company formation: the company is registered, so now it gets its letter.
  const prefill: ClientFormPrefill | undefined =
    source?.client.type === "formation"
      ? { type: "business", name: source.client.name, email: source.client.email, companyName: source.client.companyName }
      : undefined;
  return (
    <AdminShell member={member}>
      <AdminTitle
        title={prefill ? `Engagement letter for ${prefill.companyName || prefill.name}` : "New client"}
        description={
          prefill
            ? "The company is registered. Look it up by number, check the details and send the letter."
            : "Pick the services and how they pay. They get one link to sign, pay and give their details."
        }
      />
      <NewClientForm
        items={priceList.items}
        examples={priceList.examples}
        lookupEnabled={Boolean(process.env.COMPANIES_HOUSE_API_KEY)}
        prefill={prefill}
        letterNote={letterNote}
      />
    </AdminShell>
  );
}
