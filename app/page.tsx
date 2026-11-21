import { HomeCards } from "@/components/site/home-cards";
import { PageShell } from "@/components/site/site-chrome";
import { isVentureEnabled } from "@/lib/env";

export default function Home() {
  return (
    <PageShell width="wide" className="flex flex-col justify-center">
      <div className="mx-auto mb-8 max-w-xl text-center sm:mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">How can we help?</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-stone-600 sm:text-base">
          Choose where to start. Your progress saves as you go, so you can come back any time.
        </p>
      </div>
      <HomeCards ventureEnabled={isVentureEnabled()} />
    </PageShell>
  );
}
