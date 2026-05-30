'use client'

import { useCallback, useMemo } from 'react'

import { traceLocalAction, traceLocalActionSync } from '@/lib/telemetry'
import { Attributes, AttributeValue } from '@opentelemetry/api'

type TraceContext = Record<string, AttributeValue | undefined>

export function useTraceAction() {
  const buildContextAttributes = useCallback((): TraceContext => {
    return {}
  }, [])

  const traceEvent = useCallback(
    (name: string, attributes?: Attributes): void => {
      const contextAttrs = buildContextAttributes()
      traceLocalActionSync(name, { ...contextAttrs, ...attributes }, () => {})
    },
    [buildContextAttributes],
  )

  const traceAction = useCallback(
    async <T>(
      name: string,
      attributes: Attributes,
      fn: () => T | Promise<T>,
    ): Promise<T> => {
      const contextAttrs = buildContextAttributes()
      return traceLocalAction(name, { ...contextAttrs, ...attributes }, fn)
    },
    [buildContextAttributes],
  )

  const traceActionSync = useCallback(
    <T>(name: string, attributes: Attributes, fn: () => T): T => {
      const contextAttrs = buildContextAttributes()
      return traceLocalActionSync(name, { ...contextAttrs, ...attributes }, fn)
    },
    [buildContextAttributes],
  )

  const trace = useMemo(
    () => ({
      event: traceEvent,
      action: traceAction,
      actionSync: traceActionSync,
    }),
    [traceEvent, traceAction, traceActionSync],
  )

  return {
    trace,
    traceAction,
    traceActionSync,
    traceEvent,
    buildContextAttributes,
  }
}

export default useTraceAction
