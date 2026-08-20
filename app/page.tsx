"use client";

import Link from "next/link";
import Image from "next/image";
import { Building2, ClipboardList, Landmark } from "lucide-react";
import BackgroundPaths from "@/components/kokonutui/background-paths";
import { SpotlightCard } from "@/components/kokonutui/spotlight-card";

const GOV_COMPANY_FORMATION =
  "https://www.gov.uk/limited-company-formation/register-your-company";
const GOV_VAT_REGISTRATION = "https://www.gov.uk/vat-registration";

export default function Home() {
  return (
    <BackgroundPaths>
      <div className="flex w-full max-w-5xl flex-col items-center gap-10 px-4">
        <Image
          src="/figures-logo.png"
          alt="Figures Logo"
          width={300}
          height={100}
          className="h-auto w-auto"
          priority
        />

        <p className="text-center text-sm text-muted-foreground max-w-md">
          Choose how you&apos;d like to get started.
        </p>

        <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-3 md:auto-rows-fr">
          <Link
            href="/onboard"
            className="flex min-h-[280px] w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2 rounded-2xl"
          >
            <SpotlightCard
              className="flex-1"
              item={{
                icon: ClipboardList,
                title: "Start Onboarding",
                description:
                  "Complete your business or self-assessment onboarding with Figures.",
                color: "#c1592e",
              }}
            />
          </Link>

          <Link
            href="/incorporate"
            className="flex min-h-[280px] w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 rounded-2xl"
          >
            <SpotlightCard
              className="flex-1"
              item={{
                icon: Building2,
                title: "Create a New\nLimited Company",
                description:
                  "Complete our incorporation form — we register with Companies House for you.",
                color: "#2f6f52",
              }}
            />
          </Link>

          <a
            href={GOV_VAT_REGISTRATION}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[280px] w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2 rounded-2xl"
          >
            <SpotlightCard
              className="flex-1"
              item={{
                icon: Landmark,
                title: "Register for VAT",
                description:
                  "Apply for a VAT number with HMRC (opens GOV.UK).",
                color: "#3b5166",
              }}
            />
          </a>
        </div>

        <p className="text-xs text-stone-400 text-center max-w-lg">
          External links open official government services in a new tab. Figures is
          not affiliated with GOV.UK.
        </p>
      </div>
    </BackgroundPaths>
  );
}
