import Link from "next/link";
import { PageShell, Panel } from "@/components/site/site-chrome";

export default function NotFound() {
  return (
    <PageShell width="narrow" className="flex flex-col justify-center">
      <Panel className="text-center">
        <p className="text-sm font-medium text-clay-700">Page not found</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">We could not find that page</h1>
        <p className="mt-2 text-[15px] text-stone-600">The link may be out of date. Start again from the home page.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-clay-500 px-5 text-sm font-medium text-white transition-colors hover:bg-clay-600"
        >
          Back to home
        </Link>
      </Panel>
    </PageShell>
  );
}
