import {
  DEFAULT_SELECTION_CONTEXT_POLICY,
  normalizeSelectionContextPolicy,
} from '../policy'

describe('normalizeSelectionContextPolicy', () => {
  it('returns semantic defaults for missing input', () => {
    expect(normalizeSelectionContextPolicy(undefined)).toEqual(
      DEFAULT_SELECTION_CONTEXT_POLICY,
    )
  })

  it('accepts a valid hybrid policy', () => {
    expect(
      normalizeSelectionContextPolicy({
        mode: 'hybrid',
        screenshotPolicy: 'on_extractor_miss',
        screenshotDelivery: 'reference_only',
      }),
    ).toEqual({
      mode: 'hybrid',
      screenshotPolicy: 'on_extractor_miss',
      screenshotDelivery: 'reference_only',
    })
  })

  it('rejects invalid inline screenshot settings by falling back to defaults', () => {
    expect(
      normalizeSelectionContextPolicy({
        mode: 'semantic',
        screenshotPolicy: 'always',
        screenshotDelivery: 'inline_image',
      }),
    ).toEqual(DEFAULT_SELECTION_CONTEXT_POLICY)
  })
})
