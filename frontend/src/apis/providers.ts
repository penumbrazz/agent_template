import { apiClient } from '@/apis/client'
import type { Provider, ProviderCreate, ProviderUpdate, ValidateResult } from '@/types/provider'

export const providersApi = {
  list: () => apiClient.get<Provider[]>('/providers'),

  create: (data: ProviderCreate) =>
    apiClient.post<Provider>('/providers', data),

  update: (id: string, data: ProviderUpdate) =>
    apiClient.put<Provider>(`/providers/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/providers/${id}`),

  fetchModels: (id: string) =>
    apiClient.post<{ fetched: number; models: { id: string; model_id: string }[] }>(
      `/providers/${id}/fetch-models`,
    ),

  test: (id: string, modelId?: string) =>
    apiClient.post<{ success: boolean; latency_ms: number; error: string | null }>(
      `/providers/${id}/test`,
      modelId ? { model_id: modelId } : undefined,
    ),

  validate: (data: { base_url: string; api_key: string; provider_type: string }) =>
    apiClient.post<ValidateResult>('/providers/validate', data),
}
