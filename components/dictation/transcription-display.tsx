"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

interface TranscriptionDisplayProps {
  transcript: string
  isProcessing?: boolean
  isRecording?: boolean
}

export function TranscriptionDisplay({
  transcript,
  isProcessing = false,
  isRecording = false,
}: TranscriptionDisplayProps) {
  const [copied, setCopied] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (scrollContainerRef.current && transcript) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [transcript])

  const handleCopy = async () => {
    if (!transcript) return

    try {
      await navigator.clipboard.writeText(transcript)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  return (
    <Card className="w-full relative overflow-hidden">
      {isRecording && (
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Bottom */}
          <div className="absolute bottom-0 left-0 right-0" style={{ height: '192px' }}>
            <svg className="wave-svg w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 200" preserveAspectRatio="none">
              <path className="wave-path" d="M0,160 C120,100 240,220 480,160 C720,100 900,220 1080,160 C1260,100 1440,220 1440,160 L1440,320 L0,320 Z" />
            </svg>
          </div>
          {/* Top */}
          <div className="absolute top-0 left-0 right-0" style={{ height: '192px', transform: 'rotate(180deg)' }}>
            <svg className="wave-svg w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 200" preserveAspectRatio="none">
              <path className="wave-path" d="M0,160 C120,100 240,220 480,160 C720,100 900,220 1080,160 C1260,100 1440,220 1440,160 L1440,320 L0,320 Z" />
            </svg>
          </div>
          {/* Left */}
          <div className="absolute left-0 top-0 bottom-0" style={{ width: '192px', transform: 'rotate(90deg)', transformOrigin: 'left top', left: '192px' }}>
            <svg className="wave-svg w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 200" preserveAspectRatio="none">
              <path className="wave-path" d="M0,160 C120,100 240,220 480,160 C720,100 900,220 1080,160 C1260,100 1440,220 1440,160 L1440,320 L0,320 Z" />
            </svg>
          </div>
          {/* Right */}
          <div className="absolute right-0 top-0 bottom-0" style={{ width: '192px', transform: 'rotate(-90deg)', transformOrigin: 'right top', right: '192px' }}>
            <svg className="wave-svg w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 200" preserveAspectRatio="none">
              <path className="wave-path" d="M0,160 C120,100 240,220 480,160 C720,100 900,220 1080,160 C1260,100 1440,220 1440,160 L1440,320 L0,320 Z" />
            </svg>
          </div>
        </div>
      )}
      <CardContent className="p-6 relative z-10">
        <div className="relative group">
          <div
            ref={scrollContainerRef}
            className="min-h-[200px] max-h-[600px] overflow-y-auto"
          >
            {transcript ? (
              <p className={`text-lg leading-relaxed whitespace-pre-wrap break-words ${transcript.startsWith("[Error:") ? "text-destructive" : ""
                }`}>
                {transcript}
                {isProcessing && !transcript.startsWith("[Error:") && (
                  <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-1" />
                )}
              </p>
            ) : isRecording ? (
              <p className="text-muted-foreground text-center py-8 italic">
                Listening...
              </p>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Start recording to see your transcription here...
              </p>
            )}
          </div>
          {transcript && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

