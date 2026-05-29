# i18n Contribution Instructions

- `locales/en.ts` is the complete baseline messages file.
- Non-English locale files may be partial. Missing keys must fall back to English at runtime.
- Use BCP 47 locale tags for new languages, for example `zh-CN`, `ja-JP`, and `ko-KR`.
- Do not change fallback logic to hide missing translations.
- Preserve interpolation variables exactly, for example `{latencyMs}`, `{name}`, `{error}`.
- Keep product and technical names unchanged unless there is an established localized name, for example `Provider`, `Model`, `API Key`.
- Keep translation changes small and reviewable. Prefer separate commits for runtime changes, UI migration, and locale text.
- When adding user-facing UI text, add the English message key first and add non-English overrides only when the translation is clear.
- Run `npx tsx src/i18n/check-parity.ts` before committing locale changes.
