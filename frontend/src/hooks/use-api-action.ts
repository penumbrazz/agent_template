'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { translate } from '@/i18n'

type TranslationKey = Parameters<typeof translate>[0]

interface UseApiActionOptions {
  /** Toast message key shown on success */
  successMessage?: TranslationKey
  /** Toast message key shown on error (falls back to error.message) */
  errorMessage?: TranslationKey
  /** Called after a successful execution */
  onSuccess?: () => void
}

/**
 * Encapsulates the repeated try/catch + toast.success + toast.error pattern.
 * Returns an `execute` function that wraps an async API call with error handling.
 */
export function useApiAction(options: UseApiActionOptions = {}) {
  const { successMessage, errorMessage, onSuccess } = options

  const execute = useCallback(
    async <T>(
      action: () => Promise<T>,
      overrides?: Partial<UseApiActionOptions>,
    ): Promise<T | undefined> => {
      const merged = { successMessage, errorMessage, onSuccess, ...overrides }
      try {
        const result = await action()
        if (merged.successMessage) {
          toast.success(translate(merged.successMessage))
        }
        merged.onSuccess?.()
        return result
      } catch (e) {
        const fallback = merged.errorMessage
          ? translate(merged.errorMessage)
          : undefined
        const message =
          e instanceof Error ? e.message : (fallback ?? 'Unknown error')
        toast.error(message)
        return undefined
      }
    },
    [successMessage, errorMessage, onSuccess],
  )

  return { execute }
}
