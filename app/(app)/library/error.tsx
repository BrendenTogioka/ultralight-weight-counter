'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function LibraryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-8">Gear Library</h1>
      <div className="border border-border rounded-2xl p-16 text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Failed to load library</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {error.message ?? 'Could not load your gear library. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  )
}
