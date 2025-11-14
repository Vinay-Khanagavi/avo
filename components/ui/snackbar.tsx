"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { CheckCircle2, XCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import gsap from "gsap"

export type SnackbarType = "success" | "error"

interface SnackbarProps {
  message: string
  type: SnackbarType
  isVisible: boolean
  onClose: () => void
  duration?: number
}

export function Snackbar({
  message,
  type,
  isVisible,
  onClose,
  duration = 4000,
}: SnackbarProps) {
  const snackbarRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onCloseRef = useRef(onClose)

  // Keep onClose ref updated
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const handleClose = useCallback(() => {
    const element = snackbarRef.current
    if (element) {
      gsap.to(element, {
        y: 100,
        opacity: 0,
        scale: 0.8,
        duration: 0.3,
        ease: "back.in(1.7)",
        onComplete: () => {
          onCloseRef.current()
        },
      })
    } else {
      onCloseRef.current()
    }
  }, [])

  useEffect(() => {
    if (isVisible) {
      // Play sound when snackbar appears
      if (typeof window !== "undefined") {
        audioRef.current = new Audio("/audio/snackbar.wav")
        audioRef.current.volume = 0.5
        audioRef.current.play().catch((error) => {
          console.warn("Could not play snackbar sound:", error)
        })
      }

      // Animate in with GSAP
      const element = snackbarRef.current
      if (element) {
        gsap.fromTo(
          element,
          {
            y: 100,
            opacity: 0,
            scale: 0.8,
          },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.4,
            ease: "back.out(1.7)",
          }
        )

        // Auto-close after duration
        const timer = setTimeout(() => {
          handleClose()
        }, duration)

        return () => {
          clearTimeout(timer)
          if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current = null
          }
        }
      }
    }
  }, [isVisible, duration, handleClose])

  if (!isVisible) return null

  return (
    <div
      ref={snackbarRef}
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg min-w-[300px] max-w-[500px]",
        type === "success"
          ? "bg-green-50 border border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100"
          : "bg-red-50 border border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100"
      )}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
      )}
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={handleClose}
        className={cn(
          "flex-shrink-0 rounded-md p-1 transition-colors",
          type === "success"
            ? "hover:bg-green-100 dark:hover:bg-green-900"
            : "hover:bg-red-100 dark:hover:bg-red-900"
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// Hook for managing snackbar state
export function useSnackbar() {
  const [snackbar, setSnackbar] = useState<{
    message: string
    type: SnackbarType
    isVisible: boolean
  }>({
    message: "",
    type: "success",
    isVisible: false,
  })

  const showSnackbar = (message: string, type: SnackbarType = "success") => {
    setSnackbar({
      message,
      type,
      isVisible: true,
    })
  }

  const hideSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, isVisible: false }))
  }

  return {
    snackbar,
    showSnackbar,
    hideSnackbar,
  }
}

