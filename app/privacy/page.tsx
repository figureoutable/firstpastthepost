import type { Metadata } from "next";
import { PageShell, PageTitle, Panel } from "@/components/site/site-chrome";
import { FIRM, firmValue } from "@/lib/figures-config";

export const metadata: Metadata = { title: "Privacy notice" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-stone-200 pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-base font-semibold text-stone-900">{title}</h2>
      <div className="space-y-2 text-[15px] leading-relaxed text-stone-700">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <PageShell>
      <PageTitle
        title="Privacy notice"
        description="How we use the information you give us on this website. Last updated 21 November 2026."
      />
      <Panel className="space-y-6">
        <Section title="Who we are">
          <p>
            {FIRM.tradingName} is a trading name of {FIRM.legalName} (company number {firmValue(FIRM.companyNumber)}), a firm of
            chartered accountants. We are the controller of the personal information you give us here. Our registered office is{" "}
            {firmValue(FIRM.registeredOffice)}. We are registered with the Information Commissioner&apos;s Office (registration
            number {firmValue(FIRM.icoNumber)}).
          </p>
          <p>
            You can contact us about your information at{" "}
            <a href={`mailto:${FIRM.contactEmail}`} className="font-medium text-clay-700 underline underline-offset-2">
              {FIRM.contactEmail}
            </a>
            .
          </p>
        </Section>

        <Section title="What we collect">
          <p>Depending on the form you fill in, we collect:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>your name, email, phone number, date of birth and home address</li>
            <li>a copy of your photo ID and proof of address</li>
            <li>tax references such as your National Insurance number and Unique Taxpayer Reference</li>
            <li>company details, including directors, shareholders and Companies House codes</li>
            <li>information about your income, your business and your current accountant</li>
            <li>your answers to our anti-money laundering questions</li>
          </ul>
        </Section>

        <Section title="Why we use it">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>To meet our legal duties.</strong> The Money Laundering Regulations require us to confirm who our clients are
              before we act for them. Tax and company law also require us to keep accurate records.
            </li>
            <li>
              <strong>To provide our services.</strong> We use your details to set up and deliver the work you ask us to do, such as
              your tax return, company accounts or company formation.
            </li>
            <li>
              <strong>For our legitimate interests.</strong> For example, contacting your previous accountant for a handover and
              keeping our records in order.
            </li>
          </ul>
        </Section>

        <Section title="Who we share it with">
          <p>We only share what is needed, with:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Firmcheck, our identity and anti-money laundering check provider</li>
            <li>HMRC and Companies House, when we act for you</li>
            <li>your previous accountant, if you ask us to take over from them</li>
            <li>
              the technology providers that run this website and our records: Vercel (website hosting and file storage), Resend
              (email) and Google (spreadsheets)
            </li>
          </ul>
          <p>
            Some of these providers are based in, or use services in, the United States. Where your information leaves the UK we
            make sure safeguards recognised under UK data protection law are in place.
          </p>
          <p>We never sell your information.</p>
        </Section>

        <Section title="How we keep it safe">
          <p>
            Documents you upload are stored privately and can only be opened by our team. Links to view them expire. Unfinished
            forms are deleted after 30 days.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            The Money Laundering Regulations require us to keep identity records for five years after our relationship with you
            ends. We keep tax and accounting records for as long as the law requires, usually six years. After that we delete them
            securely.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You can ask to see the information we hold about you, ask us to correct it, ask us to delete it or limit how we use it,
            and object to some uses. Some information we must keep by law. To make a request, email us at the address above.
          </p>
          <p>
            If you are unhappy with how we have handled your information, please tell us first. You can also complain to the
            Information Commissioner&apos;s Office at{" "}
            <a href="https://ico.org.uk/make-a-complaint/" className="font-medium text-clay-700 underline underline-offset-2">
              ico.org.uk
            </a>{" "}
            or on 0303 123 1113.
          </p>
        </Section>
      </Panel>
    </PageShell>
  );
}
