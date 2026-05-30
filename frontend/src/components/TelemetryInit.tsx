'use client'

import { useEffect, useRef } from 'react'

import { getRuntimeConfigSync } from '@/lib/runtime-config'

export default function TelemetryInit(): null {
  const initRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (initRef.current) return
    initRef.current = true

    const runtimeConfig = getRuntimeConfigSync()
    if (!runtimeConfig.otelEnabled) return

    import('@/lib/telemetry')
      .then((module) => {
        return module.initFrontendTracer()
      })
      .catch((error) => {
        console.error('[TelemetryInit] Failed to initialize telemetry:', error)
      })
  }, [])

  return null
}
