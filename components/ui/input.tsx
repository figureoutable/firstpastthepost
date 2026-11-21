import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-[15px] text-stone-900 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20 focus-visible:border-clay-500 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 transition-colors hover:border-stone-400 aria-[invalid=true]:border-red-500",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
