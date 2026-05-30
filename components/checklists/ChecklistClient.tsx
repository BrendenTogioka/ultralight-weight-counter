'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Trash2, Pencil, Copy, Plus, X,
  FileText, Download, MoreHorizontal, Check, Loader2,
} from 'lucide-react'
import Link from 'next/link'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { Checklist, ChecklistItem } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { pageVariants, staggerContainer, staggerItem } from '@/lib/motion'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface Props {
  checklist: Checklist
}

export function ChecklistClient({ checklist: initial }: Props) {
  const router = useRouter()
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<ChecklistItem[]>(
    (initial.checklist_items ?? []) as ChecklistItem[]
  )
  const [name, setName] = useState(initial.name)
  const [editingName, setEditingName] = useState(false)
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemBrand, setNewItemBrand] = useState('')
  const [duplicating, setDuplicating] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const checked = items.filter(i => i.checked).length
  const total = items.length
  const allDone = total > 0 && checked === total

  // ── Toggle item ──────────────────────────────────────────────
  async function handleToggle(item: ChecklistItem) {
    const supabase = createClient()
    const { error } = await supabase
      .from('checklist_items')
      .update({ checked: !item.checked })
      .eq('id', item.id)
    if (error) { toast.error('Failed to update'); return }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i))
  }

  async function handleUncheckAll() {
    const supabase = createClient()
    const { error } = await supabase
      .from('checklist_items')
      .update({ checked: false })
      .eq('checklist_id', initial.id)
    if (error) { toast.error('Failed to reset'); return }
    setItems(prev => prev.map(i => ({ ...i, checked: false })))
    toast.success('All items unchecked')
  }

  // ── Rename ───────────────────────────────────────────────────
  async function handleRename() {
    const trimmed = name.trim()
    if (!trimmed) { setName(initial.name); setEditingName(false); return }
    if (trimmed === initial.name) { setEditingName(false); return }
    const supabase = createClient()
    const { error } = await supabase
      .from('checklists')
      .update({ name: trimmed })
      .eq('id', initial.id)
    if (error) { toast.error('Failed to rename'); return }
    setEditingName(false)
    toast.success('Checklist renamed')
  }

  // ── Add item ─────────────────────────────────────────────────
  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItemName.trim()) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('checklist_items')
      .insert({
        checklist_id: initial.id,
        name: newItemName.trim(),
        brand: newItemBrand.trim() || null,
        sort_order: items.length,
        checked: false,
      })
      .select()
      .single()
    if (error) { toast.error('Failed to add item'); return }
    setItems(prev => [...prev, data as ChecklistItem])
    setNewItemName('')
    setNewItemBrand('')
  }

  // ── Delete item ──────────────────────────────────────────────
  async function handleDeleteItem(itemId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('checklist_items').delete().eq('id', itemId)
    if (error) { toast.error('Failed to remove item'); return }
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  // ── Notes ────────────────────────────────────────────────────
  async function handleSaveNotes(value: string) {
    if (value === (initial.notes ?? '')) return
    const supabase = createClient()
    const { error } = await supabase
      .from('checklists')
      .update({ notes: value || null })
      .eq('id', initial.id)
    if (error) toast.error('Failed to save notes')
  }

  // ── Duplicate ────────────────────────────────────────────────
  async function handleDuplicate() {
    setDuplicating(true)
    const supabase = createClient()
    const { data: copy, error } = await supabase
      .from('checklists')
      .insert({
        user_id: initial.user_id,
        trip_id: initial.trip_id ?? null,
        name: `${name} (Copy)`,
        notes: notes || null,
      })
      .select()
      .single()
    if (error) { toast.error('Failed to duplicate'); setDuplicating(false); return }
    if (items.length > 0) {
      await supabase.from('checklist_items').insert(
        items.map(item => ({
          checklist_id: copy.id,
          name: item.name,
          brand: item.brand ?? null,
          sort_order: item.sort_order,
          checked: false,
        }))
      )
    }
    toast.success('Checklist duplicated!')
    router.push(`/checklists/${copy.id}`)
    setDuplicating(false)
  }

  // ── Delete checklist ─────────────────────────────────────────
  async function handleDelete() {
    const supabase = createClient()
    const { error } = await supabase.from('checklists').delete().eq('id', initial.id)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Checklist deleted')
    router.push('/checklists')
  }

  // ── Export PDF ───────────────────────────────────────────────
  async function exportPdf() {
    setExportingPdf(true)
    try {
      const { default: jsPDF, AcroFormCheckBox } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 20
      let y = 28

      // Title
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(20, 20, 20)
      doc.text(name, margin, y); y += 8

      if (notes) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(120, 120, 120)
        doc.text(notes, margin, y, { maxWidth: pageW - margin * 2 }); y += 8
      }
      y += 4

      // Items
      items.forEach((item, idx) => {
        if (y > 270) { doc.addPage(); y = 20 }
        const boxSize = 4
        const boxTop = y - boxSize + 0.5

        // Visible checkbox outline (renders in every PDF viewer)
        doc.setDrawColor(150, 150, 150)
        doc.setLineWidth(0.4)
        doc.rect(margin, boxTop, boxSize, boxSize)

        // Interactive, clickable checkbox overlaid on the outline. Toggles in
        // PDF readers that support form fields (Acrobat, Apple Preview, etc.).
        const checkBox = new AcroFormCheckBox()
        checkBox.fieldName = `item_${idx}`
        checkBox.x = margin
        checkBox.y = boxTop
        checkBox.width = boxSize
        checkBox.height = boxSize
        checkBox.appearanceState = item.checked ? 'On' : 'Off'
        doc.addField(checkBox)

        // Name — measure its width at the SAME font size it's drawn at, so the
        // brand that follows never overlaps it.
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(30, 30, 30)
        const nameX = margin + boxSize + 3
        doc.text(item.name, nameX, y)
        const nameWidth = doc.getTextWidth(item.name)

        // Brand, placed just after the (correctly measured) name
        if (item.brand) {
          doc.setFontSize(8)
          doc.setTextColor(140, 140, 140)
          doc.text(item.brand, nameX + nameWidth + 3, y)
        }
        y += 7
      })

      // Footer
      doc.setFontSize(8)
      doc.setTextColor(160, 160, 160)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Generated by Ultralight · ${new Date().toLocaleDateString()}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      )

      doc.save(`${name.replace(/\s+/g, '-').toLowerCase()}-checklist.pdf`)
    } catch (err) {
      console.error(err)
      toast.error('PDF export failed')
    } finally {
      setExportingPdf(false)
    }
  }

  // ── Export Text ──────────────────────────────────────────────
  function exportText() {
    const lines = [
      name,
      `${checked}/${total} packed`,
      '',
      ...items.map(item =>
        `${item.checked ? '[x]' : '[ ]'} ${item.name}${item.brand ? ` (${item.brand})` : ''}`
      ),
    ]
    if (notes) { lines.push('', '--- Notes ---', notes) }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/\s+/g, '-').toLowerCase()}-checklist.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="px-4 sm:px-8 py-8 max-w-2xl mx-auto"
    >
      {/* Back */}
      <Link
        href="/checklists"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Checklists
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex-1 min-w-0">
          {/* Editable name */}
          {editingName ? (
            <input
              ref={nameInputRef}
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') { setName(initial.name); setEditingName(false) }
              }}
              className="text-2xl font-semibold bg-transparent border-b-2 border-primary focus:outline-none w-full"
            />
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight truncate">{name}</h1>
              <button
                onClick={() => setEditingName(true)}
                aria-label="Rename checklist"
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1 rounded-lg hover:bg-secondary"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-1">
            {checked} of {total} packed
            {allDone && <span className="ml-2 text-primary font-medium">— all done! 🎉</span>}
          </p>

          {/* Progress bar */}
          {total > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {Math.round((checked / total) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(checked / total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <button
            onClick={() => setIsEditing(p => !p)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors',
              isEditing
                ? 'border-primary bg-accent text-accent-foreground'
                : 'border-border hover:bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isEditing ? 'Done' : 'Edit'}</span>
          </button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                aria-label="More options"
                className="inline-flex items-center justify-center w-9 h-9 border border-border rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 min-w-44 bg-card border border-border rounded-xl shadow-xl p-1"
              >
                <DropdownMenu.Item
                  onSelect={handleDuplicate}
                  disabled={duplicating}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-secondary cursor-pointer outline-none select-none disabled:opacity-50"
                >
                  {duplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                  Duplicate
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={exportPdf}
                  disabled={exportingPdf}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-secondary cursor-pointer outline-none select-none disabled:opacity-50"
                >
                  {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                  Export PDF
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={exportText}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-secondary cursor-pointer outline-none select-none"
                >
                  <Download className="h-4 w-4 text-muted-foreground" />
                  Export text
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-border my-1 -mx-1" />
                <DropdownMenu.Item
                  onSelect={() => setConfirmDelete(true)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-destructive rounded-lg hover:bg-destructive/10 cursor-pointer outline-none select-none"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete checklist
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Uncheck all */}
      {checked > 0 && !isEditing && (
        <div className="mb-4">
          <button
            onClick={handleUncheckAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Uncheck all
          </button>
        </div>
      )}

      {/* Items list */}
      {items.length === 0 && !isEditing ? (
        <div className="border border-dashed border-border rounded-2xl p-12 text-center">
          <p className="text-sm text-muted-foreground">No items in this checklist.</p>
          <button
            onClick={() => setIsEditing(true)}
            className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add items
          </button>
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="border border-border rounded-xl overflow-hidden"
        >
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1 && !isEditing
            return (
              <motion.div
                variants={staggerItem}
                key={item.id}
                className={cn(
                  'flex items-center gap-4 px-4 py-3.5 transition-colors',
                  !isLast && 'border-b border-border',
                  !isEditing && 'hover:bg-secondary/20 cursor-pointer',
                )}
                onClick={isEditing ? undefined : () => handleToggle(item)}
              >
                {/* Checkbox */}
                {!isEditing && (
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors',
                      item.checked ? 'bg-primary border-primary' : 'border-border'
                    )}
                  >
                    {item.checked && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                )}

                {/* Name + brand */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium transition-colors',
                    !isEditing && item.checked ? 'line-through text-muted-foreground' : 'text-foreground'
                  )}>
                    {item.name}
                  </p>
                  {item.brand && (
                    <p className={cn(
                      'text-xs transition-colors',
                      !isEditing && item.checked ? 'text-muted-foreground/50' : 'text-muted-foreground'
                    )}>
                      {item.brand}
                    </p>
                  )}
                </div>

                {/* Edit mode: delete button */}
                {isEditing && (
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </motion.div>
            )
          })}

          {/* Add item form — shown in edit mode */}
          {isEditing && (
            <form onSubmit={handleAddItem} className="border-t border-border px-4 py-3 bg-secondary/20">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Add item</p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="Item name"
                  className="flex-1 px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  value={newItemBrand}
                  onChange={e => setNewItemBrand(e.target.value)}
                  placeholder="Brand (optional)"
                  className="w-32 px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={!newItemName.trim()}
                  className="px-3 py-2 btn-primary rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}
        </motion.div>
      )}

      {/* Notes */}
      <div className="mt-6">
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Trip Notes
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={e => handleSaveNotes(e.target.value)}
          placeholder="Add notes, reminders, or anything else for this trip…"
          rows={4}
          className="w-full px-3.5 py-3 text-sm border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow resize-none placeholder:text-muted-foreground/50"
        />
      </div>
    </motion.div>

    {confirmDelete && (
      <ConfirmDialog
        title="Delete checklist?"
        message={`"${name}" will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={() => { setConfirmDelete(false); handleDelete() }}
        onCancel={() => setConfirmDelete(false)}
      />
    )}
    </>
  )
}
