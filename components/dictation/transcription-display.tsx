"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

interface TranscriptionDisplayProps {
  transcript: string
  isProcessing?: boolean
}

export function TranscriptionDisplay({
  transcript,
  isProcessing = false,
}: TranscriptionDisplayProps) {
  const [copied, setCopied] = useState(false)

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
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="relative group">
          <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
            {transcript ? (
              <p className="text-lg leading-relaxed whitespace-pre-wrap">
                {transcript}
                {isProcessing && (
                  <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-1" />
                )}
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

