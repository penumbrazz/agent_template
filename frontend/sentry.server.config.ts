import * as Sentry from '@sentry/nextjs'

const sampleRate = parseFloat(
  process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '1.0',
)

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',
  tracesSampleRate: sampleRate,
  debug: false,
})
