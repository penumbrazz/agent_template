import { useSyncExternalStore } from 'react'
import { isSupportedLocale, type Locale } from './messages'

export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_STORAGE_KEY = 'locale'

const subscribers = new Set<() => void>()

let currentLocale: Locale = DEFAULT_LOCALE
let isStorageListenerActive = false

function normalizeLocale(value: unknown): Locale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE
}

function readStoredLocale(): Locale {
  try {
    const stored =
      globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY) ?? null
    return normalizeLocale(stored)
  } catch {
    return DEFAULT_LOCALE
  }
}

function writeStoredLocale(locale: Locale): void {
  try {
    globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // localStorage may be disabled; failure only affects persistence
  }
}

function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE
  const lang = navigator.language
  if (lang.startsWith('zh')) return 'zh-CN'
  return DEFAULT_LOCALE
}

function syncDocumentLang(locale: Locale): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
}

function notifySubscribers(): void {
  for (const subscriber of subscribers) subscriber()
}

function updateCurrentLocale(locale: Locale): void {
  if (locale === currentLocale) return
  currentLocale = locale
  syncDocumentLang(locale)
  notifySubscribers()
}

function isLocaleStorageEvent(event: StorageEvent): boolean {
  if (event.key !== LOCALE_STORAGE_KEY && event.key !== null) return false
  if (!event.storageArea || typeof window === 'undefined') return true
  try {
    return event.storageArea === window.localStorage
  } catch {
    return false
  }
}

function handleStorageEvent(event: StorageEvent): void {
  if (!isLocaleStorageEvent(event)) return
  const nextLocale =
    event.key === null ? DEFAULT_LOCALE : normalizeLocale(event.newValue)
  updateCurrentLocale(nextLocale)
}

function startStorageListener(): void {
  if (isStorageListenerActive || typeof window === 'undefined') return
  window.addEventListener('storage', handleStorageEvent)
  isStorageListenerActive = true
}

function stopStorageListener(): void {
  if (!isStorageListenerActive || typeof window === 'undefined') return
  window.removeEventListener('storage', handleStorageEvent)
  isStorageListenerActive = false
}

function getLocaleSnapshot(): Locale {
  return currentLocale
}

function getServerLocaleSnapshot(): Locale {
  return DEFAULT_LOCALE
}

export function subscribeLocale(listener: () => void): () => void {
  const shouldStartStorageListener = subscribers.size === 0
  subscribers.add(listener)
  if (shouldStartStorageListener) startStorageListener()

  return () => {
    subscribers.delete(listener)
    if (subscribers.size === 0) stopStorageListener()
  }
}

export function initializeLocale(): Locale {
  const stored = readStoredLocale()
  if (stored !== DEFAULT_LOCALE) {
    currentLocale = stored
  } else {
    currentLocale = detectBrowserLocale()
  }
  syncDocumentLang(currentLocale)
  notifySubscribers()
  return currentLocale
}

export function getLocale(): Locale {
  return currentLocale
}

export function setLocale(locale: Locale): void {
  const requestedLocale = normalizeLocale(locale)
  writeStoredLocale(requestedLocale)

  currentLocale = requestedLocale
  syncDocumentLang(requestedLocale)
  notifySubscribers()
}

export function useLocale(): Locale {
  return useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getServerLocaleSnapshot,
  )
}
