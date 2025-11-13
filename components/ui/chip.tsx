import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "flat" | "solid" | "bordered"
  onClose?: () => void
  children: React.ReactNode
}

const chipVariants = {
  default: "bg-secondary text-secondary-foreground",
  flat: "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-800",
  solid: "bg-primary text-primary-foreground",
  bordered: "border border-border bg-transparent",
}

export function Chip({
  variant = "default",
  onClose,
  children,
  className,
  ...props
}: ChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors",
        chipVariants[variant],
        className
      )}
      {...props}
    >
      <span>{children}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
          aria-label="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

