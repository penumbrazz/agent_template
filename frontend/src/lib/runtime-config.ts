import {
  DEFAULT_SELECTION_CONTEXT_POLICY,
  normalizeSelectionContextPolicy,
} from '@/features/selection-context/policy'
import type { SelectionContextPolicy } from '@/features/selection-context/types'

export interface RuntimeConfig {
  apiUrl: string
  otelEnabled: boolean
  otelServiceName: string
  otelCollectorEndpoint: string
  appVersion: string
  selectionContextPolicy: SelectionContextPolicy
}

const defaultConfig: RuntimeConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  otelEnabled: process.env.NEXT_PUBLIC_OTEL_ENABLED === 'true',
  otelServiceName:
    process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME || 'agent-template-frontend',
  otelCollectorEndpoint:
    process.env.NEXT_PUBLIC_OTEL_COLLECTOR_ENDPOINT || 'http://localhost:4318',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
  selectionContextPolicy: parseSelectionPolicyFromEnv(),
}

function parseSelectionPolicyFromEnv(): SelectionContextPolicy {
  const raw = process.env.NEXT_PUBLIC_SELECTION_CONTEXT_POLICY
  if (!raw) {
    return DEFAULT_SELECTION_CONTEXT_POLICY
  }

  try {
    return normalizeSelectionContextPolicy(JSON.parse(raw))
  } catch {
    return DEFAULT_SELECTION_CONTEXT_POLICY
  }
}

export function getRuntimeConfigSync(): RuntimeConfig {
  return defaultConfig
}

export function getApiBaseUrl(): string {
  return getRuntimeConfigSync().apiUrl
}
