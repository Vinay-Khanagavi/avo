"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { createMediaRecorder, createAudioSlicer } from "@/lib/audio-processor"
import { playRecordingStartSound, playRecordingEndSound } from "@/lib/audio-sounds"

interface MicrophoneButtonProps {
  onStart: () => void
  onStop: () => void
  onChunk: (chunk: Blob) => void
  isRecording: boolean
  disabled?: boolean
}

export function MicrophoneButton({
  onStart,
  onStop,
  onChunk,
  isRecording,
  disabled = false,
}: MicrophoneButtonProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string>("")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const stopRecordingRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Check microphone permission on mount
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        setHasPermission(true)
      })
      .catch(() => {
        setHasPermission(false)
        setError("Microphone access denied. Please enable microphone permissions.")
      })

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      setError("")
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      streamRef.current = stream
      const mediaRecorder = createMediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const stopFn = createAudioSlicer(mediaRecorder, (chunk) => {
        onChunk(chunk)
      })

      stopRecordingRef.current = stopFn
      playRecordingStartSound()
      onStart()
    } catch (err) {
      console.error("Error starting recording:", err)
      setError("Failed to start recording. Please check your microphone.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && stopRecordingRef.current) {
      stopRecordingRef.current()
      mediaRecorderRef.current = null
      stopRecordingRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    playRecordingEndSound()
    onStop()
  }

  const handleClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  if (hasPermission === false) {
    return (
      <div className="text-center space-y-2">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          onClick={() => {
            setHasPermission(null)
            setError("")
          }}
          variant="outline"
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || hasPermission === null}
      size="lg"
      className={`w-full max-w-xs rounded-xl text-white hover:bg-black hover:opacity-100 ${
        isRecording
          ? "bg-destructive hover:bg-destructive"
          : "bg-black"
      }`}
    >
      {hasPermission === null ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Checking microphone...
        </>
      ) : isRecording ? (
        <>
          <MicOff className="mr-2 h-5 w-5" />
          Stop Recording
        </>
      ) : (
        <>
          <Mic className="mr-2 h-5 w-5" />
          Start Recording
        </>
      )}
    </Button>
  )
}

