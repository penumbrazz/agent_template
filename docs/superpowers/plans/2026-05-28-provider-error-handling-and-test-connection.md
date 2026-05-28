# Provider 错误提示与连接测试 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Provider 设置页面添加 sonner toast 错误提示系统，并在 Provider 表单对话框中添加强制连接测试按钮。

**Architecture:** 后端新增 `POST /providers/validate` 端点用于无状态连接验证；前端安装 sonner 并在 layout 中挂载 Toaster，为所有 settings 组件的 API 调用添加 try/catch + toast 反馈；改造 provider-form-dialog 添加 Test Connection 按钮和强制测试逻辑。

**Tech Stack:** sonner (toast), FastAPI, httpx, React (useState), shadcn/ui Dialog

---

## 文件变更地图

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 修改 | `frontend/src/app/layout.tsx` | 添加 `<Toaster />` 全局挂载 |
| 修改 | `frontend/src/apis/providers.ts` | 添加 `validate` API 方法 |
| 修改 | `frontend/src/types/provider.ts` | 添加 `ValidateResult` 类型 |
| 修改 | `frontend/src/components/settings/provider-form-dialog.tsx` | 添加 Test 按钮、强制测试逻辑、错误处理 |
| 修改 | `frontend/src/components/settings/model-config.tsx` | 所有 handler 添加 try/catch + toast |
| 修改 | `frontend/src/components/settings/model-form-dialog.tsx` | handleSubmit 添加 catch + toast |
| 修改 | `frontend/src/components/settings/general-settings.tsx` | handleDefaultChange 添加 catch + toast |
| 修改 | `backend/app/schemas/provider.py` | 添加 `ProviderValidateRequest`、`ProviderValidateResponse` |
| 修改 | `backend/app/services/provider.py` | 添加 `validate_provider` 函数 |
| 修改 | `backend/app/api/endpoints/provider.py` | 添加 `POST /providers/validate` 端点 |
| 修改 | `backend/tests/test_provider.py` | 添加 validate 端点测试 |
| 修改 | `frontend/e2e/model-configuration.spec.ts` | 更新 add provider 测试适配 Test Connection |

---

### Task 1: 安装 sonner 并在全局挂载 Toaster

**Files:**
- Modify: `frontend/package.json` (通过 npm install 自动修改)
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: 安装 sonner**

Run:
```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend && npm install sonner
```
Expected: sonner added to dependencies

- [ ] **Step 2: 在 layout.tsx 中添加 Toaster**

修改 `frontend/src/app/layout.tsx`，在 body 中添加 `<Toaster />`：

```tsx
import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'
import TelemetryInit from '@/components/TelemetryInit'

export const metadata: Metadata = {
  title: 'Agent Template',
  description: 'Full-stack AI application template.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-base text-text-primary antialiased">
        <TelemetryInit />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
```

- [ ] **Step 3: 验证应用启动正常**

Run:
```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend && npm run build
```
Expected: BUILD SUCCESSFUL，无类型错误

