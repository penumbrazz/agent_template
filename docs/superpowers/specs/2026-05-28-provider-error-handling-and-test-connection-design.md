# Provider 错误提示与连接测试设计

## 概述

为 Provider 设置页面添加两个功能：
1. **全局错误提示**：所有 API 操作失败时通过 toast 通知用户
2. **连接测试按钮**：在 Provider 表单对话框中添加 Test Connection 按钮，强制测试通过后才能保存

## 1. 错误提示系统（sonner toast）

### 1.1 安装与集成

- 安装 `sonner` 包
- 在 `frontend/src/app/layout.tsx` 中添加 `<Toaster />` 组件

### 1.2 错误处理覆盖范围

为以下组件中的所有 API 调用添加 try/catch + toast.error：

| 组件 | 涉及操作 |
|------|----------|
| `model-config.tsx` | 创建/更新/删除 Provider、获取模型列表、创建/切换/删除 Model |
| `provider-form-dialog.tsx` | Provider 创建/更新提交 |
| `model-form-dialog.tsx` | Model 创建提交 |
| `general-settings.tsx` | 设置保存 |

### 1.3 错误信息提取

从 `ApiError` 的 response body 中提取 `detail` 字段作为 toast 文案。若无法提取，显示默认文案"操作失败，请稍后重试"。

### 1.4 成功提示

关键操作（创建 Provider、删除 Provider）成功时也用 `toast.success()` 给予正面反馈。

## 2. Provider 连接测试

### 2.1 后端：新增 validate 端点

**端点**：`POST /providers/validate`
**权限**：需要认证（Superuser）

**请求体**：
```json
{
  "base_url": "string",
  "api_key": "string",
  "provider_type": "openai_compatible | anthropic_compatible"
}
```

**成功响应**（200）：
```json
{
  "success": true,
  "latency_ms": 234
}
```

**失败响应**（200）：
```json
{
  "success": false,
  "error": "Connection refused: 无法连接到 http://localhost:11434/v1/models"
}
```

**逻辑**：
- `openai_compatible`：用提供的凭据请求 `{base_url}/v1/models`，检查返回 200
- `anthropic_compatible`：用提供的凭据发送一个最小化的 messages 请求（max_tokens=1），检查返回正常
- 记录请求耗时（latency_ms）
- 不写入数据库，纯验证

### 2.2 前端：Provider 表单对话框改造

#### 2.2.1 UI 布局

表单底部改为：

```
┌──────────────────────────────────────┐
│  Add Provider                     ✕  │
│──────────────────────────────────────│
│  Name: [___________]                 │
│  Type: [OpenAI Compatible ▾]         │
│  Base URL: [___________]             │
│  API Key: [___________]              │
│                                      │
│  [🧪 Test Connection]   [Cancel] [Save] │
│                                      │
│  ✓ Connection successful (234ms)     │  ← 内联状态提示
└──────────────────────────────────────┘
```

- Test Connection 按钮位于对话框底部左侧
- Cancel 和 Save 按钮位于底部右侧

#### 2.2.2 状态管理

新增状态：
- `testResult: { passed: boolean; latencyMs?: number; error?: string } | null`
- `isTesting: boolean`

#### 2.2.3 强制测试逻辑

- **新建模式**：`testResult?.passed !== true` 时，Save 按钮 disabled
- **编辑模式**：
  - 如果 `base_url`、`api_key`、`type` 三个字段均未修改，不需要重新测试，Save 直接可用
  - 任一字段修改后，`testResult` 重置为 null，Save 重新 disabled

#### 2.2.4 测试状态重置

当表单中 `base_url`、`api_key` 或 `type` 任一字段的值发生变化时，自动将 `testResult` 重置为 null。

#### 2.2.5 测试流程

1. 用户填写 base_url、api_key、type
2. 点击 Test Connection 按钮
3. 前端调用 `POST /providers/validate`
4. 成功：在按钮下方显示 "✓ Connection successful (234ms)"，Save 按钮变为可用
5. 失败：toast.error 显示具体错误信息（如"API Key 无效"、"连接超时"等）

#### 2.2.6 Test 按钮可用性

- `base_url` 和 `api_key` 非空时 Test 按钮才可点击
- 测试进行中按钮显示 loading 状态，不可重复点击

### 2.3 前端 API 层

在 `frontend/src/apis/providers.ts` 中新增：
```typescript
validate(data: { base_url: string; api_key: string; provider_type: string }): Promise<ValidateResult>
```

### 2.4 后端 Schema

在 `backend/app/schemas/provider.py` 中新增：
- `ProviderValidateRequest`：包含 `base_url`、`api_key`、`provider_type`
- `ProviderValidateResponse`：包含 `success`、可选 `latency_ms`、可选 `error`

## 3. 不在范围内

- 修改现有的 `test-model-dialog.tsx`（模型级测试保持不变）
- 修改后端现有的 `POST /providers/{id}/test` 端点
- 添加 Provider 的"草稿"状态
