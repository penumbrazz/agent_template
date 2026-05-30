'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { ModelCreate } from '@/types/model'
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

interface ModelFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string
  onSubmit: (data: ModelCreate) => Promise<void>
}

export function ModelFormDialog({
  open,
  onOpenChange,
  providerId,
  onSubmit,
}: ModelFormDialogProps) {
  const [modelId, setModelId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const t = useT()

  const handleSubmit = async () => {
    if (!modelId) return
    setLoading(true)
    try {
      await onSubmit({
        provider_id: providerId,
        model_id: modelId,
        display_name: displayName || undefined,
      })
      onOpenChange(false)
      setModelId('')
      setDisplayName('')
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : translate('settings.modelConfig.addModelFailed')
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="model-form-dialog">
        <DialogHeader>
          <DialogTitle>{t('settings.modelConfig.addModelTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="model-id">Model ID</Label>
            <Input
              id="model-id"
              data-testid="model-id-input"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="如 gpt-4o、claude-sonnet-4-20250514"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display-name">
              {t('settings.modelConfig.displayName')}
            </Label>
            <Input
              id="display-name"
              data-testid="display-name-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="如 GPT-4o"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="model-cancel"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !modelId}
            data-testid="model-submit"
          >
            {loading
              ? t('settings.modelConfig.addingModel')
              : t('settings.modelConfig.addModel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
