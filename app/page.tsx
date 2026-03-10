"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import BackgroundPaths from "@/components/kokonutui/background-paths";
import GradientButton from "@/components/kokonutui/gradient-button";

export default function Home() {
  return (
    <BackgroundPaths>
      <div className="flex flex-col items-center gap-8">
        <Image
          src="/figures-logo.png"
          alt="Figures Logo"
          width={300}
          height={100}
          className="h-auto w-auto"
          priority
        />

        <Link href="/onboard">
          <GradientButton variant="purple" className="px-10 h-14">
            <span className="flex items-center gap-2 text-lg">
              Start Onboarding <ArrowRight className="w-5 h-5" />
            </span>
          </GradientButton>
        </Link>
      </div>
    </BackgroundPaths>
  );
}
