'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { ModelCreate } from '@/types/model'
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
      const message = e instanceof Error ? e.message : '添加模型失败，请稍后重试'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="model-form-dialog">
        <DialogHeader>
          <DialogTitle>手动添加模型</DialogTitle>
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
            <Label htmlFor="display-name">显示名称（可选）</Label>
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
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !modelId}
            data-testid="model-submit"
          >
            {loading ? '添加中...' : '添加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
