import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Mail, Rocket } from "lucide-react";
import { PageShell } from "@/components/site/site-chrome";
import { ResumeFormation } from "@/components/site/resume-formation";
import { FIRM } from "@/lib/figures-config";
import { isVentureEnabled } from "@/lib/env";

const POINTS = [
  "Takes 25 to 30 minutes, and saves as you go",
  "We check your answers before anything is filed",
  "Your certificate of incorporation, sent to you by email",
];

function OtherCard({
  Icon,
  title,
  text,
  action,
}: {
  Icon: typeof Mail;
  title: string;
  text: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-stone-200 bg-white p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-clay-50 text-clay-800">
        <Icon className="h-[22px] w-[22px]" />
      </span>
      <h3 className="text-[19px] font-semibold text-stone-900">{title}</h3>
      <p className="flex-1 text-[15px] leading-relaxed text-stone-600">{text}</p>
      {action}
    </div>
  );
}

const linkClass = "inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-clay-800 hover:text-clay-900";

export default function Home() {
  const ventureEnabled = isVentureEnabled();
  return (
    <PageShell width="wide" className="py-0 sm:py-0">
      <section className="flex flex-wrap items-center gap-12 pb-14 pt-10 sm:pt-16">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
          <p className="text-sm font-semibold uppercase tracking-[0.03em] text-clay-800">Company formation</p>
          <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-0.03em] text-stone-900 sm:text-[52px]">Start your UK limited company</h1>
          <p className="max-w-[34rem] text-lg leading-relaxed text-stone-600">
            Tell us about your company in one form. We check everything, then file it with Companies House for you.
          </p>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-[40px] font-bold tracking-[-0.02em] text-stone-900">Free</span>
            <span className="text-[15px] text-stone-600">when you appoint us as your accountants</span>
          </div>
          <ul className="flex flex-col gap-3">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-base leading-snug text-stone-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-clay-50 text-clay-800">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/incorporate"
              className="inline-flex h-[52px] items-center gap-2 rounded-xl bg-clay-800 px-7 text-[17px] font-semibold text-white shadow-sm hover:bg-clay-900"
            >
              Start your company <ArrowRight className="h-[18px] w-[18px]" />
            </Link>
            <a
              href="#resume"
              className="inline-flex h-[52px] items-center rounded-xl border border-stone-300 bg-white px-5 text-base font-medium text-stone-900 hover:bg-stone-50"
            >
              Resume a form
            </a>
          </div>
          <p className="max-w-[34rem] text-sm leading-relaxed text-stone-600">
            Every director, and anyone owning more than 25%, verifies their identity with Companies House first. The form explains how.
          </p>
        </div>
        <div className="min-w-0 flex-[1_1_380px]">
          <Image
            src="/images/formation-hero.jpg"
            alt="Illustration of the London skyline by the river"
            width={600}
            height={1064}
            priority
            sizes="(min-width: 1024px) 480px, 100vw"
            className="aspect-[4/5] max-h-[560px] w-full rounded-[28px] border border-stone-200 object-cover object-[center_35%]"
          />
        </div>
      </section>

      <section className="flex flex-col gap-5 pb-14 pt-2">
        <h2 className="text-2xl font-bold tracking-[-0.02em] text-stone-900">Not starting a company?</h2>
        <div className="grid gap-5 md:grid-cols-3">
          <OtherCard
            Icon={Mail}
            title="Got a link from us?"
            text="If we've already spoken, your personal link is in your email. It takes you through your letter, payment and details in one go."
            action={
              <a href={`mailto:${FIRM.contactEmail}`} className={linkClass}>
                Can&apos;t find it? Email us
              </a>
            }
          />
          <OtherCard
            Icon={CalendarDays}
            title="Accounts, tax and payroll"
            text="Book a free call. We then send you one link to sign, pay and get set up."
            action={
              <a href={FIRM.bookingUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                Book a free call
              </a>
            }
          />
          <OtherCard
            Icon={Rocket}
            title="Venture"
            text="SEIS and EIS, cap tables, share options and funding rounds."
            action={
              ventureEnabled ? (
                <Link href="/venture" className={linkClass}>
                  See Venture
                </Link>
              ) : (
                <span className="inline-flex min-h-11 items-center self-start text-[15px] font-medium text-stone-400">Coming soon</span>
              )
            }
          />
        </div>
      </section>

      <section className="pb-16">
        <ResumeFormation />
      </section>
    </PageShell>
  );
}
