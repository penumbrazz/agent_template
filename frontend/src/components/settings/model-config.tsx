'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { Provider, ProviderCreate } from '@/types/provider'
import type { LLMModel, ModelCreate } from '@/types/model'
import { providersApi } from '@/apis/providers'
import { modelsApi } from '@/apis/models'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ProviderFormDialog } from './provider-form-dialog'
import { ModelFormDialog } from './model-form-dialog'
import { TestModelDialog } from './test-model-dialog'
import { Plus, RefreshCw, Trash2, FlaskConical, Edit } from 'lucide-react'

export function ModelConfig() {
  const { data: providers, mutate: mutateProviders } = useSWR(
    'providers',
    () => providersApi.list(),
  )
  const { data: allModels, mutate: mutateModels } = useSWR(
    'all-models',
    () => modelsApi.listAll(),
  )

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [providerDialogOpen, setProviderDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [modelDialogOpen, setModelDialogOpen] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)

  const providerModels = allModels?.filter(
    (m) => m.provider_id === selectedProvider?.id,
  ) ?? []

  const handleCreateProvider = async (data: ProviderCreate) => {
    await providersApi.create(data)
    mutateProviders()
  }

  const handleUpdateProvider = async (data: ProviderCreate) => {
    if (!editingProvider) return
    await providersApi.update(editingProvider.id, data)
    mutateProviders()
    setEditingProvider(null)
  }

  const handleDeleteProvider = async (id: string) => {
    await providersApi.delete(id)
    mutateProviders()
    mutateModels()
    if (selectedProvider?.id === id) setSelectedProvider(null)
  }

  const handleFetchModels = async () => {
    if (!selectedProvider) return
    await providersApi.fetchModels(selectedProvider.id)
    mutateModels()
  }

  const handleCreateModel = async (data: ModelCreate) => {
    await modelsApi.create(data)
    mutateModels()
  }

  const handleToggleModel = async (model: LLMModel) => {
    await modelsApi.toggle(model.id)
    mutateModels()
  }

  const handleDeleteModel = async (id: string) => {
    await modelsApi.delete(id)
    mutateModels()
  }

  return (
    <div className="space-y-6" data-testid="model-config">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">Provider 列表</h3>
        <Button
          size="sm"
          onClick={() => {
            setEditingProvider(null)
            setProviderDialogOpen(true)
          }}
          data-testid="add-provider-button"
        >
          <Plus className="h-4 w-4 mr-1" />
          添加 Provider
        </Button>
      </div>

      {(!providers || providers.length === 0) && (
        <p className="text-sm text-text-muted py-4 text-center">
          暂无 Provider，点击上方按钮添加
        </p>
      )}

      <div className="space-y-2">
        {providers?.map((p) => (
          <div
            key={p.id}
            onClick={() => setSelectedProvider(p)}
            className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
              selectedProvider?.id === p.id
                ? 'border-primary bg-surface'
                : 'border-border hover:bg-surface'
            }`}
            data-testid={`provider-item-${p.id}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{p.name}</span>
              <Badge variant="secondary" className="text-xs">
                {p.type === 'openai_compatible' ? 'OpenAI' : 'Anthropic'}
              </Badge>
              <span className="text-xs text-text-muted">{p.base_url}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingProvider(p)
                  setProviderDialogOpen(true)
                }}
                data-testid={`edit-provider-${p.id}`}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteProvider(p.id)
                }}
                data-testid={`delete-provider-${p.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {selectedProvider && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              {selectedProvider.name} 的模型
            </h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchModels}
                data-testid="fetch-models-button"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Fetch 模型
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModelDialogOpen(true)}
                data-testid="add-model-button"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                手动添加
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestDialogOpen(true)}
                data-testid="test-connection-button"
              >
                <FlaskConical className="h-3.5 w-3.5 mr-1" />
                测试
              </Button>
            </div>
          </div>

          {providerModels.length === 0 && (
            <p className="text-sm text-text-muted py-2 text-center">
              暂无模型，点击 Fetch 拉取或手动添加
            </p>
          )}

          <div className="space-y-1">
            {providerModels.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-2.5 rounded-md border border-border"
                data-testid={`model-item-${m.id}`}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={m.is_enabled}
                    onCheckedChange={() => handleToggleModel(m)}
                    data-testid={`toggle-model-${m.id}`}
                  />
                  <div>
                    <span className="text-sm">
                      {m.display_name || m.model_id}
                    </span>
                    {m.display_name && (
                      <span className="text-xs text-text-muted ml-2">
                        {m.model_id}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-text-muted hover:text-red-500"
                  onClick={() => handleDeleteModel(m.id)}
                  data-testid={`delete-model-${m.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProviderFormDialog
        open={providerDialogOpen}
        onOpenChange={setProviderDialogOpen}
        provider={editingProvider}
        onSubmit={editingProvider ? handleUpdateProvider : handleCreateProvider}
      />
      <ModelFormDialog
        open={modelDialogOpen}
        onOpenChange={setModelDialogOpen}
        providerId={selectedProvider?.id ?? ''}
        onSubmit={handleCreateModel}
      />
      <TestModelDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        providerId={selectedProvider?.id ?? ''}
        models={providerModels}
      />
    </div>
  )
}
