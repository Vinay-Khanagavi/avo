"use client"

import { useEffect, useState } from "react"
import { useRecording } from "@/contexts/recording-context"
import { BottomGradient } from "@/components/dictation/bottom-gradient"
import { WaveformPill } from "@/components/dictation/waveform-pill"

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isRecording } = useRecording()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <main className="flex-1 overflow-y-auto relative">
      {children}
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

