import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
      'jest.config.js',
      'next.config.js',
      'tailwind.config.js',
    ],
  },
  {
    rules: {
      // Warn on leaked `any` — start as warning to avoid breaking the build;
      // promote to error once the backlog is cleared.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Guardrail: keep DESIGN.md color tokens the single source of truth.
      // Matches className string literals that smuggle in raw palette colors
      // or hardcoded hex. TemplateLiteral / cn() argument cases are tracked
      // separately and need a dedicated AST walker; this covers the most
      // common inline-string case.
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/text-white|bg-green-|bg-amber-|text-\\[#|bg-\\[#/]",
          message:
            'Avoid hardcoded colors in className. Use DESIGN.md tokens (e.g. text-on-primary, bg-success/10, bg-primary/10) instead of palette classes or hex literals.',
        },
      ],
    },
  },
]

export default eslintConfig
