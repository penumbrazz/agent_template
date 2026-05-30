import tailwindcssAnimate from 'tailwindcss-animate'

const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* DESIGN.md project tokens */
        base: withOpacity('--color-bg-base'),
        surface: withOpacity('--color-bg-surface'),
        'text-primary': withOpacity('--color-text-primary'),
        'text-secondary': withOpacity('--color-text-secondary'),
        'text-muted': withOpacity('--color-text-muted'),
        primary: withOpacity('--color-primary'),
        'primary-active': withOpacity('--color-primary-active'),
        border: withOpacity('--color-border'),
        error: withOpacity('--color-error'),
        success: withOpacity('--color-success'),

        /* DESIGN.md extended tokens */
        'surface-soft': withOpacity('--color-surface-soft'),
        'surface-cream-strong': withOpacity('--color-surface-cream-strong'),
        'surface-dark': withOpacity('--color-surface-dark'),
        'surface-dark-elevated': withOpacity('--color-surface-dark-elevated'),
        'surface-dark-soft': withOpacity('--color-surface-dark-soft'),
        'text-body-strong': withOpacity('--color-text-body-strong'),
        'text-muted-soft': withOpacity('--color-text-muted-soft'),
        'on-dark': withOpacity('--color-on-dark'),
        'on-dark-soft': withOpacity('--color-on-dark-soft'),
        'primary-disabled': withOpacity('--color-primary-disabled'),
        'accent-teal': withOpacity('--color-accent-teal'),
        'accent-amber': withOpacity('--color-accent-amber'),
        warning: withOpacity('--color-warning'),
        'hairline-soft': withOpacity('--color-hairline-soft'),
        'on-primary': withOpacity('--color-on-primary'),

        /* shadcn/ui semantic mapping to DESIGN.md tokens */
        background: withOpacity('--color-bg-base'),
        foreground: withOpacity('--color-text-primary'),
        card: {
          DEFAULT: withOpacity('--color-bg-base'),
          foreground: withOpacity('--color-text-primary'),
        },
        muted: {
          DEFAULT: withOpacity('--color-bg-surface'),
          foreground: withOpacity('--color-text-muted'),
        },
        secondary: {
          DEFAULT: withOpacity('--color-bg-surface'),
          foreground: withOpacity('--color-text-secondary'),
        },
        accent: {
          DEFAULT: withOpacity('--color-bg-surface'),
          foreground: withOpacity('--color-text-primary'),
        },
        destructive: {
          DEFAULT: withOpacity('--color-error'),
          foreground: withOpacity('--color-on-primary'),
        },
        popover: {
          DEFAULT: withOpacity('--color-bg-base'),
          foreground: withOpacity('--color-text-primary'),
        },
        input: withOpacity('--color-border'),
        ring: withOpacity('--color-primary'),
      },
      fontFamily: {
        display: [
          'Cormorant Garamond',
          'Tiempos Headline',
          'Garamond',
          'Times New Roman',
          'serif',
        ],
        body: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-xl': [
          '64px',
          { lineHeight: '1.05', fontWeight: '400', letterSpacing: '-1.5px' },
        ],
        'display-lg': [
          '48px',
          { lineHeight: '1.1', fontWeight: '400', letterSpacing: '-1px' },
        ],
        'display-md': [
          '36px',
          { lineHeight: '1.15', fontWeight: '400', letterSpacing: '-0.5px' },
        ],
        'display-sm': [
          '28px',
          { lineHeight: '1.2', fontWeight: '400', letterSpacing: '-0.3px' },
        ],
        'title-lg': [
          '22px',
          { lineHeight: '1.3', fontWeight: '500', letterSpacing: '0' },
        ],
        'title-md': [
          '18px',
          { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0' },
        ],
        'title-sm': [
          '16px',
          { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0' },
        ],
        'body-md': [
          '16px',
          { lineHeight: '1.55', fontWeight: '400', letterSpacing: '0' },
        ],
        'body-sm': [
          '14px',
          { lineHeight: '1.55', fontWeight: '400', letterSpacing: '0' },
        ],
        caption: [
          '13px',
          { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0' },
        ],
        'caption-uppercase': [
          '12px',
          { lineHeight: '1.4', fontWeight: '500', letterSpacing: '1.5px' },
        ],
        code: [
          '14px',
          { lineHeight: '1.6', fontWeight: '400', letterSpacing: '0' },
        ],
        button: [
          '14px',
          { lineHeight: '1.0', fontWeight: '500', letterSpacing: '0' },
        ],
        'nav-link': [
          '14px',
          { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0' },
        ],
      },
      spacing: {
        xxs: '4px',
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
        section: '96px',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '9999px',
        full: '9999px',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
