'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { UserSettings, WeightUnit } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { passwordSchema } from '@/lib/validation'
import { useUnit } from '@/components/providers/UnitProvider'
import { useTheme } from '@/components/providers/ThemeProvider'
import { toast } from 'sonner'
import { Loader2, Scale, User as UserIcon, Lock, Moon, Sun, LayoutGrid, List, Check } from 'lucide-react'

interface Props {
  settings: UserSettings | null
  user: User
}

export function SettingsClient({ settings, user }: Props) {
  const { unit, setUnit } = useUnit()
  const { theme, setTheme } = useTheme()
  const [defaultUnit, setDefaultUnit] = useState<WeightUnit>(settings?.default_unit ?? 'oz')
  const [defaultView, setDefaultView] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('gear_view') as 'list' | 'grid') ?? 'list'
    }
    return 'list'
  })

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  async function handleSelectUnit(u: WeightUnit) {
    setDefaultUnit(u)
    setUnit(u)
    const supabase = createClient()
    const { error } = await supabase
      .from('user_settings')
      .update({ default_unit: u })
      .eq('user_id', user.id)
    if (error) toast.error('Failed to save unit preference')
    else toast.success('Unit preference saved', { duration: 1500 })
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    const parsed = passwordSchema.safeParse({ newPassword, confirmPassword })
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message)
      return
    }

    setSavingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setSavingPassword(false)
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-8">Settings</h1>

      {/* Account info */}
      <section className="mb-8">
        <SectionHeader icon={UserIcon} title="Account" />
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <span className="text-sm font-semibold text-accent-foreground">
                {user.email?.[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">
                Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Weight unit */}
      <section className="mb-8">
        <SectionHeader icon={Scale} title="Default Weight Unit" />
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-sm text-muted-foreground mb-4">
            Choose which unit to display weights in by default. You can always toggle this in the sidebar.
          </p>
          <div className="flex items-center gap-3">
            {(['oz', 'g'] as WeightUnit[]).map(u => (
              <button
                key={u}
                onClick={() => handleSelectUnit(u)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  defaultUnit === u
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-border text-muted-foreground hover:border-border/80 hover:bg-secondary/50'
                }`}
              >
                {defaultUnit === u && <Check className="h-3.5 w-3.5" />}
                {u === 'oz' ? 'Ounces (oz)' : 'Grams (g)'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="mb-8">
        <SectionHeader icon={theme === 'dark' ? Moon : Sun} title="Appearance" />
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-sm text-muted-foreground mb-4">
            Choose your preferred color theme.
          </p>
          <div className="flex items-center gap-3">
            {(['light', 'dark'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  theme === t
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-border text-muted-foreground hover:border-border/80 hover:bg-secondary/50'
                }`}
              >
                {t === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Default gear view */}
      <section className="mb-8">
        <SectionHeader icon={LayoutGrid} title="Default Gear View" />
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-sm text-muted-foreground mb-4">
            Choose whether your gear library opens in list or grid view by default.
          </p>
          <div className="flex items-center gap-3">
            {([
              { value: 'list' as const, icon: List, label: 'List' },
              { value: 'grid' as const, icon: LayoutGrid, label: 'Grid' },
            ]).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => {
                  setDefaultView(value)
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('gear_view', value)
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  defaultView === value
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-border text-muted-foreground hover:border-border/80 hover:bg-secondary/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Change password */}
      <section>
        <SectionHeader icon={Lock} title="Change Password" />
        <div className="bg-card border border-border rounded-2xl p-5">
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <Field label="New password">
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className={inputCls}
                placeholder="At least 8 characters" maxLength={128}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password">
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={inputCls}
                placeholder="Repeat new password" maxLength={128}
                autoComplete="new-password"
              />
            </Field>
            <button
              type="submit"
              disabled={savingPassword || !newPassword || !confirmPassword}
              className="w-full btn-primary py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
            >
              {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full px-3.5 py-2.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow'
