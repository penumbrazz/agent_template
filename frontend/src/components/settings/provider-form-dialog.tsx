'use client'

import { useState } from 'react'
import type { Provider, ProviderCreate, ProviderType } from '@/types/provider'
import { providersApi } from '@/apis/providers'
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
import { Eye, EyeOff, FlaskConical, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface TestResult {
  passed: boolean
  latencyMs: number
}

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="provider-form-dialog">
        {open && (
          <ProviderFormBody
            provider={provider}
            onSubmit={onSubmit}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface ProviderFormBodyProps {
  provider?: Provider | null
  onSubmit: (data: ProviderCreate) => Promise<void>
  onClose: () => void
}

function ProviderFormBody({ provider, onSubmit, onClose }: ProviderFormBodyProps) {
  const isEdit = !!provider

  const [name, setName] = useState(provider?.name ?? '')
  const [type, setType] = useState<ProviderType>(
    (provider?.type as ProviderType) ?? 'openai_compatible',
  )
  const [baseUrl, setBaseUrl] = useState(provider?.base_url ?? '')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const connectionFieldsChanged =
    isEdit &&
    (baseUrl !== (provider?.base_url ?? '') ||
      apiKey !== '' ||
      type !== provider?.type)

  const canTest = baseUrl.trim() !== ''

  const canSave = isEdit
    ? !connectionFieldsChanged || testResult?.passed === true
    : testResult?.passed === true

  const handleTypeChange = (v: string) => {
    setType(v as ProviderType)
    setTestResult(null)
  }

  const handleBaseUrlChange = (value: string) => {
    setBaseUrl(value)
    setTestResult(null)
  }

  const handleApiKeyChange = (value: string) => {
    setApiKey(value)
    setTestResult(null)
  }

  const handleTest = async () => {
    if (!baseUrl) return
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await providersApi.validate({
        base_url: baseUrl,
        api_key: apiKey,
        provider_type: type,
      })
      if (result.success) {
        setTestResult({ passed: true, latencyMs: result.latency_ms })
        toast.success(`连接成功 (${result.latency_ms}ms)`)
      } else {
        setTestResult(null)
        toast.error(result.error ?? '连接失败')
      }
    } catch (e) {
      setTestResult(null)
      const message =
        e instanceof Error ? e.message : '连接测试失败，请检查网络'
      toast.error(message)
    } finally {
      setIsTesting(false)
    }
  }

  const handleSubmit = async () => {
    if (!name || !baseUrl) return
    if (!canSave) return
    setLoading(true)
    try {
      await onSubmit({ name, type, base_url: baseUrl, api_key: apiKey })
      onClose()
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '保存失败，请稍后重试'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
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
          <Select value={type} onValueChange={handleTypeChange}>
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
            onChange={(e) => handleBaseUrlChange(e.target.value)}
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
              onChange={(e) => handleApiKeyChange(e.target.value)}
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

      {testResult?.passed && (
        <div
          className="flex items-center gap-2 text-sm text-green-600 px-1"
          data-testid="test-success-indicator"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>连接成功 ({testResult.latencyMs}ms)</span>
        </div>
      )}

      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={!canTest || isTesting}
          data-testid="test-connection-btn"
          className="gap-1.5"
        >
          <FlaskConical className="h-3.5 w-3.5" />
          {isTesting ? '测试中...' : '测试连接'}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="provider-cancel"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !name || !baseUrl || !canSave}
            data-testid="provider-submit"
          >
            {loading ? '保存中...' : '保存'}
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}
