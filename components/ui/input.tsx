
import * as React from "react"
import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import gsap from "gsap"

interface FloatingLabelInputProps extends React.ComponentProps<"input"> {
  label: string
}

const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ className, type, label, value, id, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const isFilled = value !== undefined && value !== ""
    const labelRef = useRef<HTMLLabelElement>(null)
    const prevFloat = useRef(false)

    useEffect(() => {
      const shouldFloat = isFocused || isFilled
      if (labelRef.current) {
        if (shouldFloat && !prevFloat.current) {
          gsap.to(labelRef.current, {
            y: -7,
            scale: 0.85,
            color: "#222",
            ease: "power1.inOut",
            duration: 0.3,
          })
        } else if (!shouldFloat && prevFloat.current) {
          gsap.to(labelRef.current, {
            y: 0,
            scale: 1,
            color: "#6b7280",
            ease: "power1.inOut",
            duration: 0.3,
          })
        }
        prevFloat.current = shouldFloat
      }
    }, [isFocused, isFilled])

    return (
      <div className="relative w-full">
        <input
          id={id}
          ref={ref}
          type={type}
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            "peer file:text-foreground border-input h-12 w-full min-w-0 border-0 border-b-2 border-b-gray-400 bg-transparent px-3 pt-6 pb-1 text-base shadow-xs outline-none focus:outline-none focus-visible:outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-b-black focus-visible:ring-0 focus:ring-0 focus-visible:ring-0",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            className
          )}
          style={{
            ...props.style,
            WebkitBoxShadow: "0 0 0 1000px white inset",
            boxShadow: "0 0 0 1000px white inset",
            WebkitTextFillColor: "#222"
          }}
          autoComplete={props.autoComplete || "off"}
          {...props}
        />
        <label
          ref={labelRef}
          htmlFor={id}
          className={cn(
            "absolute left-0 pl-0 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none origin-left w-full select-none",
            "text-base font-medium"
          )}
          style={{
            transformOrigin: "left center",
            willChange: "transform, color"
          }}
        >
          {label}
        </label>
      </div>
    )
  }
)
FloatingLabelInput.displayName = "FloatingLabelInput"

export { FloatingLabelInput as Input }
