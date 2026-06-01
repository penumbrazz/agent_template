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
import { ModelSettingsDialog } from './model-settings-dialog'
import { Plus, RefreshCw, Trash2, FlaskConical, Edit, Settings } from 'lucide-react'
import { useT } from '@/i18n'
import { useApiAction } from '@/hooks/use-api-action'
import { cn } from '@/lib/utils'

export function ModelConfig() {
  const { data: providers, mutate: mutateProviders } = useSWR('providers', () =>
    providersApi.list(),
  )
  const { data: allModels, mutate: mutateModels } = useSWR('all-models', () =>
    modelsApi.listAll(),
  )

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  )
  const [providerDialogOpen, setProviderDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [modelDialogOpen, setModelDialogOpen] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<LLMModel | null>(null)
  const t = useT()
  const { execute } = useApiAction()

  const providerModels =
    allModels?.filter((m) => m.provider_id === selectedProvider?.id) ?? []

  const handleCreateProvider = async (data: ProviderCreate) => {
    const result = await execute(() => providersApi.create(data), {
      successMessage: 'settings.modelConfig.providerCreated',
      errorMessage: 'settings.modelConfig.createFailed',
    })
    if (result !== undefined) {
      mutateProviders()
    } else {
      throw new Error('Provider creation failed')
    }
  }

  const handleUpdateProvider = async (data: ProviderCreate) => {
    if (!editingProvider) return
    const result = await execute(
      () => providersApi.update(editingProvider.id, data),
      {
        successMessage: 'settings.modelConfig.providerUpdated',
        errorMessage: 'settings.modelConfig.updateFailed',
      },
    )
    if (result !== undefined) {
      mutateProviders()
      setEditingProvider(null)
    } else {
      throw new Error('Provider update failed')
    }
  }

  const handleDeleteProvider = async (id: string) => {
    const result = await execute(() => providersApi.delete(id), {
      successMessage: 'settings.modelConfig.providerDeleted',
      errorMessage: 'settings.modelConfig.deleteFailed',
    })
    if (result !== undefined) {
      mutateProviders()
      mutateModels()
      if (selectedProvider?.id === id) setSelectedProvider(null)
    }
  }

  const handleFetchModels = async () => {
    if (!selectedProvider) return
    const result = await execute(
      () => providersApi.fetchModels(selectedProvider.id),
      {
        successMessage: 'settings.modelConfig.modelsFetched',
        errorMessage: 'settings.modelConfig.fetchModelsFailed',
      },
    )
    if (result !== undefined) {
      mutateModels()
    }
  }

  const handleCreateModel = async (data: ModelCreate) => {
    const result = await execute(() => modelsApi.create(data), {
      errorMessage: 'settings.modelConfig.createModelFailed',
    })
    if (result !== undefined) {
      mutateModels()
    } else {
      throw new Error('Model creation failed')
    }
  }

  const handleToggleModel = async (model: LLMModel) => {
    const result = await execute(() => modelsApi.toggle(model.id), {
      errorMessage: 'settings.modelConfig.toggleModelFailed',
    })
    if (result !== undefined) {
      mutateModels()
    }
  }

  const handleDeleteModel = async (id: string) => {
    const result = await execute(() => modelsApi.delete(id), {
      errorMessage: 'settings.modelConfig.deleteModelFailed',
    })
    if (result !== undefined) {
      mutateModels()
    }
  }

  return (
    <div className="space-y-6" data-testid="model-config">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">
          {t('settings.modelConfig.title')}
        </h3>
        <Button
          size="sm"
          onClick={() => {
            setEditingProvider(null)
            setProviderDialogOpen(true)
          }}
          data-testid="add-provider-button"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('settings.modelConfig.addProvider')}
        </Button>
      </div>

      {(!providers || providers.length === 0) && (
        <p className="text-sm text-text-muted py-4 text-center">
          {t('settings.modelConfig.noProvider')}
        </p>
      )}

      <div className="space-y-2">
        {providers?.map((p) => (
          <div
            key={p.id}
            onClick={() => setSelectedProvider(p)}
            className={cn(
              'flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors',
              selectedProvider?.id === p.id
                ? 'border-primary bg-surface'
                : 'border-border hover:bg-surface',
            )}
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
                className="h-8 w-8 text-error hover:text-error"
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
              {t('settings.modelConfig.providerModels', {
                name: selectedProvider.name,
              })}
            </h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchModels}
                data-testid="fetch-models-button"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                {t('settings.modelConfig.fetchModels')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModelDialogOpen(true)}
                data-testid="add-model-button"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('settings.modelConfig.manualAdd')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestDialogOpen(true)}
                data-testid="test-connection-button"
              >
                <FlaskConical className="h-3.5 w-3.5 mr-1" />
                {t('settings.modelConfig.test')}
              </Button>
            </div>
          </div>

          {providerModels.length === 0 && (
            <p className="text-sm text-text-muted py-2 text-center">
              {t('settings.modelConfig.noModels')}
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
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingModel(m)
                      setSettingsDialogOpen(true)
                    }}
                    data-testid={`settings-model-${m.id}`}
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-text-muted hover:text-error"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteModel(m.id)
                    }}
                    data-testid={`delete-model-${m.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
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
      <ModelSettingsDialog
        key={editingModel?.id}
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        model={editingModel}
        onSaved={mutateModels}
      />
    </div>
  )
}
