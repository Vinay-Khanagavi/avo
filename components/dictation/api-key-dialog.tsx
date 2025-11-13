"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (service: string, apiKey: string) => void
}

export function ApiKeyDialog({ open, onOpenChange, onSave }: ApiKeyDialogProps) {
  const [service, setService] = useState("whisper")
  const [apiKey, setApiKey] = useState("")
  const [serviceUrl, setServiceUrl] = useState("") // For Whisper custom service URL

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert("Please enter an API key")
      return
    }

    // Save to localStorage
    const customKeys = JSON.parse(localStorage.getItem("customApiKeys") || "{}")
    customKeys[service] = {
      apiKey: apiKey.trim(),
      serviceUrl: service === "whisper" ? serviceUrl.trim() : undefined,
    }
    localStorage.setItem("customApiKeys", JSON.stringify(customKeys))

    onSave(service, apiKey)
    setApiKey("")
    setServiceUrl("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Custom API Key</DialogTitle>
          <DialogDescription>
            Add your own API key for a transcription service. This will override the default keys.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="service">Service</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger id="service">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whisper">Whisper (Custom)</SelectItem>
                <SelectItem value="deepgram">Deepgram</SelectItem>
                <SelectItem value="assemblyai">AssemblyAI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {service === "whisper" && (
            <div className="space-y-2">
              <Label htmlFor="serviceUrl">Service URL (Optional)</Label>
              <Input
                id="serviceUrl"
                type="url"
                placeholder="http://localhost:8000"
                value={serviceUrl}
                onChange={(e) => setServiceUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use default AWS-hosted Whisper service
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your API key is stored locally and never shared
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

