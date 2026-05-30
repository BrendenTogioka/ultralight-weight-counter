'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Table, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Trip, TripItem, WeightUnit } from '@/types'
import {
  calculateWeightSummary,
  calculateCategoryWeights,
  formatWeight,
  formatPounds,
  formatGrams,
  getEffectiveWeightOz,
} from '@/lib/calculations'
import { CATEGORY_ICONS } from '@/lib/utils'

interface Props {
  trip: Trip
  defaultUnit: WeightUnit
}

export function ExportClient({ trip, defaultUnit }: Props) {
  const [unit, setUnit] = useState<WeightUnit>(defaultUnit)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)

  const items = (trip.trip_items ?? []) as TripItem[]
  const includedItems = items.filter(i => i.included)
  const summary = calculateWeightSummary(items)
  const categoryWeights = calculateCategoryWeights(items)

  async function exportPdf() {
    setExportingPdf(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 20

      // Header
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text(trip.name, margin, 28)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 120, 120)
      if (trip.description) doc.text(trip.description, margin, 36)
      if (trip.trip_date) {
        doc.text(
          `Trip date: ${new Date(trip.trip_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          margin,
          trip.description ? 43 : 36
        )
      }

      // Summary box — pounds + grams for easy mental math
      let y = trip.description || trip.trip_date ? 54 : 42

      doc.setFillColor(245, 247, 250)
      doc.roundedRect(margin, y, pageW - margin * 2, 32, 3, 3, 'F')

      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'normal')
      const cols = pageW / 4
      doc.text('BASE WEIGHT', margin + 6, y + 8)
      doc.text('WORN WEIGHT', margin + cols + 6, y + 8)
      doc.text('CONSUMABLES', margin + cols * 2 + 6, y + 8)
      doc.text('TOTAL PACK', margin + cols * 3 + 6, y + 8)

      const summaryCells = [
        summary.base_oz,
        summary.worn_oz,
        summary.consumable_oz,
        summary.total_oz,
      ]
      summaryCells.forEach((oz, i) => {
        const x = margin + cols * i + 6
        doc.setFontSize(13)
        doc.setTextColor(20, 20, 20)
        doc.setFont('helvetica', 'bold')
        doc.text(formatPounds(oz), x, y + 18)
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        doc.setFont('helvetica', 'normal')
        doc.text(formatGrams(oz), x, y + 26)
      })

      y += 42

      // Per category tables
      for (const { category, weight_oz, items: catItems } of categoryWeights) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 30, 30)
        doc.text(`${category}`, margin, y + 4)

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(120, 120, 120)
        doc.text(formatWeight(weight_oz, unit, 1), pageW - margin, y + 4, { align: 'right' })

        const rows = catItems.map(item => {
          const gear = item.gear_item!
          const oz = getEffectiveWeightOz(item)
          const totalOz = oz * item.quantity
          return [
            gear.name,
            gear.brand ?? '',
            item.wear_type.charAt(0).toUpperCase() + item.wear_type.slice(1),
            item.quantity.toString(),
            formatWeight(oz, unit, 1),
            formatWeight(totalOz, unit, 1),
            item.included ? '✓' : '–',
          ]
        })

        autoTable(doc, {
          startY: y + 8,
          head: [['Item', 'Brand', 'Type', 'Qty', `Unit (${unit})`, `Total (${unit})`, 'Inc']],
          body: rows,
          margin: { left: margin, right: margin },
          theme: 'grid',
          headStyles: {
            fillColor: [230, 235, 245],
            textColor: [80, 80, 80],
            fontSize: 8,
            fontStyle: 'bold',
          },
          bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
          alternateRowStyles: { fillColor: [250, 251, 253] },
          columnStyles: {
            0: { cellWidth: 'auto' },
            2: { cellWidth: 22 },
            3: { cellWidth: 12, halign: 'center' },
            4: { cellWidth: 20, halign: 'right' },
            5: { cellWidth: 20, halign: 'right' },
            6: { cellWidth: 10, halign: 'center' },
          },
        })

        y = (doc as any).lastAutoTable.finalY + 10

        if (y > 260) {
          doc.addPage()
          y = 20
        }
      }

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

      doc.save(`${trip.name.replace(/\s+/g, '-').toLowerCase()}-gear-list.pdf`)
    } catch (err) {
      console.error(err)
      toast.error('PDF export failed. Please try again.')
    } finally {
      setExportingPdf(false)
    }
  }

  async function exportCsv() {
    setExportingCsv(true)
    try {
      const { default: Papa } = await import('papaparse')

      const rows = items.map(item => {
        const gear = item.gear_item!
        const oz = getEffectiveWeightOz(item)
        return {
          Name: gear.name,
          Brand: gear.brand ?? '',
          Category: gear.category,
          Type: gear.type ?? '',
          'Wear Type': item.wear_type,
          Quantity: item.quantity,
          [`Unit Weight (${unit})`]: formatWeight(oz, unit, 2),
          [`Total Weight (${unit})`]: formatWeight(oz * item.quantity, unit, 2),
          Included: item.included ? 'Yes' : 'No',
          Notes: item.notes ?? '',
          'Image URL': gear.image_url ?? '',
        }
      })

      // Summary block (pounds + grams) prepended above the item list
      const summaryCsv = Papa.unparse({
        fields: ['Summary', 'Pounds', 'Grams'],
        data: [
          ['Base weight', formatPounds(summary.base_oz), formatGrams(summary.base_oz)],
          ['Worn', formatPounds(summary.worn_oz), formatGrams(summary.worn_oz)],
          ['Consumables', formatPounds(summary.consumable_oz), formatGrams(summary.consumable_oz)],
          ['Total pack', formatPounds(summary.total_oz), formatGrams(summary.total_oz)],
        ],
      })

      const csv = `${summaryCsv}\r\n\r\n${Papa.unparse(rows)}`
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${trip.name.replace(/\s+/g, '-').toLowerCase()}-gear-list.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      toast.error('CSV export failed. Please try again.')
    } finally {
      setExportingCsv(false)
    }
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-3xl mx-auto">
      {/* Back */}
      <Link
        href={`/trips/${trip.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Trip
      </Link>

      <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-1">Export</h1>
      <p className="text-sm text-muted-foreground mb-8">{trip.name}</p>

      {/* Unit toggle */}
      <div className="flex items-center gap-3 mb-8">
        <span className="text-sm font-medium text-foreground">Display unit:</span>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['oz', 'g'] as WeightUnit[]).map(u => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`px-4 py-1.5 text-sm transition-colors ${
                unit === u
                  ? 'btn-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Export options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <ExportCard
          icon={FileText}
          title="PDF Report"
          description="Formatted gear list grouped by category with weight totals. Great for printing or sharing."
          extension=".pdf"
          loading={exportingPdf}
          onClick={exportPdf}
        />
        <ExportCard
          icon={Table}
          title="CSV Spreadsheet"
          description="Flat file with all gear details and weights. Import into Excel, Google Sheets, or any spreadsheet."
          extension=".csv"
          loading={exportingCsv}
          onClick={exportCsv}
        />
      </div>

      {/* Preview table */}
      <h2 className="text-sm font-medium text-foreground mb-4">Preview</h2>
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Summary — always shown in pounds + grams for easy mental math */}
        <div className="grid grid-cols-4 gap-4 px-5 py-4 bg-secondary/30 border-b border-border">
          {[
            { label: 'Base', oz: summary.base_oz },
            { label: 'Worn', oz: summary.worn_oz },
            { label: 'Consumables', oz: summary.consumable_oz },
            { label: 'Total Pack', oz: summary.total_oz },
          ].map(({ label, oz }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
              <p className="text-sm font-semibold tabular-nums">{formatPounds(oz)}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{formatGrams(oz)}</p>
            </div>
          ))}
        </div>

        {/* Items */}
        <div className="divide-y divide-border">
          {categoryWeights.map(({ category, items: catItems }) => (
            <div key={category}>
              <div className="px-5 py-2 bg-secondary/10">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {CATEGORY_ICONS[category]} {category}
                </span>
              </div>
              {catItems.map(item => {
                const gear = item.gear_item!
                const oz = getEffectiveWeightOz(item)
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 px-5 py-2.5 ${!item.included ? 'opacity-50' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground">{gear.name}</span>
                      {gear.brand && (
                        <span className="text-xs text-muted-foreground ml-2">{gear.brand}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{item.wear_type}</span>
                    <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                    <span className="text-sm font-medium tabular-nums w-20 text-right">
                      {formatWeight(oz * item.quantity, unit, 1)}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ExportCard({
  icon: Icon,
  title,
  description,
  extension,
  loading,
  onClick,
}: {
  icon: React.ElementType
  title: string
  description: string
  extension: string
  loading: boolean
  onClick: () => void
}) {
  return (
    <div className="border border-border rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <button
        onClick={onClick}
        disabled={loading}
        className="mt-auto w-full inline-flex items-center justify-center gap-2 btn-primary px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Download {extension}
      </button>
    </div>
  )
}
