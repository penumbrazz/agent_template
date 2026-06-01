# 模型元数据获取与管理

## 概述

在拉取模型列表时，同步获取模型的额外元数据（类型、最大上下文长度、最大输出长度），并在前端提供管理界面供用户查看和手动编辑。

## 背景

当前 `fetch-models` 仅获取模型 ID 列表，缺少模型能力相关的关键信息。用户需要知道每个模型是 LLM、VLM、Embedding 还是 Rerank，以及上下文长度限制，以便正确配置和使用模型。

## 数据库变更

### Migration 003：`llm_models` 表新增三列

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `model_type` | `VARCHAR(20)` | 非空，默认 `'llm'` | 模型类型：llm / vlm / embedding / rerank |
| `context_length` | `INTEGER` | 可为空 | 最大上下文长度（tokens） |
| `max_output_tokens` | `INTEGER` | 可为空 | 最大输出长度（tokens） |

### Python 枚举

```python
class ModelType(str, Enum):
    LLM = "llm"
    VLM = "vlm"
    EMBEDDING = "embedding"
    RERANK = "rerank"
```

## 拉取逻辑

### 流程

1. 用户触发 `fetch-models`，调用 `GET {base_url}/models` 获取模型 ID 列表
2. 对每个**新发现的模型**，并发调用 `GET {base_url}/models/{model_id}` 获取详细元数据
3. 从 API 响应中提取 `max_model_len` / `max_position_embeddings` 作为 `context_length`
4. 使用关键词匹配推断 `model_type`
5. 写入数据库时填充三个新字段

### 并发控制

- 使用 `asyncio.gather` + 信号量控制并发数（上限 10）
- 单次 `fetch-models` 总超时 30 秒

### 已有模型处理

- 已存在于数据库的模型**不覆盖**任何字段
- 仅对新模型执行元数据拉取和类型推断

### 模型类型自动推断

基于模型 ID 字符串的关键词匹配：

```python
def infer_model_type(model_id: str) -> ModelType:
    id_lower = model_id.lower()
    if any(kw in id_lower for kw in ["embed", "bge-", "e5-", "text-embedding", "dpr"]):
        return ModelType.EMBEDDING
    if any(kw in id_lower for kw in ["rerank", "reranker", "cross-encoder"]):
        return ModelType.RERANK
    if any(kw in id_lower for kw in ["vl-", "vlm", "vision", "visual", "qwen2-vl", "internvl", "cogvlm", "llava"]):
        return ModelType.VLM
    return ModelType.LLM
```

用户可在前端手动覆盖自动推断结果。

### max_output_tokens

从 API 响应中尝试提取。若 API 不返回此字段，则设为 `null`，用户可手动填写。

## API 变更

### Schema

`ModelRead`、`ModelCreate`、`ModelUpdate` 均新增：
- `model_type: ModelType`
- `context_length: int | None`
- `max_output_tokens: int | None`

### 接口

| 接口 | 变更 |
|------|------|
| `POST /api/providers/{id}/fetch-models` | 内部逻辑增加元数据拉取，返回值不变 |
| `PATCH /api/models/{id}` | 支持更新 `model_type`、`context_length`、`max_output_tokens` |

## UI 变更

### 模型列表页（`model-config.tsx`）

- 每个模型行右侧，启用开关旁边新增设置按钮（齿轮图标）
- 点击打开模型设置对话框

### 模型设置对话框（新增 `model-settings-dialog.tsx`）

| 字段 | 控件 | 说明 |
|------|------|------|
| 模型类型 | 下拉选择（LLM / VLM / Embedding / Rerank） | 默认为自动推断值 |
| 最大上下文长度 | 数字输入框，单位 tokens | placeholder: "从 API 自动获取" |
| 最大输出长度 | 数字输入框，单位 tokens | placeholder: "可选" |
| 模型 ID | 只读文本 | 不可编辑 |
| 显示名称 | 文本输入 | 保留现有编辑能力 |

### 交互流程

1. 点击设置按钮 → 打开对话框，加载当前数据库值
2. 修改字段 → 点击保存 → 调用 `PATCH /api/models/{id}` → 刷新列表
3. `fetch-models` 完成后 → 自动刷新模型列表

## 范围外（未来迭代）

- `extra_config`（聊天模板参数，如 thinking 设置）
- 上下文预算压缩策略
- 模型能力检测（function calling、streaming 支持等）
