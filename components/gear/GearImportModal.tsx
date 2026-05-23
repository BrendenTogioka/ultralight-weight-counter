'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import type { GearItem, WeightUnit } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { GEAR_CATEGORIES } from '@/lib/utils'
import { motion } from 'framer-motion'
import { backdropVariants, modalCardVariants } from '@/lib/motion'
import { toast } from 'sonner'
import Papa from 'papaparse'

interface ParsedRow {
  name: string
  brand: string
  category: string
  type: string
  weight_oz: number
  weight_unit: WeightUnit
  notes: string
  valid: boolean
  error?: string
}

interface Props {
  userId: string
  existingItems: GearItem[]
  onClose: () => void
  onImported: (items: GearItem[]) => void
}

const EXPECTED_HEADERS = ['name', 'brand', 'category', 'type', 'weight_oz', 'weight_unit', 'notes']

export function GearImportModal({ userId, existingItems, onClose, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview'>('upload')

  const existingNames = new Set(existingItems.map(i => i.name.toLowerCase().trim()))

  function parseFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file')
      return
    }
    setFileName(file.name)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows: ParsedRow[] = result.data.map((row) => {
          const name = (row.name ?? row.Name ?? '').trim()
          const brand = (row.brand ?? row.Brand ?? '').trim()
          const rawCat = (row.category ?? row.Category ?? '').trim()
          const category = (GEAR_CATEGORIES as readonly string[]).includes(rawCat) ? rawCat : 'Other'
          const type = (row.type ?? row.Type ?? '').trim()
          const weightRaw = parseFloat(row.weight_oz ?? row['Weight (oz)'] ?? '0')
          const weight_oz = isNaN(weightRaw) ? 0 : Math.max(0, weightRaw)
          const rawUnit = ((row.weight_unit ?? row.unit ?? 'oz')).toLowerCase().trim()
          const weight_unit: WeightUnit = rawUnit === 'g' ? 'g' : 'oz'
          const notes = (row.notes ?? row.Notes ?? '').trim()

          if (!name) return { name, brand, category, type, weight_oz, weight_unit, notes, valid: false, error: 'Name is required' }
          if (existingNames.has(name.toLowerCase())) return { name, brand, category, type, weight_oz, weight_unit, notes, valid: false, error: 'Already in library (skipped)' }

          return { name, brand, category, type, weight_oz, weight_unit, notes, valid: true }
        })
        setParsedRows(rows)
        setStep('preview')
      },
      error: () => toast.error('Failed to parse CSV'),
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  const validRows = parsedRows.filter(r => r.valid)
  const skippedRows = parsedRows.filter(r => !r.valid)

  async function handleImport() {
    if (validRows.length === 0) return
    setImporting(true)
    const supabase = createClient()

    const toInsert = validRows.map(r => ({
      user_id: userId,
      name: r.name,
      brand: r.brand || null,
      category: r.category,
      type: r.type || null,
      weight_oz: r.weight_oz,
      weight_unit: r.weight_unit,
      notes: r.notes || null,
    }))

    const { data, error } = await supabase
      .from('gear_items')
      .insert(toInsert)
      .select('*')

    if (error) {
      toast.error('Import failed')
      setImporting(false)
      return
    }

    toast.success(`Imported ${data.length} item${data.length !== 1 ? 's' : ''}${skippedRows.length > 0 ? `, skipped ${skippedRows.length}` : ''}`)
    onImported(data as GearItem[])
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        variants={backdropVariants}
        initial="initial"
        animate="animate"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        variants={modalCardVariants}
        initial="initial"
        animate="animate"
        className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Import gear from CSV</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Columns: name, brand, category, type, weight_oz, weight_unit, notes
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Upload step */}
          {step === 'upload' && (
            <div className="p-6">
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
                  isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50 hover:bg-secondary/30'
                )}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">Upload CSV file</p>
                <p className="text-xs text-muted-foreground">Click or drag & drop</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Template download hint */}
              <p className="text-xs text-muted-foreground text-center mt-4">
                Use the{' '}
                <button
                  onClick={() => {
                    const csv = 'name,brand,category,type,weight_oz,weight_unit,notes\nExample Tent,Brand Name,Shelter,,32,oz,\n'
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url; a.download = 'gear_template.csv'; a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="underline hover:text-foreground transition-colors"
                >
                  CSV template
                </button>
                {' '}to get started
              </p>
            </div>
          )}

          {/* Preview step */}
          {step === 'preview' && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground truncate">{fileName}</span>
                <button
                  onClick={() => { setStep('upload'); setParsedRows([]); setFileName('') }}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  Change file
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4 p-3 bg-secondary/30 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-foreground">{validRows.length} to import</span>
                </div>
                {skippedRows.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">{skippedRows.length} skipped</span>
                  </div>
                )}
              </div>

              {parsedRows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No rows found in file</p>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  {parsedRows.map((row, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 border-b border-border last:border-0',
                        !row.valid && 'opacity-50'
                      )}
                    >
                      {row.valid
                        ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        : <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{row.name || '(no name)'}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.error ?? [row.brand, row.category].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {row.weight_oz > 0 ? `${row.weight_oz} ${row.weight_unit}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="px-6 py-4 border-t border-border bg-secondary/20 shrink-0 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
            >
              {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              Import {validRows.length} item{validRows.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
