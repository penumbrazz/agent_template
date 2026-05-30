import { apiClient } from '@/apis/client'
import type {
  Provider,
  ProviderCreate,
  ProviderUpdate,
  ValidateResult,
} from '@/types/provider'

export const providersApi = {
  list: () => apiClient.get<Provider[]>('/api/providers'),

  create: (data: ProviderCreate) =>
    apiClient.post<Provider>('/api/providers', data),

  update: (id: string, data: ProviderUpdate) =>
    apiClient.put<Provider>(`/api/providers/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/providers/${id}`),

  fetchModels: (id: string) =>
    apiClient.post<{
      fetched: number
      models: { id: string; model_id: string }[]
    }>(`/api/providers/${id}/fetch-models`),

  test: (id: string, modelId?: string) =>
    apiClient.post<{
      success: boolean
      latency_ms: number
      error: string | null
    }>(
      `/api/providers/${id}/test`,
      modelId ? { model_id: modelId } : undefined,
    ),

  validate: (data: {
    base_url: string
    api_key: string
    provider_type: string
  }) => apiClient.post<ValidateResult>('/api/providers/validate', data),
}
