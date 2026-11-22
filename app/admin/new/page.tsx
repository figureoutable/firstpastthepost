import { AdminShell, AdminTitle } from "@/components/admin/admin-shell";
import { NewClientForm } from "@/components/admin/new-client-form";
import { requireMember } from "@/lib/admin/session";
import { getPriceList } from "@/lib/engagements/price-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "New client" };

export default async function NewClientPage() {
  const member = await requireMember();
  const priceList = await getPriceList();
  return (
    <AdminShell member={member}>
      <AdminTitle title="New client" description="Pick the services and how they pay. They get one link to sign, pay and give their details." />
      <NewClientForm items={priceList.items} examples={priceList.examples} lookupEnabled={Boolean(process.env.COMPANIES_HOUSE_API_KEY)} />
    </AdminShell>
  );
}
