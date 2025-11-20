"use client"

import { useState, useEffect, useRef } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { ApiKeyDialog } from "./api-key-dialog"

export type TranscriptionService = "whisper" | "deepgram" | "assemblyai" | "groq-whisper"

interface ServiceSelectorProps {
  value: TranscriptionService
  onChange: (service: TranscriptionService) => void
  disabled?: boolean
  compact?: boolean // For top-right corner placement
}

export function ServiceSelector({ value, onChange, disabled, compact = false }: ServiceSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hasCustomKeys, setHasCustomKeys] = useState(false)
  const [selectOpen, setSelectOpen] = useState(false)
  const manualCloseRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Check if user has custom API keys
    const customKeys = localStorage.getItem("customApiKeys")
    setHasCustomKeys(!!customKeys && customKeys !== "{}")
  }, [dialogOpen])

  const handleValueChange = (newValue: string) => {
    if (newValue === "add-custom") {
      setDialogOpen(true)
    } else {
      onChange(newValue as TranscriptionService)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // User manually closed the dropdown
      manualCloseRef.current = true
      setSelectOpen(false)

      // Clear the flag after a short cooldown
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        manualCloseRef.current = false
      }, 300)
    } else {
      setSelectOpen(open)
    }
  }

  const handleMouseEnter = () => {
    // Only open on hover if not disabled and not in cooldown period
    if (!disabled && !manualCloseRef.current) {
      setSelectOpen(true)
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleSave = () => {
    // Refresh the hasCustomKeys state
    const customKeys = localStorage.getItem("customApiKeys")
    setHasCustomKeys(!!customKeys && customKeys !== "{}")
  }

  const getDisplayValue = () => {
    if (hasCustomKeys && value === "whisper") {
      return "Whisper (Custom)"
    }
    const labels: Record<TranscriptionService, string> = {
      whisper: "Whisper (AWS)",
      deepgram: "Deepgram",
      assemblyai: "AssemblyAI",
      "groq-whisper": "Groq Whisper",
    }
    return labels[value] || value
  }

  if (compact) {
    return (
      <>
        <div>
          <Select value={value} onValueChange={handleValueChange} disabled={disabled} open={selectOpen} onOpenChange={handleOpenChange}>
            <SelectTrigger
              className="w-auto min-w-fit border-none shadow-none gap-1 px-2 py-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg font-semibold"
              onMouseEnter={handleMouseEnter}
            >
              <SelectValue>{getDisplayValue()}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel className="font-semibold">Batch Processing</SelectLabel>
                <SelectItem value="whisper" className="pl-8">
                  {hasCustomKeys ? "Whisper (Custom)" : "Whisper (AWS)"}
                </SelectItem>
                <SelectItem value="deepgram" className="pl-8">Deepgram</SelectItem>
                <SelectItem value="assemblyai" className="pl-8">AssemblyAI</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="font-semibold">Real-time Streaming</SelectLabel>
                <SelectItem value="groq-whisper" className="pl-8">Groq Whisper</SelectItem>
              </SelectGroup>
              <SelectItem value="add-custom" className="text-primary">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Custom API Key</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ApiKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} />
      </>
    )
  }

  return (
    <>
      <div>
        <Select value={value} onValueChange={handleValueChange} disabled={disabled} open={selectOpen} onOpenChange={handleOpenChange}>
          <SelectTrigger
            className="h-11 w-full border-gray-300 bg-background text-base shadow-xs focus-visible:border-ring"
            onMouseEnter={handleMouseEnter}
          >
            <SelectValue>{getDisplayValue()}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="font-semibold">Batch Processing</SelectLabel>
              <SelectItem value="whisper" className="pl-8">
                {hasCustomKeys ? "Whisper (Custom)" : "Whisper (AWS)"}
              </SelectItem>
              <SelectItem value="deepgram" className="pl-8">Deepgram</SelectItem>
              <SelectItem value="assemblyai" className="pl-8">AssemblyAI</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="font-semibold">Real-time Streaming</SelectLabel>
              <SelectItem value="groq-whisper" className="pl-8">Groq Whisper</SelectItem>
            </SelectGroup>
            <SelectItem value="add-custom" className="text-primary">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Add Custom API Key</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ApiKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} />
    </>
  )
}

