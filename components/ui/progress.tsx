"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        value?: number
        indicatorClassName?: string
        segmented?: boolean
    }
>(({ className, value, indicatorClassName, segmented, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative h-2 w-full overflow-hidden rounded-full bg-secondary/20",
            className
        )}
        {...props}
    >
        <div
            className={cn(
                "h-full w-full flex-1 bg-primary transition-all duration-500 ease-in-out",
                indicatorClassName
            )}
            style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
        {segmented && (
            <div
                className="absolute inset-0 z-10 pointer-events-none"
                style={{
                    background: "repeating-linear-gradient(45deg, transparent, transparent 4px, var(--background) 4px, var(--background) 8px)"
                }}
            />
        )}
    </div>
))
Progress.displayName = "Progress"

export { Progress }
