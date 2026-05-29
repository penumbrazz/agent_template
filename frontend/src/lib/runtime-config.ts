export interface RuntimeConfig {
  apiUrl: string
  otelEnabled: boolean
  otelServiceName: string
  otelCollectorEndpoint: string
  appVersion: string
}

const defaultConfig: RuntimeConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  otelEnabled: process.env.NEXT_PUBLIC_OTEL_ENABLED === 'true',
  otelServiceName:
    process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME || 'agent-template-frontend',
  otelCollectorEndpoint:
    process.env.NEXT_PUBLIC_OTEL_COLLECTOR_ENDPOINT || 'http://localhost:4318',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
}

export function getRuntimeConfigSync(): RuntimeConfig {
  return defaultConfig
}

export function getApiBaseUrl(): string {
  return getRuntimeConfigSync().apiUrl
}
