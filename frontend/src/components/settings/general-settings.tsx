'use client'

import useSWR from 'swr'
import { toast } from 'sonner'
import { settingsApi } from '@/apis/settings'
import { modelsApi } from '@/apis/models'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export function GeneralSettings() {
  const { data: settings } = useSWR('settings', () => settingsApi.list())
  const { data: models } = useSWR('enabled-models', () => modelsApi.listEnabled())
  const { mutate: mutateSettings } = useSWR('settings', () => settingsApi.list())

  const defaultModel = settings?.find((s) => s.key === 'default_model_id')
  const enabledModels = models ?? []

  const handleDefaultChange = async (value: string) => {
    try {
      await settingsApi.update('default_model_id', value)
      mutateSettings()
    } catch (e) {
      const message = e instanceof Error ? e.message : '保存设置失败'
      toast.error(message)
    }
  }

  return (
    <div className="space-y-6" data-testid="general-settings">
      <div>
        <h3 className="text-base font-medium mb-4">通用设置</h3>
      </div>
      <div className="space-y-2">
        <Label htmlFor="default-model" data-testid="default-model-label">
          默认模型
        </Label>
        <Select
          value={defaultModel?.value || ''}
          onValueChange={handleDefaultChange}
        >
          <SelectTrigger id="default-model" data-testid="default-model-select">
            <SelectValue placeholder="选择默认模型" />
          </SelectTrigger>
          <SelectContent>
            {enabledModels.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-text-muted">
                暂无启用的模型
              </div>
            )}
            {enabledModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.display_name || model.model_id}
                {model.provider_name ? ` (${model.provider_name})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-text-muted">
          对话时默认使用的模型。请先在模型配置中启用模型。
        </p>
      </div>
    </div>
  )
}
