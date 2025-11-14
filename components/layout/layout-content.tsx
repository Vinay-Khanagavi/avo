"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useRecording } from "@/contexts/recording-context"
import { BottomGradient } from "@/components/dictation/bottom-gradient"
import { WaveformPill } from "@/components/dictation/waveform-pill"
import { ServiceSelector, TranscriptionService } from "@/components/dictation/service-selector"

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isRecording } = useRecording()
  const [isMounted, setIsMounted] = useState(false)
  const pathname = usePathname()
  const [selectedService, setSelectedService] = useState<TranscriptionService>("whisper")
  const isDictationPage = pathname === "/dictation"

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load transcription service from localStorage
  useEffect(() => {
    if (isDictationPage) {
      const savedService = localStorage.getItem("transcriptionService") as TranscriptionService
      if (savedService) {
        setSelectedService(savedService)
      }
    }
  }, [isDictationPage])

  // Listen for storage changes (when updated in settings page)
  useEffect(() => {
    if (!isDictationPage) return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "transcriptionService" && e.newValue) {
        setSelectedService(e.newValue as TranscriptionService)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [isDictationPage])

  // Listen for custom event (same-tab sync)
  useEffect(() => {
    if (!isDictationPage) return

    const handleCustomChange = () => {
      const savedService = localStorage.getItem("transcriptionService") as TranscriptionService
      if (savedService && savedService !== selectedService) {
        setSelectedService(savedService)
      }
    }

    window.addEventListener("transcriptionServiceChanged", handleCustomChange)
    return () => window.removeEventListener("transcriptionServiceChanged", handleCustomChange)
  }, [isDictationPage, selectedService])

  const handleServiceChange = (service: TranscriptionService) => {
    setSelectedService(service)
    localStorage.setItem("transcriptionService", service)
    // Trigger custom event for same-tab sync
    window.dispatchEvent(new Event("transcriptionServiceChanged"))
  }

  return (
    <main className="flex-1 overflow-y-auto relative pt-0 md:pt-0">
      {/* Service Selector - Top Right Corner */}
      {isMounted && isDictationPage && (
        <div className="absolute top-4 right-4 z-20">
          <ServiceSelector
            value={selectedService}
            onChange={handleServiceChange}
            disabled={isRecording}
            compact={true}
          />
        </div>
      )}
      <div className="px-4 py-6 md:px-6 md:py-8">
        {children}
      </div>
      {/* Waveform and Gradient - Show when recording */}
      {isMounted && isRecording && (
        <>
          <BottomGradient />
          <WaveformPill isSpeaking={isRecording} />
        </>
      )}
    </main>
  )
}

