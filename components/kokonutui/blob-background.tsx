"use client";

export default function BlobBackground({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-white">
      <div className="container relative z-10 mx-auto -translate-y-[6vh] px-4 py-4 text-center md:px-6">
        <div className="mx-auto max-w-5xl">{children}</div>
      </div>

      <p className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-xs text-stone-400">
        &copy; {new Date().getFullYear()} Figures. All rights reserved.
      </p>
    </div>
  );
}
