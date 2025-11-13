"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { ApiKeyDialog } from "./api-key-dialog"

export type TranscriptionService = "whisper" | "deepgram" | "assemblyai"

interface ServiceSelectorProps {
  value: TranscriptionService
  onChange: (service: TranscriptionService) => void
  disabled?: boolean
  compact?: boolean // For top-right corner placement
}

export function ServiceSelector({ value, onChange, disabled, compact = false }: ServiceSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hasCustomKeys, setHasCustomKeys] = useState(false)

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
    }
    return labels[value] || value
  }

  if (compact) {
    return (
      <>
        <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
          <SelectTrigger className="w-auto min-w-fit border-none shadow-none gap-1 px-2 py-1.5 focus-visible:ring-0 focus-visible:ring-offset-0">
            <SelectValue>{getDisplayValue()}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="whisper">
              {hasCustomKeys ? "Whisper (Custom)" : "Whisper (AWS)"}
            </SelectItem>
            <SelectItem value="deepgram">Deepgram</SelectItem>
            <SelectItem value="assemblyai">AssemblyAI</SelectItem>
            <SelectItem value="add-custom" className="text-primary">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Add Custom API Key</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <ApiKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} />
      </>
    )
  }

  return (
    <>
      <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger className="w-full border-none shadow-none gap-1 focus-visible:ring-0 focus-visible:ring-offset-0">
          <SelectValue>{getDisplayValue()}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="whisper">
            {hasCustomKeys ? "Whisper (Custom)" : "Whisper (AWS)"}
          </SelectItem>
          <SelectItem value="deepgram">Deepgram</SelectItem>
          <SelectItem value="assemblyai">AssemblyAI</SelectItem>
          <SelectItem value="add-custom" className="text-primary">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Add Custom API Key</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      <ApiKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} />
    </>
  )
}

