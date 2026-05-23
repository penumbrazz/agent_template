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

let cachedConfig: RuntimeConfig | null = null

export function getRuntimeConfigSync(): RuntimeConfig {
  if (cachedConfig) return cachedConfig
  return defaultConfig
}

export function getApiBaseUrl(): string {
  return getRuntimeConfigSync().apiUrl
}

export async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  if (cachedConfig) return cachedConfig
  cachedConfig = defaultConfig
  return cachedConfig
}
