"use client"

import { useState, useCallback } from "react"
import { MicrophoneButton } from "@/components/dictation/microphone-button"
import { TranscriptionDisplay } from "@/components/dictation/transcription-display"

export default function DictationPage() {
  const [transcript, setTranscript] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [chunks, setChunks] = useState<Blob[]>([])

  const handleStart = () => {
    setIsRecording(true)
    setChunks([])
  }

  const handleStop = async () => {
    setIsRecording(false)
    setIsProcessing(true)

    try {
      // Send all chunks to the API
      const formData = new FormData()
      
      // Combine all chunks into a single blob
      const combinedBlob = new Blob(chunks, { type: "audio/webm" })
      formData.append("audio", combinedBlob, "recording.webm")

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Transcription failed")
      }

      const data = await response.json()
      setTranscript(data.transcript || "")
    } catch (error) {
      console.error("Error transcribing:", error)
      setTranscript((prev) => prev + "\n[Error: Transcription failed. Please try again.]")
    } finally {
      setIsProcessing(false)
      setChunks([])
    }
  }

  const handleChunk = useCallback((chunk: Blob) => {
    setChunks((prev) => [...prev, chunk])
    
    // Optionally send chunks in real-time for streaming transcription
    // For now, we'll batch them and send on stop
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Voice Dictation</h1>
          <p className="text-muted-foreground">
            Click the microphone button to start recording. Your speech will be transcribed in real-time.
          </p>
        </div>

        <div className="flex justify-center">
          <MicrophoneButton
            onStart={handleStart}
            onStop={handleStop}
            onChunk={handleChunk}
            isRecording={isRecording}
            disabled={isProcessing}
          />
        </div>

        <TranscriptionDisplay
          transcript={transcript}
          isProcessing={isProcessing || isRecording}
        />
      </div>
    </div>
  )
}

