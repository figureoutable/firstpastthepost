import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageShell, Panel } from "@/components/site/site-chrome";
import { NextStepsList } from "@/components/site/next-steps-list";
import { onboardingNextSteps } from "@/lib/next-steps";
import { FIRM } from "@/lib/figures-config";

export const metadata: Metadata = { title: "Thank you" };

export default async function OnboardSuccessPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await searchParams;
    const steps = onboardingNextSteps({ hasPreviousAccountant: params.handover === "1" });

    return (
        <PageShell width="narrow">
            <Panel className="text-center">
                <Image src="/images/thumbs-up.jpg" alt="" width={744} height={763} className="mx-auto mb-4 h-24 w-auto" />
                <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Thank you, we have your details</h1>
                <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-stone-600">
                    Our team will look through everything shortly. Here is what happens now.
                </p>
            </Panel>

            <Panel className="mt-4">
                <h2 className="mb-5 text-base font-semibold text-stone-900">What happens next</h2>
                <NextStepsList steps={steps} />
            </Panel>

            <p className="mt-6 text-center text-sm text-stone-500">
                Questions? Email{" "}
                <a href={`mailto:${FIRM.contactEmail}`} className="font-medium text-clay-700 underline underline-offset-2">
                    {FIRM.contactEmail}
                </a>{" "}
                or go back to the <Link href="/" className="font-medium text-stone-700 underline underline-offset-2">home page</Link>.
            </p>
        </PageShell>
    );
}
