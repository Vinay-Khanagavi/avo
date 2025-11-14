"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { createMediaRecorder, createAudioSlicer } from "@/lib/audio-processor"
import { playRecordingStartSound, playRecordingEndSound } from "@/lib/audio-sounds"
import { Snackbar, useSnackbar } from "@/components/ui/snackbar"

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
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar()
  const hasShownPermissionError = useRef(false)

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
        if (!hasShownPermissionError.current) {
          showSnackbar("You need to turn on your microphone to start recording", "error")
          hasShownPermissionError.current = true
        }
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
      showSnackbar("You need to turn on your microphone to start recording", "error")
      setHasPermission(false)
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

  return (
    <>
      <Button
        onClick={hasPermission === false ? () => {
          setHasPermission(null)
          setError("")
          hasShownPermissionError.current = false
          // Re-check permission
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(() => setHasPermission(true))
            .catch(() => {
              setHasPermission(false)
              setError("Microphone access denied. Please enable microphone permissions.")
              showSnackbar("You need to turn on your microphone to start recording", "error")
            })
        } : handleClick}
        disabled={disabled || hasPermission === null || hasPermission === false}
        size="lg"
        className={`w-full max-w-xs rounded-xl text-white hover:bg-black hover:opacity-100 ${
          isRecording
            ? "bg-destructive hover:bg-destructive"
            : hasPermission === false
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-black"
        }`}
      >
        {hasPermission === null ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Checking microphone...
          </>
        ) : hasPermission === false ? (
          <>
            <MicOff className="mr-2 h-5 w-5" />
            Enable Microphone
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

      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onClose={hideSnackbar}
      />
    </>
  )
}

