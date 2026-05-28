'use client'

import { useState } from 'react'
import type { Provider, ProviderCreate, ProviderType } from '@/types/provider'
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
import { Eye, EyeOff } from 'lucide-react'

interface ProviderFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider?: Provider | null
  onSubmit: (data: ProviderCreate) => Promise<void>
}

export function ProviderFormDialog({
  open,
  onOpenChange,
  provider,
  onSubmit,
}: ProviderFormDialogProps) {
  const [name, setName] = useState(provider?.name ?? '')
  const [type, setType] = useState<ProviderType>(
    provider?.type ?? 'openai_compatible',
  )
  const [baseUrl, setBaseUrl] = useState(provider?.base_url ?? '')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)

  const isEdit = !!provider

  const handleSubmit = async () => {
    if (!name || !baseUrl) return
    setLoading(true)
    try {
      await onSubmit({ name, type, base_url: baseUrl, api_key: apiKey })
      onOpenChange(false)
      if (!isEdit) {
        setName('')
        setBaseUrl('')
        setApiKey('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="provider-form-dialog">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑 Provider' : '添加 Provider'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="provider-name">名称</Label>
            <Input
              id="provider-name"
              data-testid="provider-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如 OpenAI、DeepSeek"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-type">类型</Label>
            <Select value={type} onValueChange={(v) => setType(v as ProviderType)}>
              <SelectTrigger id="provider-type" data-testid="provider-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai_compatible">OpenAI 兼容</SelectItem>
                <SelectItem value="anthropic_compatible">Anthropic 兼容</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-url">Base URL</Label>
            <Input
              id="provider-url"
              data-testid="provider-url-input"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-key">
              API Key{isEdit && '（留空则不修改）'}
            </Label>
            <div className="relative">
              <Input
                id="provider-key"
                data-testid="provider-key-input"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isEdit ? '••••••••' : '输入 API Key'}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                data-testid="toggle-key-visibility"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="provider-cancel"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !name || !baseUrl || (!isEdit && !apiKey)}
            data-testid="provider-submit"
          >
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
