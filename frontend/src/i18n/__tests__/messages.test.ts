import { translate, LOCALES } from '../messages'

// Mock locale-store before messages imports it
jest.mock('../locale-store', () => ({
  getLocale: () => 'en',
}))

// Mock locale files for isolated testing
jest.mock('../locales/en', () => ({
  en: {
    common: {
      cancel: 'Cancel',
      save: 'Save',
    },
    greeting: {
      hello: 'Hello, {name}!',
      nested: {
        deep: 'Deep value',
      },
    },
  },
}))

jest.mock('../locales/zh-CN', () => ({
  zhCN: {
    common: {
      cancel: '取消',
    },
    greeting: {
      hello: '你好，{name}！',
    },
  },
}))

describe('translate', () => {
  it('returns English translation for existing key', () => {
    expect(translate('common.cancel', undefined, 'en')).toBe('Cancel')
  })

  it('returns Chinese translation for existing key', () => {
    expect(translate('common.cancel', undefined, 'zh-CN')).toBe('取消')
  })

  it('falls back to English when key missing in current locale', () => {
    expect(translate('common.save', undefined, 'zh-CN')).toBe('Save')
  })

  it('interpolates values into template', () => {
    expect(translate('greeting.hello', { name: 'World' }, 'en')).toBe(
      'Hello, World!',
    )
  })

  it('interpolates Chinese values', () => {
    expect(translate('greeting.hello', { name: '世界' }, 'zh-CN')).toBe(
      '你好，世界！',
    )
  })

  it('returns key when missing in both locales', () => {
    expect(translate('common.nonexistent', undefined, 'en')).toBe(
      'common.nonexistent',
    )
  })

  it('handles nested keys', () => {
    expect(translate('greeting.nested.deep', undefined, 'en')).toBe(
      'Deep value',
    )
  })

  it('leaves unmatched placeholders unchanged', () => {
    expect(translate('greeting.hello', {}, 'en')).toBe('Hello, {name}!')
  })

  it('handles null and undefined interpolation values', () => {
    expect(translate('greeting.hello', { name: null }, 'en')).toBe(
      'Hello, !',
    )
    expect(translate('greeting.hello', { name: undefined }, 'en')).toBe(
      'Hello, !',
    )
  })
})

describe('LOCALES', () => {
  it('has en and zh-CN', () => {
    expect(LOCALES.en).toBeDefined()
    expect(LOCALES['zh-CN']).toBeDefined()
  })

  it('each locale has label and nativeLabel', () => {
    for (const locale of Object.values(LOCALES)) {
      expect(locale.label).toBeTruthy()
      expect(locale.nativeLabel).toBeTruthy()
    }
  })
})
