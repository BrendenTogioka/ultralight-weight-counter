'use client'

import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { formatWeightDisplay } from '@/lib/calculations'
import type { WeightUnit } from '@/types'

interface Props {
  oz: number
  unit: WeightUnit
  decimals?: number
  className?: string
  secondaryClassName?: string
}

/**
 * Big weight figure that smoothly counts up/down when the value changes
 * (e.g. when gear is added, removed, or toggled). Respects reduced-motion.
 *
 * The primary/secondary strings are derived from `formatWeightDisplay`, so the
 * unit suffix (lb / oz / g) stays correct mid-animation.
 */
export function AnimatedWeight({ oz, unit, decimals = 2, className, secondaryClassName }: Props) {
  const reduce = useReducedMotion()

  const mv = useMotionValue(oz)
  const spring = useSpring(mv, { stiffness: 140, damping: 22, mass: 0.5 })
  // When the user prefers reduced motion, read the raw value (snaps instantly).
  const source = reduce ? mv : spring

  useEffect(() => {
    mv.set(oz)
  }, [oz, mv])

  const primary = useTransform(source, v => formatWeightDisplay(v, unit, decimals).primary)
  const secondary = useTransform(source, v => formatWeightDisplay(v, unit, decimals).secondary ?? '')

  // Whether the *target* value has a secondary line — keeps the slot stable so
  // layout doesn't jump as the animated value crosses the 16 oz boundary.
  const hasSecondary = formatWeightDisplay(oz, unit, decimals).secondary !== null

  return (
    <>
      <motion.p className={className}>{primary}</motion.p>
      {hasSecondary && <motion.p className={secondaryClassName}>{secondary}</motion.p>}
    </>
  )
}
