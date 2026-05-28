'use client'

import { useState } from 'react'
import type { LLMModel } from '@/types/model'
import { providersApi } from '@/apis/providers'
import { Button } from '@/components/ui/button'
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
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface TestModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string
  models: LLMModel[]
}

export function TestModelDialog({
  open,
  onOpenChange,
  providerId,
  models,
}: TestModelDialogProps) {
  const [selectedModelId, setSelectedModelId] = useState<string>(
    models[0]?.model_id ?? '',
  )
  const [result, setResult] = useState<{
    success: boolean
    latency_ms: number
    error: string | null
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleTest = async () => {
    if (!selectedModelId) return
    setLoading(true)
    setResult(null)
    try {
      const res = await providersApi.test(providerId, selectedModelId)
      setResult(res)
    } catch {
      setResult({ success: false, latency_ms: 0, error: '请求失败' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="test-model-dialog">
        <DialogHeader>
          <DialogTitle>测试模型连通性</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>选择模型</Label>
            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
              <SelectTrigger data-testid="test-model-select">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.model_id}>
                    {m.display_name || m.model_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {result && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                result.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
              data-testid="test-result"
            >
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>
                {result.success
                  ? `连接成功 (${result.latency_ms}ms)`
                  : `连接失败: ${result.error}`}
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setResult(null)
            }}
            data-testid="test-close"
          >
            关闭
          </Button>
          <Button
            onClick={handleTest}
            disabled={loading || !selectedModelId}
            data-testid="test-run"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            测试
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
