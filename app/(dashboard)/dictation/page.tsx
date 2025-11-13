"use client"

import { useState, useCallback, useRef } from "react"
import { MainSection } from "@/components/dictation/main-section"
import { MicrophoneButton } from "@/components/dictation/microphone-button"
import { TranscriptionDisplay } from "@/components/dictation/transcription-display"
import { useRecording } from "@/contexts/recording-context"
import {
  createTranscriptionSession,
  sendChunkWithRetry,
  finalizeSession,
} from "@/lib/whisper-stream"

export default function DictationPage() {
  const [transcript, setTranscript] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const { isRecording, setIsRecording } = useRecording()
  const sessionIdRef = useRef<string | null>(null)
  const pendingChunksRef = useRef<Blob[]>([])

  const handleStart = async () => {
    setIsRecording(true)
    setTranscript("")
    sessionIdRef.current = null
    pendingChunksRef.current = []

    try {
      // Create transcription session
      const session = await createTranscriptionSession()
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
            const response = await sendChunkWithRetry(sessionIdRef.current, chunk)
            setTranscript(response.transcript)
          } catch (error) {
            console.error("Error processing pending chunk:", error)
          }
        }
        pendingChunksRef.current = []
      }

      // Finalize session
      if (sessionIdRef.current) {
        const finalResponse = await finalizeSession(sessionIdRef.current)
        setTranscript(finalResponse.transcript)
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
        const response = await sendChunkWithRetry(sessionIdRef.current, chunk)
        setTranscript(response.transcript)
      } catch (error) {
        console.error("Error processing chunk:", error)
        // Queue failed chunk for retry on stop
        pendingChunksRef.current.push(chunk)
      }
    },
    []
  )

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl overflow-hidden">
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

