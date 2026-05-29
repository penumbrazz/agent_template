import { apiClient } from '@/apis/client'
import type { Setting } from '@/types/setting'

export const settingsApi = {
  list: () => apiClient.get<Setting[]>('/api/settings'),

  update: (key: string, value: string) =>
    apiClient.put<Setting>(`/api/settings/${key}`, { value }),
}
