import { useCallback } from 'react'
import { useLocale } from './locale-store'
import { translate } from './messages'
import type { InterpolationValues } from './types'
import type { TranslationKey } from './messages'

export {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  getLocale,
  initializeLocale,
  setLocale,
  subscribeLocale,
  useLocale,
} from './locale-store'
export {
  LOCALES,
  isSupportedLocale,
  messages,
  translate,
} from './messages'
export type { Locale, TranslationKey } from './messages'
export type {
  DeepPartialMessageTree,
  InterpolationValues,
  MessageKey,
  MessageTree,
} from './types'

export function useT(): (
  key: TranslationKey,
  values?: InterpolationValues,
) => string {
  const locale = useLocale()

  return useCallback(
    (key: TranslationKey, values?: InterpolationValues) =>
      translate(key, values, locale),
    [locale],
  )
}
