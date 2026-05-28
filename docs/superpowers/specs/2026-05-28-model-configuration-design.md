# 模型配置功能设计文档

## 概述

为 Agent Template 项目添加模型配置功能，允许管理员配置 LLM Provider（OpenAI 兼容 / Anthropic 兼容）和管理可用模型，普通用户可查看和使用已启用的模型。该功能服务于项目自身的 AI 对话场景。

## 数据库设计

### providers 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String(36) | PK | UUID |
| `name` | String(100) | NOT NULL | Provider 名称（如 "OpenAI"、"DeepSeek"） |
| `type` | String(20) | NOT NULL | `openai_compatible` 或 `anthropic_compatible` |
| `base_url` | String(500) | NOT NULL | API 端点 URL |
| `encrypted_api_key` | Text | NOT NULL | AES-256-GCM 加密后的 API Key |
| `is_active` | Boolean | DEFAULT TRUE | 是否启用 |
| `created_at` | DateTime(timezone=True) | NOT NULL | 创建时间（UTC） |
| `updated_at` | DateTime(timezone=True) | NOT NULL | 更新时间（UTC, onupdate） |

### models 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String(36) | PK | UUID |
| `provider_id` | String(36) | FK → providers.id, NOT NULL | 所属 Provider |
| `model_id` | String(200) | NOT NULL | 模型标识（如 `gpt-4o`） |
| `display_name` | String(200) | NULLABLE | 显示名称，为空则使用 model_id |
| `is_enabled` | Boolean | DEFAULT FALSE | 是否启用 |
| `extra_config` | JSON | NULLABLE | 额外配置（如 max_tokens、temperature 上限） |
| `created_at` | DateTime(timezone=True) | NOT NULL | 创建时间（UTC） |
| `updated_at` | DateTime(timezone=True) | NOT NULL | 更新时间（UTC, onupdate） |

约束：`UNIQUE(provider_id, model_id)`

### settings 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | String(36) | PK | UUID |
| `key` | String(100) | UNIQUE, NOT NULL | 设置键（如 `default_model_id`） |
| `value` | Text | NOT NULL | 设置值 |
| `updated_at` | DateTime(timezone=True) | NOT NULL | 更新时间（UTC） |

预置键：`default_model_id`（默认模型，值为 models 表的 id）

## API 端点设计

所有端点需要登录认证。写操作需管理员权限（`is_superuser=True`）。

### Provider 管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/providers` | 登录用户 | 列出所有 Provider（API Key 返回掩码） |
| POST | `/api/providers` | 管理员 | 创建 Provider |
| PUT | `/api/providers/{id}` | 管理员 | 更新 Provider |
| DELETE | `/api/providers/{id}` | 管理员 | 删除 Provider（级联删除关联模型） |
| POST | `/api/providers/{id}/fetch-models` | 管理员 | 从 Provider API 拉取模型列表 |
| POST | `/api/providers/{id}/test` | 管理员 | 测试 Provider 连通性 |

### Model 管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/models` | 登录用户 | 列出已启用的模型 |
| GET | `/api/models/all` | 管理员 | 列出所有模型 |
| POST | `/api/models` | 管理员 | 手动添加模型 |
| PUT | `/api/models/{id}` | 管理员 | 更新模型 |
| DELETE | `/api/models/{id}` | 管理员 | 删除模型 |
| PATCH | `/api/models/{id}/toggle` | 管理员 | 切换启用/禁用 |

