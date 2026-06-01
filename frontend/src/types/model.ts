export type ModelType = 'llm' | 'vlm' | 'embedding' | 'rerank'

export interface LLMModel {
  id: string
  provider_id: string
  model_id: string
  display_name: string | null
  is_enabled: boolean
  extra_config: Record<string, unknown> | null
  model_type: ModelType
  context_length: number | null
  max_output_tokens: number | null
  provider_name: string | null
  created_at: string
  updated_at: string
}

export interface ModelCreate {
  provider_id: string
  model_id: string
  display_name?: string
  extra_config?: Record<string, unknown>
  model_type?: ModelType
  context_length?: number
  max_output_tokens?: number
}

export interface ModelUpdate {
  model_id?: string
  display_name?: string
  extra_config?: Record<string, unknown>
  model_type?: ModelType
  context_length?: number
  max_output_tokens?: number
}
