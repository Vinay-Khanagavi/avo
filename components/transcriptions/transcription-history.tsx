"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Check, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { Snackbar, useSnackbar } from "@/components/ui/snackbar"

interface Transcription {
  id: string
  text: string
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function TranscriptionHistory() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar()

  const fetchTranscriptions = async (page = 1, search = "") => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
      })

      const response = await fetch(`/api/transcriptions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTranscriptions(data.transcriptions || [])
        setPagination(data.pagination || pagination)
      }
    } catch (error) {
      console.error("Error fetching transcriptions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchTranscriptions(1, searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  useEffect(() => {
    fetchTranscriptions()
  }, [])

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      showSnackbar("Copied to clipboard!", "success")
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
      showSnackbar("Failed to copy", "error")
    }
  }

  const handlePageChange = (newPage: number) => {
    fetchTranscriptions(newPage, searchQuery)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Transcription History</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          View and manage your past transcriptions
        </p>
      </div>

      <Input
        placeholder="Search transcriptions..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full sm:max-w-sm border-2 border-gray-300 dark:border-gray-600 focus-visible:border-gray-400 dark:focus-visible:border-gray-500"
      />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : transcriptions.length === 0 ? (
        <Card>
          <CardContent className="py-6 sm:py-8 text-center text-muted-foreground">
            {searchQuery
              ? "No transcriptions found matching your search"
              : "No transcriptions yet. Start dictating to see your history here."}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3 sm:space-y-4">
            {transcriptions.map((transcription) => (
              <Card key={transcription.id} className="group">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 relative">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">
                        {format(new Date(transcription.createdAt), "PPp")}
                      </p>
                      <p className="whitespace-pre-wrap text-sm sm:text-base break-words">{transcription.text}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(transcription.text, transcription.id)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start sm:self-auto"
                    >
                      {copiedId === transcription.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4">
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="w-full sm:w-auto"
              >
                Previous
              </Button>
              <span className="text-sm sm:text-base px-2 sm:px-4">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="w-full sm:w-auto"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onClose={hideSnackbar}
      />
    </div>
  )
}

