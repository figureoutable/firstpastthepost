import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminShell, AdminTitle, card } from "@/components/admin/admin-shell";
import { NewClientForm } from "@/components/admin/new-client-form";
import { requireMember } from "@/lib/admin/session";
import { getPriceList } from "@/lib/engagements/price-list";
import { getEngagement } from "@/lib/engagements/store";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit client" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const { id } = await params;
  const e = await getEngagement(id);
  if (!e) notFound();
  const priceList = await getPriceList();
  const back = (
    <Link href={`/admin/clients/${e.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-900">
      <ArrowLeft className="h-4 w-4" /> Back to client
    </Link>
  );

  // Once signed, the letter is a record and can't change.
  if (e.signature || e.status !== "open") {
    return (
      <AdminShell member={member}>
        {back}
        <div className={cn(card, "p-6 text-sm text-stone-600")}>
          {e.signature
            ? "The client has already signed, so this can no longer be changed. Cancel the link and create a new one instead."
            : "This link has been cancelled, so it can no longer be changed."}
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell member={member}>
      {back}
      <AdminTitle
        title={`Edit ${e.client.companyName || e.client.name}`}
        description="Change the details, services or payment before the client signs. The link stays the same."
      />
      <NewClientForm
        items={priceList.items}
        examples={priceList.examples}
        lookupEnabled={Boolean(process.env.COMPANIES_HOUSE_API_KEY)}
        initial={{
          id: e.id,
          type: e.client.type,
          name: e.client.name,
          email: e.client.email,
          companyName: e.client.companyName,
          companyNumber: e.client.companyNumber,
          lines: e.lines.map((l) => ({ serviceId: l.serviceId, pricePence: l.pricePence })),
          paymentMethod: e.payment.method,
          cardAmountPence: e.cardAmountPence,
          paymentNote: e.paymentNote,
        }}
      />
    </AdminShell>
  );
}
