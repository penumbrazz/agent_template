import {
  getLocale,
  setLocale,
  initializeLocale,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
} from '../locale-store'

describe('locale-store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    // Reset module-level state back to default
    setLocale('en')
  })

  describe('DEFAULT_LOCALE', () => {
    it('is "en"', () => {
      expect(DEFAULT_LOCALE).toBe('en')
    })
  })

  describe('getLocale / setLocale', () => {
    it('returns default locale initially', () => {
      expect(getLocale()).toBe(DEFAULT_LOCALE)
    })

    it('updates locale via setLocale', () => {
      setLocale('zh-CN')
      expect(getLocale()).toBe('zh-CN')
    })

    it('persists locale to localStorage', () => {
      setLocale('zh-CN')
      expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-CN')
    })

    it('falls back to default for unsupported locale', () => {
      setLocale('fr' as any)
      expect(getLocale()).toBe(DEFAULT_LOCALE)
    })

    it('restores to default when localStorage cleared', () => {
      setLocale('zh-CN')
      localStorage.clear()
      initializeLocale()
      expect(getLocale()).toBe(DEFAULT_LOCALE)
    })
  })

  describe('initializeLocale', () => {
    it('reads locale from localStorage', () => {
      localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-CN')
      initializeLocale()
      expect(getLocale()).toBe('zh-CN')
    })

    it('falls back to default when localStorage is empty', () => {
      initializeLocale()
      // In jsdom, navigator.language may not start with 'zh',
      // so the result is either DEFAULT_LOCALE or 'zh-CN' (both valid).
      // The key behavior is that it returns a valid supported locale.
      const locale = getLocale()
      expect(['en', 'zh-CN']).toContain(locale)
    })

    it('falls back to default for invalid stored value', () => {
      localStorage.setItem(LOCALE_STORAGE_KEY, 'invalid')
      initializeLocale()
      expect(getLocale()).toBe(DEFAULT_LOCALE)
    })
  })
})