### 通用设置

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/settings` | 登录用户 | 获取所有设置 |
| PUT | `/api/settings/{key}` | 管理员 | 更新设置 |

### Schema 定义

**ProviderCreate**: `name`, `type`（enum: openai_compatible/anthropic_compatible）, `base_url`, `api_key`

**ProviderUpdate**: 同 ProviderCreate，所有字段可选

**ProviderRead**: `id`, `name`, `type`, `base_url`, `api_key_masked`（如 `sk-****`）, `is_active`, `created_at`, `updated_at`

**ModelCreate**: `provider_id`, `model_id`, `display_name?`, `extra_config?`

**ModelUpdate**: 同 ModelCreate，所有字段可选

**ModelRead**: `id`, `provider_id`, `model_id`, `display_name`, `is_enabled`, `extra_config`, `provider_name`（关联查询）, `created_at`, `updated_at`

## 前端 UI 设计

### 设置面板入口

页面右上角添加设置按钮（齿轮图标），点击弹出设置面板。

### 设置面板布局

采用 Sheet/Drawer 组件，左侧导航 + 右侧内容区：

- **左侧导航**：通用设置、模型配置
- **右侧内容区**：当前选中项的编辑界面

### 模型配置页

1. **Provider 列表**：显示所有 Provider，点击选中展开模型列表
2. **添加 Provider**：弹出 Dialog，表单包含名称、类型（下拉）、Base URL、API Key（密码输入 + 显示/隐藏）
3. **Fetch 模型**：选中 Provider 后点击按钮，调用后端拉取模型，新模型默认未启用
4. **模型列表**：表格展示，包含模型名称、启用开关（Switch）、测试按钮、删除按钮
5. **手动添加模型**：弹出 Dialog，输入 model_id 和可选的 display_name
6. **测试连通性**：点击测试按钮 → 选择模型 → 后端发送简单 chat 请求 → 显示结果

### 通用设置页

- 默认模型：下拉选择（从已启用模型列表中选择）

### 前端组件

使用 shadcn/ui 组件库：Dialog、Sheet、Switch、Select、Button、Input、Table、Tabs、Tooltip。

## 技术实现要点

### 后端

1. **模型列表拉取**
   - OpenAI 兼容：`GET {base_url}/v1/models`，Header `Authorization: Bearer {api_key}`，解析 `data[].id`
   - Anthropic 兼容：`GET {base_url}/v1/models`，Header `x-api-key: {api_key}` + `anthropic-version: 2023-06-01`，解析 `data[].id`
   - 拉取结果与已有模型做 diff：新增的创建（`is_enabled=False`），已存在的不动

2. **连通性测试**
   - OpenAI 兼容：向 `{base_url}/v1/chat/completions` 发送 `{"model": model_id, "messages": [{"role": "user", "content": "Hi"}], "max_tokens": 5}`
   - Anthropic 兼容：向 `{base_url}/v1/messages` 发送 `{"model": model_id, "messages": [{"role": "user", "content": "Hi"}], "max_tokens": 5}`
   - 返回：`{"success": bool, "latency_ms": int, "error": str | null}`

3. **API Key 安全**
   - 使用 `shared/utils/crypto.py` 的 `encrypt()` / `decrypt()`
   - 加密密钥从环境变量 `ENCRYPTION_KEY` 读取
   - 返回前端时返回掩码版本（取前 3 位 + 后 4 位，中间用 `****` 替代）
   - 更新 Provider 时，如果 api_key 字段为空或等于掩码值，则不更新 API Key

4. **权限控制**
   - 激活已有的 User/Auth 脚手架代码
   - 创建 `get_current_user` 依赖（JWT token 解析）
   - 创建 `require_superuser` 依赖（检查 `is_superuser=True`）
   - DELETE Provider 时级联删除关联的 models

5. **Alembic 迁移**
   - 创建新的迁移文件添加 providers、models、settings 三张表
   - 首次迁移也包含已有的 users 表

### 前端

1. **shadcn/ui 组件安装**：Dialog、Sheet、Switch、Select、Button、Input、Table、Tabs、Tooltip、DropdownMenu
2. **数据获取**：使用 SWR 或 TanStack Query 管理数据获取和缓存
3. **API 客户端**：复用已有的 `frontend/src/apis/client.ts`，添加认证 token header
4. **响应式**：弹窗宽度自适应，移动端考虑全屏

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| Provider 连接失败 | 显示具体错误（网络错误、认证失败、超时） |
| 模型拉取失败 | 提示检查 URL 和 API Key |
| 重复模型 | Fetch 时已存在的模型跳过，不报错 |
| API Key 解密失败 | 提示系统配置错误，联系管理员 |
| 删除含已启用模型的 Provider | 级联删除所有关联模型 |
| 测试未启用模型 | 允许测试，不限制 |
| 默认模型被禁用/删除 | 自动清除默认模型设置 |

## 范围边界

本次只做模型配置管理功能，**不包含**：
- AI 对话/聊天界面的实现
- 模型的实际调用（对话生成）
- 更细粒度的模型参数配置（temperature、top_p 等）
- 模型用量统计和计费
- 多语言支持
