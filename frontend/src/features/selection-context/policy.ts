import type { SelectionContextPolicy } from './types'

export const DEFAULT_SELECTION_CONTEXT_POLICY: SelectionContextPolicy = {
  mode: 'hybrid',
  screenshotPolicy: 'always',
  screenshotDelivery: 'reference_only',
}

const VALID_MODES = new Set(['semantic', 'screenshot', 'hybrid'])
const VALID_SCREENSHOT_POLICIES = new Set([
  'never',
  'on_extractor_miss',
  'always',
])
const VALID_SCREENSHOT_DELIVERIES = new Set(['reference_only', 'inline_image'])

export function normalizeSelectionContextPolicy(
  value: unknown,
): SelectionContextPolicy {
  if (!value || typeof value !== 'object') {
    return DEFAULT_SELECTION_CONTEXT_POLICY
  }

  const candidate = value as Partial<SelectionContextPolicy>
  const hasValidShape =
    VALID_MODES.has(String(candidate.mode)) &&
    VALID_SCREENSHOT_POLICIES.has(String(candidate.screenshotPolicy)) &&
    VALID_SCREENSHOT_DELIVERIES.has(String(candidate.screenshotDelivery))

  if (!hasValidShape) {
    return DEFAULT_SELECTION_CONTEXT_POLICY
  }

  if (
    candidate.mode === 'semantic' &&
    (candidate.screenshotPolicy !== 'never' ||
      candidate.screenshotDelivery !== 'reference_only')
  ) {
    return DEFAULT_SELECTION_CONTEXT_POLICY
  }

  return {
    mode: candidate.mode,
    screenshotPolicy: candidate.screenshotPolicy,
    screenshotDelivery: candidate.screenshotDelivery,
  }
}
