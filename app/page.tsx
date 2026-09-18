"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import BlobBackground from "@/components/kokonutui/blob-background";
import { VideoCard, type VideoCardHandle } from "@/components/kokonutui/video-card";

function VideoHomeCard({
  href,
  label,
  src,
  startAt,
}: {
  href: string;
  label: string;
  src: string;
  startAt?: number;
}) {
  const videoRef = useRef<VideoCardHandle>(null);

  return (
    <Link
      href={href}
      className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onMouseEnter={() => videoRef.current?.play()}
      onMouseLeave={() => videoRef.current?.pause()}
      onFocus={() => videoRef.current?.play()}
      onBlur={() => videoRef.current?.pause()}
    >
      <motion.div
        className="flex w-full flex-col gap-0"
        whileHover={{ y: -6 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
      >
        <div className="w-full leading-none">
          <VideoCard ref={videoRef} src={src} startAt={startAt} />
        </div>
        <p className="-mt-1 w-full bg-stone-900 px-4 py-2.5 text-center text-base font-semibold leading-none tracking-tight text-white">
          {label}
        </p>
      </motion.div>
    </Link>
  );
}

export default function Home() {
  return (
    <BlobBackground>
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-0 px-2 sm:px-4">
        <Image
          src="/figures-logo.png"
          alt="Figures Logo"
          width={320}
          height={100}
          className="h-auto w-[200px] sm:w-[240px]"
          priority
        />

        <div className="-mt-2 mx-auto grid w-full max-w-[44.8rem] grid-cols-1 items-stretch gap-3 sm:grid-cols-3 sm:gap-4">
          <VideoHomeCard
            href="/onboard"
            label="Onboarding"
            src="/videos/onboarding-v3.mp4"
            startAt={0.5}
          />
          <VideoHomeCard
            href="/incorporate"
            label="New Company"
            src="/videos/incorporate.mp4"
            startAt={1}
          />
          <VideoHomeCard
            href="/404"
            label="Venture"
            src="/videos/venture-v2.mp4"
            startAt={0.5}
          />
        </div>
      </div>
    </BlobBackground>
  );
}
