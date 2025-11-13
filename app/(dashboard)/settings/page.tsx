"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ServiceSelector, TranscriptionService } from "@/components/dictation/service-selector"

export default function SettingsPage() {
  const [language, setLanguage] = useState("en-US")
  const [chunkSize, setChunkSize] = useState("5")
  const [transcriptionService, setTranscriptionService] = useState<TranscriptionService>("whisper")

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem("transcriptionLanguage")
    const savedChunkSize = localStorage.getItem("audioChunkSize")
    const savedService = localStorage.getItem("transcriptionService") as TranscriptionService

    if (savedLanguage) setLanguage(savedLanguage)
    if (savedChunkSize) setChunkSize(savedChunkSize)
    if (savedService) setTranscriptionService(savedService)
  }, [])

  // Listen for storage changes (when updated in dictation page)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "transcriptionService" && e.newValue) {
        setTranscriptionService(e.newValue as TranscriptionService)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  // Listen for custom event (same-tab sync)
  useEffect(() => {
    const handleCustomChange = () => {
      const savedService = localStorage.getItem("transcriptionService") as TranscriptionService
      if (savedService && savedService !== transcriptionService) {
        setTranscriptionService(savedService)
      }
    }

    window.addEventListener("transcriptionServiceChanged", handleCustomChange)
    return () => window.removeEventListener("transcriptionServiceChanged", handleCustomChange)
  }, [transcriptionService])

  const handleSave = async () => {
    // Save settings to localStorage or API
    localStorage.setItem("transcriptionLanguage", language)
    localStorage.setItem("audioChunkSize", chunkSize)
    localStorage.setItem("transcriptionService", transcriptionService)
    
    // Trigger custom event for same-tab sync
    window.dispatchEvent(new Event("transcriptionServiceChanged"))
    
    alert("Settings saved!")
  }

  const handleServiceChange = (service: TranscriptionService) => {
    setTranscriptionService(service)
    localStorage.setItem("transcriptionService", service)
    // Trigger custom event for same-tab sync
    window.dispatchEvent(new Event("transcriptionServiceChanged"))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure your transcription preferences
          </p>
        </div>

        <Card className="border-gray-300 shadow-md">
          <CardHeader>
            <CardTitle>Transcription Settings</CardTitle>
            <CardDescription>
              Customize how your voice is transcribed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger
                  id="language"
                  className="h-11 w-full border-gray-300 bg-background text-base shadow-xs focus-visible:border-ring"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                  <SelectItem value="es-ES">Spanish</SelectItem>
                  <SelectItem value="fr-FR">French</SelectItem>
                  <SelectItem value="de-DE">German</SelectItem>
                  <SelectItem value="it-IT">Italian</SelectItem>
                  <SelectItem value="pt-BR">Portuguese (Brazil)</SelectItem>
                  <SelectItem value="ja-JP">Japanese</SelectItem>
                  <SelectItem value="ko-KR">Korean</SelectItem>
                  <SelectItem value="zh-CN">Chinese (Simplified)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chunkSize">Audio Chunk Size (seconds)</Label>
              <Input
                id="chunkSize"
                type="number"
                min="3"
                max="10"
                value={chunkSize}
                onChange={(e) => setChunkSize(e.target.value)}
                className="h-11 border-gray-300 text-base shadow-xs focus-visible:border-ring"
              />
              <p className="text-xs text-muted-foreground">
                Smaller chunks provide faster transcription but may reduce accuracy.
                Recommended: 5 seconds
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transcriptionService">Transcription Service</Label>
              <ServiceSelector
                value={transcriptionService}
                onChange={handleServiceChange}
                disabled={false}
              />
              <p className="text-xs text-muted-foreground">
                Choose your preferred transcription service. Each service has different accuracy and speed characteristics.
              </p>
            </div>

            <Button onClick={handleSave} className="h-11 px-6 shadow-sm">
              Save Settings
            </Button>
          </CardContent>
        </Card>

        <Card className="border-gray-300 shadow-md">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Manage your account settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Account management features coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

