import Link from "next/link";

export default function UnderConstructionPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <p className="text-2xl font-semibold uppercase tracking-wide text-stone-400 sm:text-3xl">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
        Under Construction
      </h1>
      <Link
        href="/"
        className="mt-8 rounded-none bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
      >
        Back to home
      </Link>
    </div>
  );
}
