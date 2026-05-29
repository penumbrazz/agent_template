import tailwindcssAnimate from 'tailwindcss-animate'

const withOpacity = variable => `rgb(var(${variable}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
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
          foreground: 'rgb(255 255 255)',
        },
        popover: {
          DEFAULT: withOpacity('--color-bg-base'),
          foreground: withOpacity('--color-text-primary'),
        },
        input: withOpacity('--color-border'),
        ring: withOpacity('--color-primary'),
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
