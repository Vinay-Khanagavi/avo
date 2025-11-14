"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DictionaryForm } from "./dictionary-form"
import { Plus, Edit, Trash2, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Snackbar, useSnackbar } from "@/components/ui/snackbar"

interface DictionaryWord {
  id: string
  word: string
  substitution?: string | null
  createdAt: string
}

export function DictionaryList() {
  const [words, setWords] = useState<DictionaryWord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingWord, setEditingWord] = useState<DictionaryWord | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [wordToDelete, setWordToDelete] = useState<DictionaryWord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar()

  const fetchWords = async () => {
    try {
      const response = await fetch("/api/dictionary")
      if (response.ok) {
        const data = await response.json()
        setWords(data.words || [])
      }
    } catch (error) {
      console.error("Error fetching dictionary:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWords()
  }, [])

  const handleDeleteClick = (word: DictionaryWord) => {
    setWordToDelete(word)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!wordToDelete) return
    setDeleting(true)
    const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1500))

    try {
      const response = await fetch(`/api/dictionary?id=${wordToDelete.id}`, {
        method: "DELETE",
      })

      await minLoadingTime

      if (response.ok) {
        showSnackbar("Word deleted successfully!", "success")
        fetchWords()
        setDeleteDialogOpen(false)
        setWordToDelete(null)
      } else {
        showSnackbar("Failed to delete word", "error")
      }
    } catch (error) {
      console.error("Error deleting word:", error)
      showSnackbar("Failed to delete word", "error")
      await minLoadingTime
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = (word: DictionaryWord) => {
    setEditingWord(word)
    setIsFormOpen(true)
  }

  const handleAdd = () => {
    setEditingWord(undefined)
    setIsFormOpen(true)
  }

  const filteredWords = words.filter((word) =>
    word.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    word.substitution?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dictionary</h1>
          <p className="text-muted-foreground">
            Manage custom words to improve transcription accuracy
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Word
        </Button>
      </div>

      <div className="space-y-4">
        <Input
          placeholder="Search words..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm border-2 border-gray-300 dark:border-gray-600 focus-visible:border-gray-400 dark:focus-visible:border-gray-500"
        />

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredWords.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {searchQuery
                ? "No words found matching your search"
                : "No words in dictionary. Add your first word to get started."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredWords.map((word) => (
              <Card key={word.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{word.word}</p>
                      {word.substitution && (
                        <p className="text-sm text-muted-foreground">
                          → {word.substitution}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(word)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(word)}
                        className="hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <DictionaryForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={fetchWords}
        editingWord={editingWord}
        showSnackbar={showSnackbar}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Word</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{wordToDelete?.word}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setWordToDelete(null)
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={deleting}
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </span>
              ) : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onClose={hideSnackbar}
      />
    </div>
  )
}

