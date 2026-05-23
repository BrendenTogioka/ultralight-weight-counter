'use client'

import { motion } from 'framer-motion'
import { backdropVariants, modalCardVariants } from '@/lib/motion'

interface Props {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        variants={backdropVariants}
        initial="initial"
        animate="animate"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        variants={modalCardVariants}
        initial="initial"
        animate="animate"
        className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
      >
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={
              variant === 'destructive'
                ? 'px-4 py-2 text-sm rounded-lg font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors'
                : 'px-4 py-2 text-sm rounded-lg font-medium btn-primary transition-colors'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
