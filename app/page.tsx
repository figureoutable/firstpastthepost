import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Tilt } from "@/components/ui/tilt";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px] opacity-30 pointer-events-none" />

      <main className="flex flex-col items-center text-center z-10 px-4 max-w-3xl">
        <div className="animate-fade-in-up">
          <Image
            src="/figures-logo.png"
            alt="Figures Logo"
            width={300}
            height={100}
            className="h-auto w-auto dark:invert"
            priority
          />
        </div>

        <div className="flex gap-4 mb-20 mt-[-1rem]">
          <Link href="/onboard">
            <Tilt rotationFactor={15} isRevese>
              <Button size="lg" className="rounded-full px-8 text-lg font-medium shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
                Start Onboarding <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Tilt>
          </Link>
        </div>
      </main>

      <footer className="absolute bottom-8 text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Figures. All rights reserved.
      </footer>
    </div>
  );
}
