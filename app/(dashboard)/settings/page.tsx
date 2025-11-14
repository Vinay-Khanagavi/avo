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
import { Checkbox } from "@/components/ui/checkbox"
import { Snackbar, useSnackbar } from "@/components/ui/snackbar"

export default function SettingsPage() {
  const [language, setLanguage] = useState("en-US")
  const [chunkSize, setChunkSize] = useState("5")
  const [transcriptionService, setTranscriptionService] = useState<TranscriptionService>("whisper")
  
  // AI Formatter Settings
  const [aiFormatterProvider, setAiFormatterProvider] = useState<"groq" | "openai" | "local" | "none">("groq")
  const [groqApiKey, setGroqApiKey] = useState("")
  const [openaiApiKey, setOpenaiApiKey] = useState("")
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434")
  const [detectBulletPoints, setDetectBulletPoints] = useState(true)
  const [refineGrammar, setRefineGrammar] = useState(true)
  const [improvePunctuation, setImprovePunctuation] = useState(true)
  const [improveCapitalization, setImproveCapitalization] = useState(true)
  const [addFormatting, setAddFormatting] = useState(true)
  const [loading, setLoading] = useState(false)
  
  // Snackbar state
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar()

  // Load settings from localStorage and API on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem("transcriptionLanguage")
    const savedChunkSize = localStorage.getItem("audioChunkSize")
    const savedService = localStorage.getItem("transcriptionService") as TranscriptionService

    if (savedLanguage) setLanguage(savedLanguage)
    if (savedChunkSize) setChunkSize(savedChunkSize)
    if (savedService) setTranscriptionService(savedService)
    
    // Load AI formatter settings from API
    loadAISettings()
  }, [])
  
  const loadAISettings = async () => {
    try {
      const response = await fetch("/api/settings")
      if (response.ok) {
        const data = await response.json()
        console.log("Loaded AI settings:", data) // Debug log
        setAiFormatterProvider(data.aiFormatterProvider || "groq")
        setGroqApiKey(data.groqApiKey || "")
        setOpenaiApiKey(data.openaiApiKey || "")
        setOllamaUrl(data.ollamaUrl || "http://localhost:11434")
        setDetectBulletPoints(data.detectBulletPoints !== undefined ? data.detectBulletPoints : true)
        setRefineGrammar(data.refineGrammar !== undefined ? data.refineGrammar : true)
        setImprovePunctuation(data.improvePunctuation !== undefined ? data.improvePunctuation : true)
        setImproveCapitalization(data.improveCapitalization !== undefined ? data.improveCapitalization : true)
        setAddFormatting(data.addFormatting !== undefined ? data.addFormatting : true)
      } else {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` }
        }
        console.error("Failed to load AI settings:", response.status, errorData)
        // Don't show alert for 500 errors - just log and use defaults
        if (response.status !== 500) {
          console.warn("Using default AI settings due to error")
        }
      }
    } catch (error: any) {
      console.error("Failed to load AI settings:", error)
      // Use defaults on error - don't break the UI
    }
  }

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
    setLoading(true)
    const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1500))
    
    try {
      // Save transcription settings to localStorage
      localStorage.setItem("transcriptionLanguage", language)
      localStorage.setItem("audioChunkSize", chunkSize)
      localStorage.setItem("transcriptionService", transcriptionService)
      
      // Trigger custom event for same-tab sync
      window.dispatchEvent(new Event("transcriptionServiceChanged"))
      
      // Save AI formatter settings to API
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aiFormatterProvider: aiFormatterProvider,
          groqApiKey: groqApiKey,
          openaiApiKey: openaiApiKey,
          ollamaUrl: ollamaUrl,
          detectBulletPoints: detectBulletPoints,
          refineGrammar: refineGrammar,
          improvePunctuation: improvePunctuation,
          improveCapitalization: improveCapitalization,
          addFormatting: addFormatting,
        }),
      })
      
      await minLoadingTime
      
      if (response.ok) {
        const result = await response.json()
        showSnackbar("Settings saved successfully!", "success")
        // Reload settings to ensure UI is in sync
        await loadAISettings()
      } else {
        const error = await response.json().catch(() => ({ error: "Unknown error" }))
        showSnackbar(`Failed to save settings: ${error.error || "Unknown error"}`, "error")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      showSnackbar("Failed to save settings. Please try again.", "error")
      await minLoadingTime
    } finally {
      setLoading(false)
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Configure your transcription preferences and AI formatting options
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            className="h-11 px-6 shadow-sm bg-black text-white w-full sm:w-auto" 
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : "Save Settings"}
          </Button>
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
          </CardContent>
        </Card>

        <Card className="border-gray-300 shadow-md">
          <CardHeader>
            <CardTitle>AI Formatter Settings</CardTitle>
            <CardDescription>
              Configure AI-powered text formatting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="aiFormatterProvider">AI Formatter Provider</Label>
              <Select 
                value={aiFormatterProvider} 
                onValueChange={(value: "groq" | "openai" | "local" | "none") => setAiFormatterProvider(value as "groq" | "openai" | "local" | "none")}
              >
                <SelectTrigger
                  id="aiFormatterProvider"
                  className="h-11 w-full border-gray-300 bg-background text-base shadow-xs focus-visible:border-ring"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="groq">Groq API (Recommended)</SelectItem>
                  <SelectItem value="openai">OpenAI GPT-4o-mini</SelectItem>
                  <SelectItem value="local">Local LLM (Ollama)</SelectItem>
                  <SelectItem value="none">Disabled</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose which AI service to use for formatting transcripts. Groq API is recommended for fast inference.
              </p>
            </div>

            {aiFormatterProvider === "groq" && (
              <div className="space-y-2">
                <Label htmlFor="groqApiKey">Groq API Key (Optional)</Label>
                <Input
                  id="groqApiKey"
                  type="password"
                  value={groqApiKey}
                  onChange={(e) => setGroqApiKey(e.target.value)}
                  placeholder="Leave empty to use default Groq API key"
                  className="h-11 border-gray-300 text-base shadow-xs focus-visible:border-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Add your own Groq API key. If left empty, the default key will be used. Get your key from console.groq.com
                </p>
              </div>
            )}

            {aiFormatterProvider === "openai" && (
              <div className="space-y-2">
                <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
                <Input
                  id="openaiApiKey"
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder="Enter your OpenAI API key"
                  className="h-11 border-gray-300 text-base shadow-xs focus-visible:border-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Your API key is encrypted and stored securely. Get your key from platform.openai.com
                </p>
              </div>
            )}

            {aiFormatterProvider === "local" && (
              <div className="space-y-2">
                <Label htmlFor="ollamaUrl">Ollama URL</Label>
                <Input
                  id="ollamaUrl"
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="h-11 border-gray-300 text-base shadow-xs focus-visible:border-ring"
                />
                <p className="text-xs text-muted-foreground">
                  URL of your local Ollama instance. Default: http://localhost:11434
                </p>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t">
              <Label>Formatting Options</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="detectBulletPoints"
                  checked={detectBulletPoints}
                  onCheckedChange={(checked) => setDetectBulletPoints(checked === true)}
                />
                <Label htmlFor="detectBulletPoints" className="font-normal cursor-pointer">
                  Convert "point" to bullet points (•)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="refineGrammar"
                  checked={refineGrammar}
                  onCheckedChange={(checked) => setRefineGrammar(checked === true)}
                />
                <Label htmlFor="refineGrammar" className="font-normal cursor-pointer">
                  Refine grammar and sentence structure
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="improvePunctuation"
                  checked={improvePunctuation}
                  onCheckedChange={(checked) => setImprovePunctuation(checked === true)}
                />
                <Label htmlFor="improvePunctuation" className="font-normal cursor-pointer">
                  Improve punctuation
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="improveCapitalization"
                  checked={improveCapitalization}
                  onCheckedChange={(checked) => setImproveCapitalization(checked === true)}
                />
                <Label htmlFor="improveCapitalization" className="font-normal cursor-pointer">
                  Fix capitalization
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="addFormatting"
                  checked={addFormatting}
                  onCheckedChange={(checked) => setAddFormatting(checked === true)}
                />
                <Label htmlFor="addFormatting" className="font-normal cursor-pointer">
                  Add proper formatting (paragraphs, lists)
                </Label>
              </div>
            </div>
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
      
      {/* Snackbar */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onClose={hideSnackbar}
      />
    </div>
  )
}

