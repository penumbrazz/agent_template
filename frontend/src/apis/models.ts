import { apiClient } from '@/apis/client'
import type { LLMModel, ModelCreate, ModelUpdate } from '@/types/model'

export const modelsApi = {
  listEnabled: () => apiClient.get<LLMModel[]>('/api/models'),

  listAll: () => apiClient.get<LLMModel[]>('/api/models/all'),

  create: (data: ModelCreate) => apiClient.post<LLMModel>('/api/models', data),

  update: (id: string, data: ModelUpdate) =>
    apiClient.put<LLMModel>(`/api/models/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/models/${id}`),

  toggle: (id: string) =>
    apiClient.patch<{ id: string; is_enabled: boolean }>(
      `/api/models/${id}/toggle`,
    ),
}
