'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { LLMModel, ModelType, ModelUpdate } from '@/types/model'
import { useT, translate } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { modelsApi } from '@/apis/models'

const MODEL_TYPE_OPTIONS = [
  { value: 'llm', labelKey: 'settings.modelConfig.typeLlm' },
  { value: 'vlm', labelKey: 'settings.modelConfig.typeVlm' },
  { value: 'embedding', labelKey: 'settings.modelConfig.typeEmbedding' },
  { value: 'rerank', labelKey: 'settings.modelConfig.typeRerank' },
] as const

interface ModelSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  model: LLMModel | null
  onSaved: () => void
}

export function ModelSettingsDialog({
  open,
  onOpenChange,
  model,
  onSaved,
}: ModelSettingsDialogProps) {
  const [modelType, setModelType] = useState<ModelType>(
    model?.model_type ?? 'llm',
  )
  const [contextLength, setContextLength] = useState<string>(
    model?.context_length?.toString() ?? '',
  )
  const [maxOutputTokens, setMaxOutputTokens] = useState<string>(
    model?.max_output_tokens?.toString() ?? '',
  )
  const [loading, setLoading] = useState(false)
  const t = useT()

  const handleSubmit = async () => {
    if (!model) return
    setLoading(true)
    try {
      const data: ModelUpdate = {
        model_type: modelType,
        context_length: contextLength ? parseInt(contextLength, 10) : undefined,
        max_output_tokens: maxOutputTokens
          ? parseInt(maxOutputTokens, 10)
          : undefined,
      }
      await modelsApi.update(model.id, data)
      toast.success(t('settings.modelConfig.saveSuccess'))
      onOpenChange(false)
      onSaved()
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : translate('settings.modelConfig.modelSaveFailed')
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="model-settings-dialog">
        <DialogHeader>
          <DialogTitle>{t('settings.modelConfig.modelSettings')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('settings.modelConfig.modelId')}</Label>
            <div className="text-sm text-text-muted rounded-md border border-border px-3 py-2 bg-muted/30">
              {model?.model_id}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('settings.modelConfig.modelType')}</Label>
            <Select
              value={modelType}
              onValueChange={(v) => setModelType(v as ModelType)}
            >
              <SelectTrigger data-testid="model-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('settings.modelConfig.contextLength')}</Label>
            <Input
              type="number"
              data-testid="context-length-input"
              value={contextLength}
              onChange={(e) => setContextLength(e.target.value)}
              placeholder={t('settings.modelConfig.contextLengthPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('settings.modelConfig.maxOutputTokens')}</Label>
            <Input
              type="number"
              data-testid="max-output-tokens-input"
              value={maxOutputTokens}
              onChange={(e) => setMaxOutputTokens(e.target.value)}
              placeholder={t('settings.modelConfig.maxOutputTokensPlaceholder')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="model-settings-cancel"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            data-testid="model-settings-save"
          >
            {loading
              ? t('settings.modelConfig.saving')
              : t('settings.modelConfig.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