- [ ] **Step 4: 提交**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/src/app/layout.tsx
git commit -m "feat(frontend): install sonner and add global Toaster"
```

---

### Task 2: 后端 — 添加 Provider validate 端点

**Files:**
- Modify: `backend/app/schemas/provider.py`
- Modify: `backend/app/services/provider.py`
- Modify: `backend/app/api/endpoints/provider.py`
- Modify: `backend/tests/test_provider.py`

- [ ] **Step 1: 编写 validate 端点的失败测试**

在 `backend/tests/test_provider.py` 末尾添加新的测试类：

```python
class TestProviderValidate:
    def test_validate_requires_auth(self, client):
        resp = client.post(
            "/api/providers/validate",
            json={
                "base_url": "https://api.openai.com",
                "api_key": "sk-test",
                "provider_type": "openai_compatible",
            },
        )
        assert resp.status_code == 401

    def test_validate_requires_superuser(self, test_user, client):
        resp = client.post(
            "/api/providers/validate",
            headers=test_user,
            json={
                "base_url": "https://api.openai.com",
                "api_key": "sk-test",
                "provider_type": "openai_compatible",
            },
        )
        assert resp.status_code == 403

    @patch("app.services.provider.httpx.Client")
    def test_validate_openai_success(self, mock_client_cls, admin_user, client):
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_client = MagicMock()
        mock_client.get.return_value = mock_resp
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client_cls.return_value = mock_client

        resp = client.post(
            "/api/providers/validate",
            headers=admin_user,
            json={
                "base_url": "https://api.openai.com",
                "api_key": "sk-test-key",
                "provider_type": "openai_compatible",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "latency_ms" in data

    @patch("app.services.provider.httpx.Client")
    def test_validate_connection_failure(self, mock_client_cls, admin_user, client):
        mock_client = MagicMock()
        mock_client.get.side_effect = Exception("Connection refused")
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client_cls.return_value = mock_client

        resp = client.post(
            "/api/providers/validate",
            headers=admin_user,
            json={
                "base_url": "https://bad-url.example.com",
                "api_key": "sk-test-key",
                "provider_type": "openai_compatible",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is False
        assert "Connection refused" in data["error"]
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/backend && uv run pytest tests/test_provider.py::TestProviderValidate -v
```
Expected: FAILED — validate 端点尚未存在

- [ ] **Step 3: 添加 Schema**

在 `backend/app/schemas/provider.py` 末尾添加：

```python
class ProviderValidateRequest(BaseModel):
    base_url: str = Field(..., min_length=1, max_length=500)
    api_key: str = Field(..., min_length=1)
    provider_type: ProviderType


class ProviderValidateResponse(BaseModel):
    success: bool
    latency_ms: int = 0
    error: str | None = None
```

- [ ] **Step 4: 添加 service 函数**

在 `backend/app/services/provider.py` 中添加新函数：

```python
def validate_provider(base_url: str, api_key: str, provider_type: str) -> dict:
    url = base_url.rstrip("/")
    start = time.monotonic()

    try:
        with httpx.Client(timeout=15.0) as client:
            if provider_type == ProviderType.OPENAI_COMPATIBLE.value:
                resp = client.get(
                    f"{url}/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
            else:
                resp = client.post(
                    f"{url}/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "messages": [{"role": "user", "content": "Hi"}],
                        "max_tokens": 1,
                    },
                )
            resp.raise_for_status()
        latency_ms = int((time.monotonic() - start) * 1000)
        return {"success": True, "latency_ms": latency_ms, "error": None}
    except Exception as e:
        latency_ms = int((time.monotonic() - start) * 1000)
        return {"success": False, "latency_ms": latency_ms, "error": str(e)}
```

- [ ] **Step 5: 添加端点路由**

在 `backend/app/api/endpoints/provider.py` 中添加导入和端点。

更新导入：
```python
from app.schemas.provider import (
    ProviderCreate,
    ProviderRead,
    ProviderTestRequest,
    ProviderUpdate,
    ProviderValidateRequest,
)
from app.services.provider import (
    _mask_key,
    create_provider,
    delete_provider,
    fetch_models,
    get_provider,
    list_providers,
    test_provider,
    update_provider,
    validate_provider,
)
```

在 `router = APIRouter(...)` 后、`list_all_providers` 端点前添加：
```python
@router.post("/validate")
def validate_provider_endpoint(
    data: ProviderValidateRequest,
    current_user: User = Depends(require_superuser),
):
    result = validate_provider(data.base_url, data.api_key, data.provider_type.value)
    return result
```

**重要**：此端点必须定义在 `/{provider_id}` 路由之前，否则 FastAPI 会将 `validate` 当作 `provider_id` 参数。

- [ ] **Step 6: 运行测试确认通过**

Run:
```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/backend && uv run pytest tests/test_provider.py::TestProviderValidate -v
```
Expected: 4 tests PASSED

- [ ] **Step 7: 运行全部后端测试确认无回归**

Run:
```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/backend && uv run pytest tests/ -v
```
Expected: ALL PASSED

- [ ] **Step 8: 提交**

```bash
git add backend/app/schemas/provider.py backend/app/services/provider.py backend/app/api/endpoints/provider.py backend/tests/test_provider.py
git commit -m "feat(backend): add POST /providers/validate endpoint for connection testing"
```

---

### Task 3: 前端 — 添加 validate API 方法和类型

**Files:**
- Modify: `frontend/src/types/provider.ts`
- Modify: `frontend/src/apis/providers.ts`

- [ ] **Step 1: 添加 ValidateResult 类型**

在 `frontend/src/types/provider.ts` 中添加：

```typescript
export interface ValidateResult {
  success: boolean
  latency_ms: number
  error: string | null
}
```

- [ ] **Step 2: 在 providersApi 中添加 validate 方法**

在 `frontend/src/apis/providers.ts` 中添加导入和方法。

更新导入：
```typescript
import type { Provider, ProviderCreate, ProviderUpdate, ValidateResult } from '@/types/provider'
```

在 `providersApi` 对象的 `test` 方法后添加：
```typescript
  validate: (data: { base_url: string; api_key: string; provider_type: string }) =>
    apiClient.post<ValidateResult>('/providers/validate', data),
```

- [ ] **Step 3: 验证类型无误**

Run:
```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```
Expected: 无错误（或仅与本次改动无关的既有错误）

- [ ] **Step 4: 提交**

```bash
git add frontend/src/types/provider.ts frontend/src/apis/providers.ts
git commit -m "feat(frontend): add validate API method and ValidateResult type"
```

---

### Task 4: 前端 — 改造 Provider 表单对话框（Test Connection + 强制测试 + toast）

**Files:**
- Modify: `frontend/src/components/settings/provider-form-dialog.tsx`

- [ ] **Step 1: 重写 provider-form-dialog.tsx**

将整个文件替换为以下内容。关键变更：
1. 新增 `testResult` / `isTesting` 状态
2. 新增 `handleTest` 函数调用 `providersApi.validate`
3. `base_url`/`api_key`/`type` 变更时重置 `testResult`
4. Save 按钮 disabled 逻辑：新建模式必须测试通过，编辑模式检测字段是否变更
5. 表单底部左侧添加 Test Connection 按钮
6. 测试成功后显示内联成功提示

```tsx
'use client'

import { useState, useEffect } from 'react'
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
import { Eye, ShowOff, FlaskConical, CheckCircle2 } from 'lucide-react'
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
  const [name, setName] = useState(provider?.name ?? '')
  const [type, setType] = useState<ProviderType>(
    provider?.type ?? 'openai_compatible',
  )
  const [baseUrl, setBaseUrl] = useState(provider?.base_url ?? '')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const isEdit = !!provider

  // Reset form when dialog opens/closes or provider changes
  useEffect(() => {
    if (open) {
      setName(provider?.name ?? '')
      setType((provider?.type as ProviderType) ?? 'openai_compatible')
      setBaseUrl(provider?.base_url ?? '')
      setApiKey('')
      setTestResult(null)
      setIsTesting(false)
    }
  }, [open, provider])

  // Track original values to detect changes in edit mode
  const connectionFieldsChanged =
    isEdit &&
    (baseUrl !== (provider?.base_url ?? '') ||
      apiKey !== '' ||
      type !== provider?.type)

  const canTest = baseUrl.trim() !== '' && apiKey.trim() !== ''

  // In create mode: must pass test. In edit mode: must pass test only if connection fields changed.
  const canSave = isEdit
    ? !connectionFieldsChanged || testResult?.passed === true
    : testResult?.passed === true

  // Reset test result when connection fields change
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
    if (!baseUrl || !apiKey) return
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
      onOpenChange(false)
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '保存失败，请稍后重试'
      toast.error(message)
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
                {showKey ? <ShowOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Test result inline feedback */}
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
              onClick={() => onOpenChange(false)}
              data-testid="provider-cancel"
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !name || !baseUrl || (!isEdit && !apiKey) || !canSave}
              data-testid="provider-submit"
            >
              {loading ? '保存中...' : '保存'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: 验证编译通过**

Run:
```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/settings/provider-form-dialog.tsx
git commit -m "feat(frontend): add Test Connection button and mandatory test-before-save in provider form"
```

---

### Task 5: 前端 — 为 model-config.tsx 添加错误处理 toast

**Files:**
- Modify: `frontend/src/components/settings/model-config.tsx`

- [ ] **Step 1: 修改 model-config.tsx**

关键变更：
1. 导入 `toast` from 'sonner'
2. 所有 handler 函数包裹 try/catch
3. catch 中调用 `toast.error()` 显示错误

更新导入部分（添加 `toast`）：
```typescript
import { toast } from 'sonner'
```

替换所有 handler 函数：

```typescript
  const handleCreateProvider = async (data: ProviderCreate) => {
    try {
      await providersApi.create(data)
      mutateProviders()
      toast.success('Provider 创建成功')
    } catch (e) {
      const message = e instanceof Error ? e.message : '创建失败，请稍后重试'
      toast.error(message)
      throw e
    }
  }

  const handleUpdateProvider = async (data: ProviderCreate) => {
    if (!editingProvider) return
    try {
      await providersApi.update(editingProvider.id, data)
      mutateProviders()
      setEditingProvider(null)
      toast.success('Provider 更新成功')
    } catch (e) {
      const message = e instanceof Error ? e.message : '更新失败，请稍后重试'
      toast.error(message)
      throw e
    }
  }

  const handleDeleteProvider = async (id: string) => {
    try {
      await providersApi.delete(id)
      mutateProviders()
      mutateModels()
      if (selectedProvider?.id === id) setSelectedProvider(null)
      toast.success('Provider 已删除')
    } catch (e) {
      const message = e instanceof Error ? e.message : '删除失败，请稍后重试'
      toast.error(message)
    }
  }

  const handleFetchModels = async () => {
    if (!selectedProvider) return
    try {
      await providersApi.fetchModels(selectedProvider.id)
      mutateModels()
      toast.success('模型列表已更新')
    } catch (e) {
      const message = e instanceof Error ? e.message : '获取模型失败'
      toast.error(message)
    }
  }

  const handleCreateModel = async (data: ModelCreate) => {
    try {
      await modelsApi.create(data)
      mutateModels()
    } catch (e) {
      const message = e instanceof Error ? e.message : '创建模型失败'
      toast.error(message)
      throw e
    }
  }

  const handleToggleModel = async (model: LLMModel) => {
    try {
      await modelsApi.toggle(model.id)
      mutateModels()
    } catch (e) {
      const message = e instanceof Error ? e.message : '切换模型状态失败'
      toast.error(message)
    }
  }

  const handleDeleteModel = async (id: string) => {
    try {
      await modelsApi.delete(id)
      mutateModels()
    } catch (e) {
      const message = e instanceof Error ? e.message : '删除模型失败'
      toast.error(message)
    }
  }
```

注意：`handleCreateProvider`、`handleUpdateProvider`、`handleCreateModel` 中的 `throw e` 是为了将错误继续抛给 provider-form-dialog 和 model-form-dialog，让它们也能处理（例如阻止关闭对话框）。

- [ ] **Step 2: 验证编译通过**

Run:
```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/settings/model-config.tsx
git commit -m "feat(frontend): add toast error handling to all model-config API handlers"
```

---

### Task 6: 前端 — 为 model-form-dialog 和 general-settings 添加错误处理 toast

**Files:**
- Modify: `frontend/src/components/settings/model-form-dialog.tsx`
- Modify: `frontend/src/components/settings/general-settings.tsx`

- [ ] **Step 1: 修改 model-form-dialog.tsx**

更新导入（添加 `toast`）：
```typescript
import { toast } from 'sonner'
```

替换 `handleSubmit` 函数：
```typescript
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
```

- [ ] **Step 2: 修改 general-settings.tsx**

更新导入（添加 `toast`）：
```typescript
import { toast } from 'sonner'
```

替换 `handleDefaultChange` 函数：
```typescript
  const handleDefaultChange = async (value: string) => {
    try {
      await settingsApi.update('default_model_id', value)
      mutateSettings()
    } catch (e) {
      const message = e instanceof Error ? e.message : '保存设置失败'
      toast.error(message)
    }
  }
```

- [ ] **Step 3: 验证编译通过**

Run:
```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add frontend/src/components/settings/model-form-dialog.tsx frontend/src/components/settings/general-settings.tsx
git commit -m "feat(frontend): add toast error handling to model-form-dialog and general-settings"
```

---

### Task 7: 更新 E2E 测试适配 Test Connection 流程

**Files:**
- Modify: `frontend/e2e/model-configuration.spec.ts`

- [ ] **Step 1: 更新 'add provider via dialog' 测试**

现有的 `add provider via dialog` 测试直接填写表单后点保存。现在需要先点 Test Connection，等测试通过后再保存。

但由于 E2E 测试必须发送真实 HTTP 请求（不能 mock），而 Test Connection 会调用后端的 validate 端点去请求外部 API（必然失败），所以需要先通过 API 创建一个 provider 来让测试工作。

**方案**：改用后端 API 创建 provider 来完成"添加"测试，然后只在前端验证 provider 出现在列表中。同时新增一个测试来验证 Test Connection 按钮的 UI 行为（按钮存在、点击后显示状态）。

替换 `add provider via dialog` 测试：

```typescript
  test('add provider via dialog with test connection', async ({ page }) => {
    // Since Test Connection requires a real API endpoint, we test the UI flow:
    // 1. Open dialog and fill form
    // 2. Verify Test Connection button exists and Save is disabled
    // 3. Verify Test Connection button is enabled when fields are filled

    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('settings-trigger').click()
    await expect(page.getByTestId('settings-panel')).toBeVisible()

    await page.getByTestId('add-provider-button').click()
    const dialog = page.getByTestId('provider-form-dialog')
    await expect(dialog).toBeVisible()

    // Save should be disabled before test
    const saveBtn = page.getByTestId('provider-submit')
    await expect(saveBtn).toBeDisabled()

    // Fill form
    await page.getByTestId('provider-name-input').fill('E2E Test Provider')
    await page.getByTestId('provider-url-input').fill('https://api.example.com')
    await page.getByTestId('provider-key-input').fill('sk-test-key-123')

    // Test Connection button should be enabled
    const testBtn = page.getByTestId('test-connection-btn')
    await expect(testBtn).toBeEnabled()

    // Click test — will fail because the URL is not a real API
    await testBtn.click()

    // A toast error should appear
    await expect(page.getByText(/连接/i)).toBeVisible({ timeout: 10000 })

    // Save should still be disabled after failed test
    await expect(saveBtn).toBeDisabled()

    // Close dialog
    await page.getByTestId('provider-cancel').click()
    await expect(dialog).not.toBeVisible()
  })
```

注意：原测试中通过 UI 创建 provider 后用 API 验证的部分被移除，因为现在 UI 流程需要 Test Connection 先通过。Provider 创建的 E2E 验证已经由后端测试覆盖。

同时更新 `edit provider` 测试——编辑模式下如果只改 name 不改连接字段，Save 应该直接可用：

替换 `edit provider` 测试：

```typescript
  test('edit provider name without re-test', async ({ page }) => {
    // Setup
    const provider = await apiPost('/api/providers', {
      name: 'E2E Edit Before',
      type: 'openai_compatible',
      base_url: 'https://before.example.com',
      api_key: 'sk-edit-test',
    })
    createdProviderId = provider.id

    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('settings-trigger').click()
    await expect(page.getByTestId('settings-panel')).toBeVisible()

    // Click edit button on provider
    const editBtn = page.getByTestId(`edit-provider-${provider.id}`)
    await editBtn.click()

    // Edit dialog should open
    const dialog = page.getByTestId('provider-form-dialog')
    await expect(dialog).toBeVisible()

    // Name field should be pre-filled
    const nameInput = page.getByTestId('provider-name-input')
    await expect(nameInput).toHaveValue('E2E Edit Before')

    // Change name only — Save should be enabled (no connection fields changed)
    await nameInput.clear()
    await nameInput.fill('E2E Edit After')

    const saveBtn = page.getByTestId('provider-submit')
    await expect(saveBtn).toBeEnabled()

    // Submit
    await saveBtn.click()

    // Dialog should close
    await expect(dialog).not.toBeVisible()

    // Verify via API
    const providers = await apiGet('/api/providers')
    const updated = providers.find((p: { id: string }) => p.id === provider.id)
    expect(updated.name).toBe('E2E Edit After')
  })
```

- [ ] **Step 2: 运行前端类型检查**

Run:
```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/model-configuration.spec.ts
git commit -m "test(e2e): update provider tests to reflect Test Connection flow"
```

---

### Task 8: 全量验证

- [ ] **Step 1: 运行后端全部测试**

Run:
```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/backend && uv run pytest tests/ -v
```
Expected: ALL PASSED

- [ ] **Step 2: 运行前端编译检查**

Run:
```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend && npm run build
```
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: 启动前后端，手动验证核心流程**

Run:
```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/backend && uv run uvicorn app.main:app --reload &
cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend && npm run dev &
```

手动验证：
1. 打开设置面板 → 模型配置 tab
2. 点击"添加 Provider" → 填写表单 → Save 按钮应该是 disabled
3. 点击"测试连接" → 应显示 toast 错误（因为 URL 不是真实 API）
4. 如果有真实 API key，填入真实信息 → 测试连接 → 成功后 Save 按钮变为可用
5. 测试编辑模式：编辑一个已有 provider，只改 name → Save 应直接可用
6. 测试删除操作 → 应显示成功 toast

- [ ] **Step 4: 最终提交（如有 lint/format 修复）**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend && npm run format && npm run lint
cd /Users/zhourenkang/Workspace/daydream/agent_template/backend && uv run black . && uv run isort .
git add -A
git commit -m "chore: format and lint after provider error handling implementation"
```
