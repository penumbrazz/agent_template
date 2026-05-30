---
name: project-conventions
description: Code style and patterns for this project. Apply when writing or reviewing code.
user-invocable: false
---

## Naming Conventions

- React components: PascalCase
- Component files: kebab-case (e.g., `chat-panel.tsx`)
- Python functions/variables: snake_case
- Python classes: PascalCase
- Constants: UPPER_SNAKE_CASE
- CSS classes: Tailwind utility classes

## TypeScript/React Patterns

- Functional components only, no class components
- `const` preferred over `let`, never `var`
- Single quotes, no semicolons (Prettier enforced)
- Types in `src/types/`
- Components in `src/components/` (ui/, common/, feature-specific)
- Custom hooks in `src/hooks/`
- `data-testid` required on all interactive elements (buttons, inputs, links, selects)

## Python Patterns

- Black formatting (line-length: 88), isort
- Type hints required on all public functions
- Docstrings on public functions/classes
- Use `async/await` for async operations
- OpenTelemetry tracing: `@trace_async` / `@trace_sync` decorators from `shared/telemetry/decorators.py`

## Design System (DESIGN.md)

- Three-surface mode: Canvas (#faf9f5), Surface Card (#efe9de), Surface Dark (#181715)
- Brand color: Coral (#cc785c) — no blue/cyan as brand
- Headings: Serif font, weight 400, negative letter-spacing
- Body: Sans-serif (Inter/StyreneB)
- Code: JetBrains Mono
- Mobile-first responsive design with breakpoints at 768px and 1024px

## E2E Test Rules

- Never use `test.skip()` or silent failures
- Never mock backend API in E2E tests — use real HTTP requests
- If a test fails, fix the underlying issue

## Forbidden

- No `any` types in TypeScript
- No `console.log` in production code
- No hardcoded colors outside DESIGN.md tokens
- No cold gray or pure white as canvas background
- No blue/cyan as brand color
- No bold headings (display weight must be 400)
