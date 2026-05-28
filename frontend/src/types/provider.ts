export type ProviderType = 'openai_compatible' | 'anthropic_compatible'

export interface Provider {
  id: string
  name: string
  type: ProviderType
  base_url: string
  api_key_masked: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProviderCreate {
  name: string
  type: ProviderType
  base_url: string
  api_key: string
}

export interface ProviderUpdate {
  name?: string
  type?: ProviderType
  base_url?: string
  api_key?: string
}
