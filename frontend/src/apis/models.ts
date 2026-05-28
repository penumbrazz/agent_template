import { apiClient } from '@/apis/client'
import type { LLMModel, ModelCreate, ModelUpdate } from '@/types/model'

export const modelsApi = {
  listEnabled: () => apiClient.get<LLMModel[]>('/models'),

  listAll: () => apiClient.get<LLMModel[]>('/models/all'),

  create: (data: ModelCreate) =>
    apiClient.post<LLMModel>('/models', data),

  update: (id: string, data: ModelUpdate) =>
    apiClient.put<LLMModel>(`/models/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/models/${id}`),

  toggle: (id: string) =>
    apiClient.patch<{ id: string; is_enabled: boolean }>(`/models/${id}/toggle`),
}
