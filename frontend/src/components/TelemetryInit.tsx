'use client'

import { useEffect } from 'react'

import { getRuntimeConfigSync } from '@/lib/runtime-config'

export default function TelemetryInit() {
  useEffect(() => {
    const config = getRuntimeConfigSync()
    if (config.otelEnabled) {
      // OTel initialization will be added in Task 6
      console.debug('[TelemetryInit] OTel enabled but not yet initialized')
    }
  }, [])

  return null
}
