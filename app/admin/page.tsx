import { AdminShell, AdminTitle } from "@/components/admin/admin-shell";
import { StatusBoard, type BoardRow } from "@/components/admin/status-board";
import { requireMember } from "@/lib/admin/session";
import { amlFor } from "@/lib/engagements/aml";
import { stageSummary } from "@/lib/engagements/flow";
import { listEngagements, openFlags } from "@/lib/engagements/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clients" };

export default async function StatusBoardPage() {
  const member = await requireMember();
  const engagements = await listEngagements();
  const rows: BoardRow[] = await Promise.all(
    engagements.map(async (e) => {
      const s = stageSummary(e, await amlFor(e));
      return {
        id: e.id,
        name: e.client.name,
        company: e.client.companyName,
        email: e.client.email,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        status: e.status,
        link: s.link,
        letter: s.letter,
        payment: s.payment,
        details: s.onboarding,
        aml: s.aml,
        flags: openFlags(e).length,
      };
    })
  );

  return (
    <AdminShell member={member}>
      <AdminTitle
        title="Clients"
        description="Everyone you've sent a link to, and where they're up to."
      />
      <StatusBoard rows={rows} />
    </AdminShell>
  );
}
