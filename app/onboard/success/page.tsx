"use client";

import { ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function OnboardSuccessPage() {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-clay-50/80 blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="z-10 w-full max-w-lg"
            >
                <div className="rounded-none border border-border bg-card p-10 text-center">
                    <div className="mx-auto mb-4 w-28">
                        <img
                            src="/images/thumbs-up.jpg"
                            alt=""
                            className="block h-auto w-full"
                        />
                    </div>

                    <h2 className="mb-3 text-2xl font-semibold text-foreground">Ready, Set, Go!</h2>
                    <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                        We have received your details and our team is now performing the final
                        administrative reviews to get you up and running.
                    </p>
                </div>

                <div className="mt-6 flex justify-center">
                    <span className="flex items-center gap-1 text-xs text-stone-400">
                        <ShieldCheck className="h-3 w-3" /> Encrypted & Secure
                    </span>
                </div>
            </motion.div>
        </div>
    );
}
