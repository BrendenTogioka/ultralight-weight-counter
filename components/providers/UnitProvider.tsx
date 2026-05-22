'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { WeightUnit } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface UnitContextValue {
  unit: WeightUnit
  toggleUnit: () => void
  setUnit: (unit: WeightUnit) => void
}

const UnitContext = createContext<UnitContextValue>({
  unit: 'oz',
  toggleUnit: () => {},
  setUnit: () => {},
})

export function UnitProvider({
  children,
  defaultUnit,
}: {
  children: React.ReactNode
  defaultUnit: WeightUnit
}) {
  const [unit, setUnitState] = useState<WeightUnit>(defaultUnit)

  const setUnit = useCallback(async (newUnit: WeightUnit) => {
    setUnitState(newUnit)
    // Persist to DB
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('user_settings')
        .update({ default_unit: newUnit })
        .eq('user_id', user.id)
    }
  }, [])

  const toggleUnit = useCallback(() => {
    setUnit(unit === 'oz' ? 'g' : 'oz')
  }, [unit, setUnit])

  return (
    <UnitContext.Provider value={{ unit, toggleUnit, setUnit }}>
      {children}
    </UnitContext.Provider>
  )
}

export function useUnit() {
  return useContext(UnitContext)
}
