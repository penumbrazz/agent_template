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
import { useT, translate, useLocale, setLocale, LOCALES } from '@/i18n'
import type { Locale } from '@/i18n'

export function GeneralSettings() {
  const { data: settings } = useSWR('settings', () => settingsApi.list())
  const { data: models } = useSWR('enabled-models', () =>
    modelsApi.listEnabled(),
  )
  const { mutate: mutateSettings } = useSWR('settings', () =>
    settingsApi.list(),
  )
  const t = useT()
  const currentLocale = useLocale()

  const defaultModel = settings?.find((s) => s.key === 'default_model_id')
  const enabledModels = models ?? []

  const handleDefaultChange = async (value: string) => {
    try {
      await settingsApi.update('default_model_id', value)
      mutateSettings()
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : translate('settings.general.saveFailed')
      toast.error(message)
    }
  }

  return (
    <div className="space-y-6" data-testid="general-settings">
      <h3 className="text-base font-medium">{t('settings.general.title')}</h3>
      <div className="space-y-2">
        <Label htmlFor="language" data-testid="language-label">
          {t('settings.general.language')}
        </Label>
        <Select
          value={currentLocale}
          onValueChange={(value) => setLocale(value as Locale)}
        >
          <SelectTrigger id="language" data-testid="language-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LOCALES).map(([key, { nativeLabel }]) => (
              <SelectItem key={key} value={key}>
                {nativeLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="default-model" data-testid="default-model-label">
          {t('settings.general.defaultModel')}
        </Label>
        <Select
          value={defaultModel?.value || ''}
          onValueChange={handleDefaultChange}
        >
          <SelectTrigger id="default-model" data-testid="default-model-select">
            <SelectValue placeholder={t('settings.general.selectModel')} />
          </SelectTrigger>
          <SelectContent>
            {enabledModels.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-text-muted">
                {t('settings.general.noModels')}
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
          {t('settings.general.defaultModelDesc')}
        </p>
      </div>
    </div>
  )
}
