import Link from 'next/link'
import { Mountain, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <div className="flex items-center gap-2 justify-center mb-10">
          <Mountain className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight">Ultralight</span>
        </div>
        <p className="text-7xl font-bold text-foreground/10 mb-4 tabular-nums">404</p>
        <h1 className="text-xl font-semibold text-foreground mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-8">
          That page doesn't exist or you don't have access to it.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}
