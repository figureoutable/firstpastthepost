"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { VideoCard, type VideoCardHandle } from "@/components/kokonutui/video-card";
import { FIRM } from "@/lib/figures-config";

type Card = {
  href: string;
  label: string;
  description: string;
  src: string;
  startAt: number;
  soon?: boolean;
  /** Opens another site in a new tab. */
  external?: boolean;
};

function HomeCard({ card }: { card: Card }) {
  const videoRef = useRef<VideoCardHandle>(null);
  const inner = (
    <>
      <div className="relative w-24 shrink-0 sm:w-full">
        <VideoCard ref={videoRef} src={card.src} startAt={card.startAt} className="aspect-[406/720] min-h-0" />
        {card.soon && (
          <span className="absolute left-1.5 top-1.5 whitespace-nowrap rounded-full bg-stone-900 px-2 py-0.5 text-[11px] font-medium text-white sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs">
            Coming soon
          </span>
        )}
      </div>
      <div className="flex flex-1 items-center justify-between gap-3 border-l border-stone-100 p-4 sm:items-end sm:border-l-0 sm:border-t">
        <div>
          <p className="font-semibold text-stone-900">{card.label}</p>
          <p className="mt-0.5 text-sm leading-snug text-stone-500">{card.description}</p>
        </div>
        {!card.soon && (
          <ArrowRight className="mb-0.5 h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-clay-600" />
        )}
      </div>
    </>
  );

  const className =
    "group flex h-full flex-row overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:flex-col";

  if (card.soon) {
    return (
      <div className={`${className} opacity-80`} aria-label={`${card.label}: coming soon`}>
        {inner}
      </div>
    );
  }

  const linkProps = {
    className: `${className} transition-shadow hover:shadow-lg hover:shadow-stone-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/50`,
    onMouseEnter: () => videoRef.current?.play(),
    onMouseLeave: () => videoRef.current?.pause(),
    onFocus: () => videoRef.current?.play(),
    onBlur: () => videoRef.current?.pause(),
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="h-full"
      tabIndex={-1}
    >
      {card.external ? (
        <a href={card.href} target="_blank" rel="noopener noreferrer" {...linkProps}>
          {inner}
        </a>
      ) : (
        <Link href={card.href} {...linkProps}>
          {inner}
        </Link>
      )}
    </motion.div>
  );
}

export function HomeCards({ ventureEnabled }: { ventureEnabled: boolean }) {
  const cards: Card[] = [
    {
      href: FIRM.bookingUrl,
      external: true,
      label: "Book a free call",
      description: "Tell us what you need. We then send one link to sign, pay and get set up.",
      src: "/videos/onboarding-v3.mp4",
      startAt: 0.5,
    },
    {
      href: "/incorporate",
      label: "Form a new company",
      description: "Free when you appoint us as your accountants. We set it up with Companies House.",
      src: "/videos/incorporate.mp4",
      startAt: 1,
    },
    {
      href: "/venture",
      label: "Venture",
      description: "SEIS and EIS, cap tables, share options and funding rounds.",
      src: "/videos/venture-v2.mp4",
      startAt: 0.5,
      soon: !ventureEnabled,
    },
  ];
  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
      {cards.map((card) => (
        <HomeCard key={card.href} card={card} />
      ))}
    </div>
  );
}
