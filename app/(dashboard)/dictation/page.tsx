"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { MainSection } from "@/components/dictation/main-section"
import { MicrophoneButton } from "@/components/dictation/microphone-button"
import { TranscriptionDisplay } from "@/components/dictation/transcription-display"
import { TranscriptionService } from "@/components/dictation/service-selector"
import { useRecording } from "@/contexts/recording-context"
import {
  createTranscriptionSession,
  sendChunkWithRetry,
  finalizeSession,
} from "@/lib/whisper-stream"
import { applyDictionaryReplacements, fetchDictionaryWords } from "@/lib/dictionary-replace"

export default function DictationPage() {
  const [transcript, setTranscript] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedService, setSelectedService] = useState<TranscriptionService>("whisper")
  const { isRecording, setIsRecording } = useRecording()
  const sessionIdRef = useRef<string | null>(null)
  const pendingChunksRef = useRef<Blob[]>([])
  const dictionaryRef = useRef<Array<{ word: string; substitution?: string | null }>>([])

  // Load transcription service from localStorage
  useEffect(() => {
    const savedService = localStorage.getItem("transcriptionService") as TranscriptionService
    if (savedService) {
      setSelectedService(savedService)
    }
  }, [])

  // Listen for storage changes (when updated in settings page)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "transcriptionService" && e.newValue) {
        setSelectedService(e.newValue as TranscriptionService)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  // Listen for custom event (same-tab sync)
  useEffect(() => {
    const handleCustomChange = () => {
      const savedService = localStorage.getItem("transcriptionService") as TranscriptionService
      if (savedService && savedService !== selectedService) {
        setSelectedService(savedService)
      }
    }

    window.addEventListener("transcriptionServiceChanged", handleCustomChange)
    return () => window.removeEventListener("transcriptionServiceChanged", handleCustomChange)
  }, [selectedService])

  const handleServiceChange = (service: TranscriptionService) => {
    setSelectedService(service)
    localStorage.setItem("transcriptionService", service)
    // Trigger custom event for same-tab sync
    window.dispatchEvent(new Event("transcriptionServiceChanged"))
  }

  const handleStart = async () => {
    setIsRecording(true)
    setTranscript("")
    sessionIdRef.current = null
    pendingChunksRef.current = []

    try {
      // Fetch dictionary words for post-transcription replacement (no AI needed)
      try {
        const words = await fetchDictionaryWords()
        dictionaryRef.current = words
      } catch (dictError) {
        console.warn("Failed to fetch dictionary words:", dictError)
        dictionaryRef.current = []
      }

      // Create transcription session (no prompt needed - we'll do text replacement after)
      const session = await createTranscriptionSession(undefined, selectedService)
      sessionIdRef.current = session.sessionId
    } catch (error: any) {
      console.error("Error creating session:", error)
      const errorMessage = error?.message || "Failed to start transcription session"
      setTranscript(`[Error: ${errorMessage}]`)
      setIsRecording(false)
    }
  }

  const handleStop = async () => {
    setIsRecording(false)
    setIsProcessing(true)

    try {
      // Process any pending chunks first
      if (pendingChunksRef.current.length > 0 && sessionIdRef.current) {
        for (const chunk of pendingChunksRef.current) {
          try {
            const response = await sendChunkWithRetry(sessionIdRef.current, chunk, selectedService)
            // Apply dictionary replacements (simple text replacement, no AI)
            const processedTranscript = applyDictionaryReplacements(
              response.transcript,
              dictionaryRef.current
            )
            setTranscript(processedTranscript)
          } catch (error) {
            console.error("Error processing pending chunk:", error)
          }
        }
        pendingChunksRef.current = []
      }

      // Finalize session
      if (sessionIdRef.current) {
        const finalResponse = await finalizeSession(sessionIdRef.current, selectedService)
        // Apply dictionary replacements (simple text replacement, no AI)
        const processedTranscript = applyDictionaryReplacements(
          finalResponse.transcript,
          dictionaryRef.current
        )
        setTranscript(processedTranscript)
        sessionIdRef.current = null
      }
    } catch (error) {
      console.error("Error finalizing transcription:", error)
      setTranscript((prev) => prev + "\n[Error: Failed to finalize transcription. Please try again.]")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleChunk = useCallback(
    async (chunk: Blob) => {
      if (!sessionIdRef.current) {
        // Session not ready yet, queue the chunk
        pendingChunksRef.current.push(chunk)
        return
      }

      try {
        // Send chunk immediately for real-time transcription
        const response = await sendChunkWithRetry(sessionIdRef.current, chunk, selectedService)
        // Apply dictionary replacements (simple text replacement, no AI)
        const processedTranscript = applyDictionaryReplacements(
          response.transcript,
          dictionaryRef.current
        )
        setTranscript(processedTranscript)
      } catch (error) {
        console.error("Error processing chunk:", error)
        // Queue failed chunk for retry on stop
        pendingChunksRef.current.push(chunk)
      }
    },
    [selectedService]
  )

  return (
    <div className="w-full max-w-4xl mx-auto overflow-hidden">
      <MainSection
        transcript={transcript}
        setTranscript={setTranscript}
        isRecording={isRecording}
        isProcessing={isProcessing}
        onStart={handleStart}
        onStop={handleStop}
        onChunk={handleChunk}
      />
    </div>
  )
}

