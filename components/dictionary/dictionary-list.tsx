"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DictionaryForm } from "./dictionary-form"
import { Plus, Edit, Trash2, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"

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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this word?")) {
      return
    }

    try {
      const response = await fetch(`/api/dictionary?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchWords()
      }
    } catch (error) {
      console.error("Error deleting word:", error)
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
          className="max-w-sm"
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
                        onClick={() => handleDelete(word.id)}
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
      />
    </div>
  )
}

