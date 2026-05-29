'use client'

import { useEffect } from 'react'
import { initializeLocale } from '@/i18n'

export function LocaleInitializer() {
  useEffect(() => {
    initializeLocale()
  }, [])
  return null
}
