// frontend/src/lib/theme-colors.ts
//
// Centralized access to DESIGN.md color tokens for non-Tailwind contexts
// (e.g. ECharts series, canvas fills, inline styles). Tailwind className
// consumers should keep using token classes (`bg-primary`, `text-on-dark`).
//
// Colors live as CSS custom properties in `src/app/globals.css` in the
// `R G B` triplet form (e.g. `--color-primary: 204 120 92`). We resolve them
// at runtime so charts stay in sync when the palette changes.

/** CSS variable names backing the DESIGN.md palette. */
export const THEME_COLOR_VARS = {
  primary: '--color-primary',
  primaryActive: '--color-primary-active',
  primaryDisabled: '--color-primary-disabled',
  accentTeal: '--color-accent-teal',
  accentAmber: '--color-accent-amber',
  success: '--color-success',
  warning: '--color-warning',
  error: '--color-error',
  surfaceDark: '--color-surface-dark',
  onDark: '--color-on-dark',
  onPrimary: '--color-on-primary',
} as const

export type ThemeColorName = keyof typeof THEME_COLOR_VARS

/**
 * Read a DESIGN.md color token as an `rgb()` / `rgba()` string suitable for
 * passing to chart libraries. Falls back to the provided default when the CSS
 * variable is unavailable (e.g. during server rendering or unit tests).
 */
export function themeColor(
  name: ThemeColorName,
  fallback: string,
  alpha?: number,
): string {
  const varName = THEME_COLOR_VARS[name]
  const raw = readCssVar(varName)

  if (!raw) return applyAlpha(fallback, alpha)

  const triplet = parseRgbTriplet(raw)
  if (!triplet) return applyAlpha(fallback, alpha)

  return `rgb(${triplet.r} ${triplet.g} ${triplet.b}${
    alpha !== undefined && alpha !== 1 ? ` / ${alpha}` : ''
  })`
}

/** Resolve multiple tokens at once into a stable record. */
export function resolveThemeColors(
  names: readonly ThemeColorName[],
  fallbacks: Record<ThemeColorName, string>,
): Record<ThemeColorName, string> {
  const out = {} as Record<ThemeColorName, string>
  for (const name of names) {
    out[name] = themeColor(name, fallbacks[name])
  }
  return out
}

function readCssVar(name: string): string | undefined {
  if (typeof window === 'undefined') return undefined
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value || undefined
}

function parseRgbTriplet(
  raw: string,
): { r: number; g: number; b: number } | undefined {
  // Accept both "204 120 92" (our internal form) and "#cc785c".
  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw)
  if (hexMatch) return parseHex(raw)

  const parts = raw.split(/[\s,]+/).filter(Boolean)
  if (parts.length >= 3) {
    const r = Number(parts[0])
    const g = Number(parts[1])
    const b = Number(parts[2])
    if ([r, g, b].every((n) => Number.isFinite(n))) return { r, g, b }
  }
  return undefined
}

function parseHex(
  hex: string,
): { r: number; g: number; b: number } | undefined {
  const value = hex.slice(1)
  if (value.length === 3) {
    return {
      r: parseInt(value[0] + value[0], 16),
      g: parseInt(value[1] + value[1], 16),
      b: parseInt(value[2] + value[2], 16),
    }
  }
  if (value.length === 6) {
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    }
  }
  return undefined
}

function applyAlpha(color: string, alpha: number | undefined): string {
  if (alpha === undefined || alpha === 1) return color
  // Only patch simple hex fallbacks; rgb() fallbacks pass through unchanged.
  const hex = /^#([0-9a-f]{6})$/i.exec(color)
  if (hex) {
    const { r, g, b } = parseHex(color)!
    return `rgb(${r} ${g} ${b} / ${alpha})`
  }
  return color
}
