'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Mountain, LayoutDashboard, Package, Map,
  Settings, LogOut, Scale, Menu, X, ClipboardList
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useUnit } from '@/components/providers/UnitProvider'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/library', icon: Package, label: 'Gear Library' },
  { href: '/trips', icon: Map, label: 'Trips' },
  { href: '/checklists', icon: ClipboardList, label: 'Checklists' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

// ─── Nav links + footer (no logo — each context supplies its own header) ──────

function SidebarNav({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { unit, toggleUnit } = useUnit()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Signed out')
  }

  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border/60 flex flex-col gap-1">
        <button
          onClick={toggleUnit}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full"
        >
          <Scale className="h-4 w-4 shrink-0" />
          <span>Units: <span className="font-medium text-foreground">{unit}</span></span>
        </button>

        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate max-w-[7rem]">
            {user.email}
          </span>
          <button
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-destructive transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Logo mark ────────────────────────────────────────────────────────────────

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/dashboard" onClick={onClick} className="flex items-center gap-2">
      <Mountain className="h-5 w-5 text-primary" />
      <span className="font-semibold text-foreground tracking-tight text-sm">Ultralight</span>
    </Link>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AppSidebar({ user }: { user: User }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const close = () => setMobileOpen(false)

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 border-r border-border flex-col bg-card shrink-0">
        <div className="px-5 py-5 border-b border-border/60">
          <Logo />
        </div>
        <SidebarNav user={user} />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <Logo />
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile height spacer */}
      <div className="md:hidden h-14 shrink-0" />

      {/* ── Mobile drawer (slides from right) ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={close}
            />

            {/* Drawer — right side */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="md:hidden fixed top-0 right-0 bottom-0 z-50 w-64 bg-card border-l border-border flex flex-col shadow-xl"
            >
              {/* Drawer header — single logo + close */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                <Logo onClick={close} />
                <button
                  onClick={close}
                  aria-label="Close menu"
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <SidebarNav user={user} onNavigate={close} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
