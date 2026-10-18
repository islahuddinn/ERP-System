import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onWheel, ...props }, ref) => {
    return (
      <input
        type={type}
        onWheel={(e) => {
          // Number inputs are manual-entry only: stop the mouse wheel from
          // scroll-changing a focused value by dropping focus on wheel.
          if (type === "number") (e.currentTarget as HTMLInputElement).blur()
          onWheel?.(e)
        }}
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100",
          // Hide the up/down spinner arrows on number inputs (manual entry only).
          type === "number" && "no-spinner",
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
