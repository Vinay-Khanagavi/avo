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
}

export function DictionaryForm({
  open,
  onOpenChange,
  onSuccess,
  editingWord,
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

      if (!response.ok) {
        setError(data.error || "Something went wrong")
        return
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      setError("Something went wrong. Please try again.")
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
            <Input
              id="word"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="e.g., JavaScript"
              required
              disabled={isLoading || !!editingWord}
            />
            {editingWord && (
              <p className="text-xs text-muted-foreground">
                Word cannot be changed. Delete and recreate to change.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="substitution">Substitution (Optional)</Label>
            <Input
              id="substitution"
              value={substitution}
              onChange={(e) => setSubstitution(e.target.value)}
              placeholder="e.g., JS"
              disabled={isLoading}
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
              {isLoading ? "Saving..." : editingWord ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

