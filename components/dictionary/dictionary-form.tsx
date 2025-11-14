"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DictionaryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editingWord?: { id: string; word: string; substitution?: string | null }
  showSnackbar?: (message: string, type: "success" | "error") => void
}

export function DictionaryForm({
  open,
  onOpenChange,
  onSuccess,
  editingWord,
  showSnackbar,
}: DictionaryFormProps) {
  const [word, setWord] = useState("")
  const [substitution, setSubstitution] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (editingWord) {
      setWord(editingWord.word)
      setSubstitution(editingWord.substitution || "")
    } else {
      setWord("")
      setSubstitution("")
    }
    setError("")
  }, [editingWord, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1500))

    try {
      const url = editingWord
        ? "/api/dictionary"
        : "/api/dictionary"
      const method = editingWord ? "PUT" : "POST"

      const body = editingWord
        ? { id: editingWord.id, word, substitution: substitution || undefined }
        : { word, substitution: substitution || undefined }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      await minLoadingTime

      if (!response.ok) {
        setError(data.error || "Something went wrong")
        showSnackbar?.(data.error || "Failed to save word", "error")
        return
      }

      showSnackbar?.(editingWord ? "Word updated successfully!" : "Word added successfully!", "success")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      setError("Something went wrong. Please try again.")
      showSnackbar?.("Failed to save word", "error")
      await minLoadingTime
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingWord ? "Edit Word" : "Add Word to Dictionary"}
          </DialogTitle>
          <DialogDescription>
            Add custom words or spellings to improve transcription accuracy.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="word">Word</Label>
            <input
              id="word"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="e.g., JavaScript"
              required
              disabled={isLoading || !!editingWord}
              className="h-11 border border-gray-300 text-base shadow-xs focus-visible:border-black rounded-md bg-white w-full px-4 placeholder-gray-400 flex items-center"
              style={{display: "flex", alignItems: "center"}}
              autoComplete="off"
            />
            {editingWord && (
              <p className="text-xs text-muted-foreground">
                Word cannot be changed. Delete and recreate to change.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="substitution">Substitution (Optional)</Label>
            <input
              id="substitution"
              value={substitution}
              onChange={(e) => setSubstitution(e.target.value)}
              placeholder="e.g., JS"
              disabled={isLoading}
              className="h-11 border border-gray-300 text-base shadow-xs focus-visible:border-black rounded-md bg-white w-full px-4 placeholder-gray-400 flex items-center"
              style={{display: "flex", alignItems: "center"}}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              How this word should be transcribed (leave empty to use the word itself)
            </p>
          </div>
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : editingWord ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

