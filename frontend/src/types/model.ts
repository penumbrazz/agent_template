export interface LLMModel {
  id: string
  provider_id: string
  model_id: string
  display_name: string | null
  is_enabled: boolean
  extra_config: Record<string, unknown> | null
  provider_name: string | null
  created_at: string
  updated_at: string
}

export interface ModelCreate {
  provider_id: string
  model_id: string
  display_name?: string
  extra_config?: Record<string, unknown>
}

export interface ModelUpdate {
  model_id?: string
  display_name?: string
  extra_config?: Record<string, unknown>
}
