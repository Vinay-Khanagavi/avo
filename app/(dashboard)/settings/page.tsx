"use client"

import { useState } from "react"
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

export default function SettingsPage() {
  const [language, setLanguage] = useState("en-US")
  const [chunkSize, setChunkSize] = useState("5")

  const handleSave = async () => {
    // Save settings to localStorage or API
    localStorage.setItem("transcriptionLanguage", language)
    localStorage.setItem("audioChunkSize", chunkSize)
    alert("Settings saved!")
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

        <Card>
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
                <SelectTrigger id="language">
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
              />
              <p className="text-xs text-muted-foreground">
                Smaller chunks provide faster transcription but may reduce accuracy.
                Recommended: 5 seconds
              </p>
            </div>

            <Button onClick={handleSave}>Save Settings</Button>
          </CardContent>
        </Card>

        <Card>
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

