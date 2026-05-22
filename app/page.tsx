import Link from 'next/link'
import { Mountain, Scale, Package, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mountain className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground tracking-tight">Ultralight</span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Sign in →
        </Link>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-medium mb-8">
          <Scale className="h-3 w-3" />
          Ultralight Pack Calculator
        </div>

        <h1 className="text-5xl font-semibold tracking-tight text-foreground max-w-xl leading-tight mb-6">
          Know exactly what you're carrying
        </h1>

        <p className="text-lg text-muted-foreground max-w-md mb-10 leading-relaxed">
          Build your gear library, plan trips, and track base weight, worn weight, and consumables — all in one clean tool.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors text-sm"
        >
          Get started
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Features */}
      <div className="border-t border-border/50 px-6 py-16">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Package,
              title: 'Gear Library',
              desc: 'Keep a searchable library of all your gear with brand, category, type, and weight.',
            },
            {
              icon: Scale,
              title: 'Weight Breakdown',
              desc: 'Instantly see base weight, worn weight, and consumables. Toggle oz or grams.',
            },
            {
              icon: Mountain,
              title: 'Trip Planning',
              desc: 'Build trips from your library, use templates, and exclude items without deleting them.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                <Icon className="h-4 w-4 text-accent-foreground" />
              </div>
              <h3 className="font-medium text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
