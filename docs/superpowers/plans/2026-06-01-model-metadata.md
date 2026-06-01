# Model Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add model type, context length, and max output tokens metadata to LLM models — fetched from remote API during fetch-models and editable via a settings dialog in the UI.

**Architecture:** Three new columns on `llm_models` table. Backend `fetch_models()` enhanced to call `GET /models/{id}` for each new model and infer type from model ID keywords. Frontend gets a settings button per model row that opens a dialog for editing the three fields.

**Tech Stack:** SQLAlchemy (ORM + Alembic), FastAPI (Pydantic schemas), React + TypeScript (shadcn/ui components), Tailwind CSS.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `backend/alembic/versions/005_add_model_metadata.py` | Migration adding 3 columns |
| Modify | `backend/app/models/llm_model.py` | Add `model_type`, `context_length`, `max_output_tokens` columns |
| Create | `backend/app/services/model_metadata.py` | `infer_model_type()`, `fetch_model_metadata()` helpers |
| Modify | `backend/app/schemas/llm_model.py` | Add new fields to `ModelCreate`, `ModelUpdate`, `ModelRead` |
| Modify | `backend/app/services/provider.py:162-208` | `fetch_models()` calls metadata fetch for new models |
| Modify | `backend/app/services/llm_model.py` | `to_read()` includes new fields |
| Modify | `backend/tests/test_provider.py` | Update fetch-models mock to cover metadata |
| Create | `backend/tests/test_model_metadata.py` | Unit tests for `infer_model_type`, `fetch_model_metadata` |
| Modify | `frontend/src/types/model.ts` | Add new fields to interfaces |
| Modify | `frontend/src/apis/models.ts` | No change needed (update already uses `ModelUpdate`) |
| Modify | `frontend/src/components/settings/model-config.tsx` | Add settings button per model row |
| Create | `frontend/src/components/settings/model-settings-dialog.tsx` | Settings dialog for editing metadata |
| Modify | `frontend/src/i18n/locales/zh-CN.ts` | Add model settings i18n keys |
| Modify | `frontend/src/i18n/locales/en.ts` | Add model settings i18n keys |

---

### Task 1: Database Migration — Add Model Metadata Columns

**Files:**
- Create: `backend/alembic/versions/005_add_model_metadata.py`
- Modify: `backend/app/models/llm_model.py`

- [ ] **Step 1: Update ORM model**

Add `model_type`, `context_length`, `max_output_tokens` to `LLMModel` in `backend/app/models/llm_model.py`:

```python
from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

# String length constants
PROVIDER_ID_MAX_LENGTH = 36
MODEL_ID_MAX_LENGTH = 200
MODEL_DISPLAY_NAME_MAX_LENGTH = 200
MODEL_TYPE_MAX_LENGTH = 20


class LLMModel(TimestampMixin, Base):
    __tablename__ = "llm_models"

    provider_id: Mapped[str] = mapped_column(
        String(PROVIDER_ID_MAX_LENGTH),
        ForeignKey("providers.id", ondelete="CASCADE"),
        nullable=False,
    )
    model_id: Mapped[str] = mapped_column(String(MODEL_ID_MAX_LENGTH), nullable=False)
    display_name: Mapped[str | None] = mapped_column(
        String(MODEL_DISPLAY_NAME_MAX_LENGTH), nullable=True
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    extra_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    model_type: Mapped[str] = mapped_column(
        String(MODEL_TYPE_MAX_LENGTH), nullable=False, server_default="llm"
    )
    context_length: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)

    provider: Mapped["Provider"] = relationship("Provider", back_populates="models")
```

- [ ] **Step 2: Create Alembic migration**

Create `backend/alembic/versions/005_add_model_metadata.py`:

```python
"""add model metadata columns

Revision ID: 005
Revises: 004
Create Date: 2026-06-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '005'
down_revision: Union[str, Sequence[str], None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "llm_models",
        sa.Column("model_type", sa.String(20), nullable=False, server_default="llm"),
    )
    op.add_column(
        "llm_models",
        sa.Column("context_length", sa.Integer(), nullable=True),
    )
    op.add_column(
        "llm_models",
        sa.Column("max_output_tokens", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("llm_models", "max_output_tokens")
    op.drop_column("llm_models", "context_length")
    op.drop_column("llm_models", "model_type")
```

- [ ] **Step 3: Run tests to verify nothing breaks**

Run: `cd /Users/zhourenkang/Workspace/daydream/agent_template/backend && uv run pytest tests/test_llm_model.py tests/test_provider.py -v`
Expected: All existing tests PASS (tables auto-created from ORM in test SQLite).

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/llm_model.py backend/alembic/versions/005_add_model_metadata.py
git commit -m "feat(backend): add model_type, context_length, max_output_tokens columns"
```

---

### Task 2: Backend Model Metadata Service

**Files:**
- Create: `backend/app/services/model_metadata.py`
- Create: `backend/tests/test_model_metadata.py`

- [ ] **Step 1: Write tests for `infer_model_type`**

Create `backend/tests/test_model_metadata.py`:

```python
from app.services.model_metadata import infer_model_type


class TestInferModelType:
    def test_llm_default(self):
        assert infer_model_type("gpt-4o") == "llm"
        assert infer_model_type("claude-sonnet-4-20250514") == "llm"
        assert infer_model_type("deepseek-chat") == "llm"
        assert infer_model_type("qwen2.5-72b-instruct") == "llm"

    def test_vlm_detection(self):
        assert infer_model_type("gpt-4o-vision") == "vlm"
        assert infer_model_type("qwen2-vl-72b") == "vlm"
        assert infer_model_type("internvl2-26b") == "vlm"
        assert infer_model_type("llava-v1.6") == "vlm"
        assert infer_model_type("cogvlm2-19b") == "vlm"
        assert infer_model_type("minicpm-v-2_6") == "vlm"

    def test_embedding_detection(self):
        assert infer_model_type("text-embedding-3-small") == "embedding"
        assert infer_model_type("bge-large-zh") == "embedding"
        assert infer_model_type("e5-large-v2") == "embedding"
        assert infer_model_type("bge-m3") == "embedding"

    def test_rerank_detection(self):
        assert infer_model_type("bge-reranker-v2-m3") == "rerank"
        assert infer_model_type("cross-encoder-ms-marco-MiniLM-L-6-v2") == "rerank"
        assert infer_model_type("cohere-rerank-v3") == "rerank"

    def test_case_insensitive(self):
        assert infer_model_type("BGE-Large") == "embedding"
        assert infer_model_type("Rerank-V2") == "rerank"
        assert infer_model_type("Qwen2-VL-72B") == "vlm"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/zhourenkang/Workspace/daydream/agent_template/backend && uv run pytest tests/test_model_metadata.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.model_metadata'`

- [ ] **Step 3: Implement `model_metadata.py`**

Create `backend/app/services/model_metadata.py`:

```python
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_EMBEDDING_KEYWORDS = ("embed", "bge-", "e5-", "text-embedding", "dpr")
_RERANK_KEYWORDS = ("rerank", "reranker", "cross-encoder")
_VLM_KEYWORDS = ("vl-", "vlm", "vision", "visual", "qwen2-vl", "internvl", "cogvlm", "llava")


def infer_model_type(model_id: str) -> str:
    """Infer model type from model ID using keyword matching."""
    id_lower = model_id.lower()
    if any(kw in id_lower for kw in _EMBEDDING_KEYWORDS):
        return "embedding"
    if any(kw in id_lower for kw in _RERANK_KEYWORDS):
        return "rerank"
    if any(kw in id_lower for kw in _VLM_KEYWORDS):
        return "vlm"
    return "llm"


def fetch_model_metadata(
    client: httpx.Client,
    base_url: str,
    headers: dict[str, str],
    model_id: str,
) -> dict[str, Any]:
    """Fetch metadata for a single model from the remote API.

    Returns a dict with keys: model_type, context_length, max_output_tokens.
    Falls back gracefully on errors.
    """
    result: dict[str, Any] = {
        "model_type": infer_model_type(model_id),
        "context_length": None,
        "max_output_tokens": None,
    }
    try:
        resp = client.get(f"{base_url}/models/{model_id}", headers=headers)
        resp.raise_for_status()
        data = resp.json()

        # Extract context_length from various possible response fields
        meta = data.get("meta", {}) or {}
        root = data.get("root", "") or model_id
        model_info = meta.get("model_info", {}) or data

        for field in ("max_model_len", "max_position_embeddings", "context_length", "max_context_length"):
            val = model_info.get(field)
            if val is not None:
                result["context_length"] = int(val)
                break

        # Extract max_output_tokens
        for field in ("max_tokens", "max_output_tokens"):
            val = model_info.get(field)
            if val is not None:
                result["max_output_tokens"] = int(val)
                break
    except Exception:
        logger.debug("Failed to fetch metadata for model %s", model_id, exc_info=True)

    return result
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/zhourenkang/Workspace/daydream/agent_template/backend && uv run pytest tests/test_model_metadata.py -v`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/model_metadata.py backend/tests/test_model_metadata.py
git commit -m "feat(backend): add model metadata inference and fetch service"
```

---

### Task 3: Integrate Metadata Into `fetch_models()`

**Files:**
- Modify: `backend/app/services/provider.py:162-208`
- Modify: `backend/tests/test_provider.py`

- [ ] **Step 1: Write test for fetch-models with metadata**

Add to `backend/tests/test_provider.py` in the `TestProviderFetchModels` class:

```python
@patch("app.services.provider.httpx.Client")
def test_fetch_models_with_metadata(self, mock_client_cls, admin_user, client):
    create_resp = client.post(
        "/api/providers",
        headers=admin_user,
        json={
            "name": "OpenAI",
            "type": "openai_compatible",
            "base_url": "https://api.openai.com",
            "api_key": "sk-test-key-1234567890",
        },
    )
    provider_id = create_resp.json()["id"]

    # Mock list response
    list_resp = MagicMock()
    list_resp.json.return_value = {
        "data": [
            {"id": "gpt-4o"},
            {"id": "text-embedding-3-small"},
        ]
    }
    list_resp.raise_for_status = MagicMock()

    # Mock detail responses
    detail_resp_gpt4o = MagicMock()
    detail_resp_gpt4o.json.return_value = {
        "id": "gpt-4o",
        "max_model_len": 128000,
        "max_tokens": 16384,
    }
    detail_resp_gpt4o.raise_for_status = MagicMock()

    detail_resp_embed = MagicMock()
    detail_resp_embed.json.return_value = {
        "id": "text-embedding-3-small",
        "max_model_len": 8191,
    }
    detail_resp_embed.raise_for_status = MagicMock()

    mock_client = MagicMock()
    # First call = list, subsequent calls = detail per model
    mock_client.get.side_effect = [list_resp, detail_resp_gpt4o, detail_resp_embed]
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client_cls.return_value = mock_client

    resp = client.post(
        f"/api/providers/{provider_id}/fetch-models", headers=admin_user
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["fetched"] == 2

    # Verify models have metadata
    models_resp = client.get("/api/models/all", headers=admin_user)
    models = models_resp.json()
    gpt4o = next(m for m in models if m["model_id"] == "gpt-4o")
    embed = next(m for m in models if m["model_id"] == "text-embedding-3-small")

    assert gpt4o["model_type"] == "llm"
    assert gpt4o["context_length"] == 128000
    assert gpt4o["max_output_tokens"] == 16384

    assert embed["model_type"] == "embedding"
    assert embed["context_length"] == 8191
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/zhourenkang/Workspace/daydream/agent_template/backend && uv run pytest tests/test_provider.py::TestProviderFetchModels::test_fetch_models_with_metadata -v`
Expected: FAIL — models won't have metadata fields yet.

- [ ] **Step 3: Update `fetch_models()` in `backend/app/services/provider.py`**

Replace the `fetch_models` function (lines 162-208) with:

```python
from app.services.model_metadata import fetch_model_metadata


def fetch_models(db: Session, provider: Provider) -> list[LLMModel]:
    """Fetch models from a remote provider and sync with the database.

    Adds newly discovered models with metadata, removes models no longer
    available remotely, and clears the default model setting if it becomes
    unavailable.

    Args:
        db: The database session.
        provider: The provider whose remote models to fetch.

    Returns:
        A list of newly created LLMModel instances.
    """
    decrypted_key = decrypt_api_key(provider.encrypted_api_key)
    base_url = _normalize_base_url(provider.base_url)
    headers = _build_headers(decrypted_key, provider.type)

    client = _get_http_client()
    resp = client.get(f"{base_url}{_models_path()}", headers=headers)
    resp.raise_for_status()

    remote_ids = set(m["id"] for m in resp.json().get("data", []))

    existing_models = (
        db.query(LLMModel).filter(LLMModel.provider_id == provider.id).all()
    )
    existing_ids = {m.model_id for m in existing_models}

    for model in existing_models:
        if model.model_id not in remote_ids:
            db.delete(model)

    remaining_model_ids = {m.id for m in existing_models if m.model_id in remote_ids}
    clear_default_model_if_unavailable(db, remaining_model_ids)

    new_ids = remote_ids - existing_ids
    new_models = []
    for mid in new_ids:
        metadata = fetch_model_metadata(client, base_url, headers, mid)
        model = LLMModel(
            provider_id=provider.id,
            model_id=mid,
            is_enabled=False,
            model_type=metadata["model_type"],
            context_length=metadata["context_length"],
            max_output_tokens=metadata["max_output_tokens"],
        )
        db.add(model)
        new_models.append(model)

    db.commit()
    for m in new_models:
        db.refresh(m)
    return new_models
```

- [ ] **Step 4: Run all provider + model tests**

Run: `cd /Users/zhourenkang/Workspace/daydream/agent_template/backend && uv run pytest tests/test_provider.py tests/test_llm_model.py tests/test_model_metadata.py -v`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/provider.py backend/tests/test_provider.py
git commit -m "feat(backend): integrate metadata fetch into fetch_models"
```

---

### Task 4: Update Schemas and Service Layer

**Files:**
- Modify: `backend/app/schemas/llm_model.py`
- Modify: `backend/app/services/llm_model.py`

- [ ] **Step 1: Update Pydantic schemas**

Update `backend/app/schemas/llm_model.py`:

```python
from datetime import datetime

from pydantic import BaseModel, Field


class ModelCreate(BaseModel):
    provider_id: str = Field(..., min_length=1)
    model_id: str = Field(..., min_length=1, max_length=200)
    display_name: str | None = Field(None, max_length=200)
    extra_config: dict | None = None
    model_type: str = Field("llm", max_length=20)
    context_length: int | None = None
    max_output_tokens: int | None = None


class ModelUpdate(BaseModel):
    model_id: str | None = Field(None, min_length=1, max_length=200)
    display_name: str | None = Field(None, max_length=200)
    extra_config: dict | None = None
    model_type: str | None = Field(None, max_length=20)
    context_length: int | None = None
    max_output_tokens: int | None = None


class ModelRead(BaseModel):
    id: str
    provider_id: str
    model_id: str
    display_name: str | None
    is_enabled: bool
    extra_config: dict | None
    model_type: str = "llm"
    context_length: int | None = None
    max_output_tokens: int | None = None
    provider_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ModelToggleResponse(BaseModel):
    id: str
    is_enabled: bool
```

- [ ] **Step 2: Update `to_read()` in `backend/app/services/llm_model.py`**

```python
def to_read(m: LLMModel) -> dict:
    """Convert an LLMModel ORM instance to a read-friendly dictionary."""
    return {
        "id": m.id,
        "provider_id": m.provider_id,
        "model_id": m.model_id,
        "display_name": m.display_name,
        "is_enabled": m.is_enabled,
        "extra_config": m.extra_config,
        "model_type": m.model_type,
        "context_length": m.context_length,
        "max_output_tokens": m.max_output_tokens,
        "provider_name": m.provider.name if m.provider else None,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }
```

- [ ] **Step 3: Run tests to verify**

Run: `cd /Users/zhourenkang/Workspace/daydream/agent_template/backend && uv run pytest tests/ -v`
Expected: All PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas/llm_model.py backend/app/services/llm_model.py
git commit -m "feat(backend): add model_type, context_length, max_output_tokens to schemas"
```

---

### Task 5: Frontend Types + API Layer

**Files:**
- Modify: `frontend/src/types/model.ts`

- [ ] **Step 1: Update TypeScript types**

Update `frontend/src/types/model.ts`:

```typescript
export type ModelType = 'llm' | 'vlm' | 'embedding' | 'rerank'

export interface LLMModel {
  id: string
  provider_id: string
  model_id: string
  display_name: string | null
  is_enabled: boolean
  extra_config: Record<string, unknown> | null
  model_type: ModelType
  context_length: number | null
  max_output_tokens: number | null
  provider_name: string | null
  created_at: string
  updated_at: string
}

export interface ModelCreate {
  provider_id: string
  model_id: string
  display_name?: string
  extra_config?: Record<string, unknown>
  model_type?: ModelType
  context_length?: number
  max_output_tokens?: number
}

export interface ModelUpdate {
  model_id?: string
  display_name?: string
  extra_config?: Record<string, unknown>
  model_type?: ModelType
  context_length?: number
  max_output_tokens?: number
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/model.ts
git commit -m "feat(frontend): add model metadata fields to TypeScript types"
```

---

### Task 6: Frontend i18n Keys

**Files:**
- Modify: `frontend/src/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/i18n/locales/en.ts`

- [ ] **Step 1: Add keys to zh-CN locale**

Add the following keys inside the `modelConfig` object in `frontend/src/i18n/locales/zh-CN.ts` (after `deleteModelFailed: '删除模型失败',`):

```typescript
      modelSettings: '模型设置',
      modelType: '模型类型',
      contextLength: '最大上下文长度',
      contextLengthPlaceholder: '从 API 自动获取',
      maxOutputTokens: '最大输出长度',
      maxOutputTokensPlaceholder: '可选',
      modelId: '模型 ID',
      save: '保存',
      saveSuccess: '模型设置已保存',
      saveFailed: '保存模型设置失败',
      typeLlm: 'LLM',
      typeVlm: 'VLM',
      typeEmbedding: 'Embedding',
      typeRerank: 'Rerank',
```

- [ ] **Step 2: Add keys to en locale**

Add the same keys inside the `modelConfig` object in `frontend/src/i18n/locales/en.ts`:

```typescript
      modelSettings: 'Model Settings',
      modelType: 'Model Type',
      contextLength: 'Max Context Length',
      contextLengthPlaceholder: 'Auto-fetched from API',
      maxOutputTokens: 'Max Output Tokens',
      maxOutputTokensPlaceholder: 'Optional',
      modelId: 'Model ID',
      save: 'Save',
      saveSuccess: 'Model settings saved',
      saveFailed: 'Failed to save model settings',
      typeLlm: 'LLM',
      typeVlm: 'VLM',
      typeEmbedding: 'Embedding',
      typeRerank: 'Rerank',
```

- [ ] **Step 3: Run i18n parity check**

Run: `cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend && npx tsx src/i18n/check-parity.ts`
Expected: No missing key errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/i18n/locales/zh-CN.ts frontend/src/i18n/locales/en.ts
git commit -m "feat(frontend): add model metadata i18n keys"
```

---

### Task 7: Model Settings Dialog Component

**Files:**
- Create: `frontend/src/components/settings/model-settings-dialog.tsx`

- [ ] **Step 1: Create the settings dialog**

Create `frontend/src/components/settings/model-settings-dialog.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type { LLMModel, ModelUpdate } from '@/types/model'
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
  const [modelType, setModelType] = useState(model?.model_type ?? 'llm')
  const [contextLength, setContextLength] = useState<string>(
    model?.context_length?.toString() ?? '',
  )
  const [maxOutputTokens, setMaxOutputTokens] = useState<string>(
    model?.max_output_tokens?.toString() ?? '',
  )
  const [loading, setLoading] = useState(false)
  const t = useT()

  useEffect(() => {
    if (model) {
      setModelType(model.model_type)
      setContextLength(model.context_length?.toString() ?? '')
      setMaxOutputTokens(model.max_output_tokens?.toString() ?? '')
    }
  }, [model])

  const handleSubmit = async () => {
    if (!model) return
    setLoading(true)
    try {
      const data: ModelUpdate = {
        model_type: modelType,
        context_length: contextLength ? parseInt(contextLength, 10) : null,
        max_output_tokens: maxOutputTokens
          ? parseInt(maxOutputTokens, 10)
          : null,
      }
      await modelsApi.update(model.id, data)
      toast.success(t('settings.modelConfig.saveSuccess'))
      onOpenChange(false)
      onSaved()
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : translate('settings.modelConfig.saveFailed')
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
            <Select value={modelType} onValueChange={setModelType}>
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/settings/model-settings-dialog.tsx
git commit -m "feat(frontend): add model settings dialog component"
```

---

### Task 8: Integrate Settings Button Into Model List

**Files:**
- Modify: `frontend/src/components/settings/model-config.tsx`

- [ ] **Step 1: Add imports and state**

At the top of `model-config.tsx`, add `Settings` to the lucide-react import and import `ModelSettingsDialog`:

```typescript
import { Plus, RefreshCw, Trash2, FlaskConical, Edit, Settings } from 'lucide-react'
import { ModelSettingsDialog } from './model-settings-dialog'
```

Inside the component, add state after the existing dialog states:

```typescript
const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
const [editingModel, setEditingModel] = useState<LLMModel | null>(null)
```

- [ ] **Step 2: Add settings button to each model row**

In the model row `<div>`, replace the single delete button with a group containing settings + delete. Change the action buttons area to:

```tsx
<div className="flex items-center gap-1">
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7"
    onClick={(e) => {
      e.stopPropagation()
      setEditingModel(m)
      setSettingsDialogOpen(true)
    }}
    data-testid={`settings-model-${m.id}`}
  >
    <Settings className="h-3.5 w-3.5" />
  </Button>
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7 text-text-muted hover:text-error"
    onClick={(e) => {
      e.stopPropagation()
      handleDeleteModel(m.id)
    }}
    data-testid={`delete-model-${m.id}`}
  >
    <Trash2 className="h-3.5 w-3.5" />
  </Button>
</div>
```

- [ ] **Step 3: Add dialog to the render**

After the `<TestModelDialog>` component at the bottom of the JSX, add:

```tsx
<ModelSettingsDialog
  open={settingsDialogOpen}
  onOpenChange={setSettingsDialogOpen}
  model={editingModel}
  onSaved={mutateModels}
/>
```

- [ ] **Step 4: Run frontend build to verify**

Run: `cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend && npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/settings/model-config.tsx
git commit -m "feat(frontend): add settings button to model list rows"
```

---

### Task 9: Full Stack Integration Test

**Files:**
- Modify: `backend/tests/test_llm_model.py`

- [ ] **Step 1: Add test for updating model metadata via PATCH**

Add to `backend/tests/test_llm_model.py`:

```python
class TestModelUpdate:
    def test_update_metadata(self, admin_user, client):
        provider_id = _create_provider(client, admin_user)
        create_resp = client.post(
            "/api/models",
            headers=admin_user,
            json={"provider_id": provider_id, "model_id": "gpt-4o"},
        )
        model_id = create_resp.json()["id"]

        resp = client.put(
            f"/api/models/{model_id}",
            headers=admin_user,
            json={
                "model_type": "vlm",
                "context_length": 128000,
                "max_output_tokens": 16384,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["model_type"] == "vlm"
        assert data["context_length"] == 128000
        assert data["max_output_tokens"] == 16384

    def test_create_with_metadata(self, admin_user, client):
        provider_id = _create_provider(client, admin_user)
        resp = client.post(
            "/api/models",
            headers=admin_user,
            json={
                "provider_id": provider_id,
                "model_id": "text-embedding-3-small",
                "model_type": "embedding",
                "context_length": 8191,
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["model_type"] == "embedding"
        assert data["context_length"] == 8191
        assert data["max_output_tokens"] is None
```

- [ ] **Step 2: Run all backend tests**

Run: `cd /Users/zhourenkang/Workspace/daydream/agent_template/backend && uv run pytest tests/ -v`
Expected: All PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_llm_model.py
git commit -m "test(backend): add tests for model metadata CRUD"
```

---

### Task 10: Manual Smoke Test

- [ ] **Step 1: Start backend server**

Run: `cd /Users/zhourenkang/Workspace/daydream/agent_template/backend && uv run alembic upgrade head && uv run uvicorn app.main:app --reload`

- [ ] **Step 2: Start frontend dev server**

Run: `cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend && npm run dev`

- [ ] **Step 3: Verify in browser**

1. Open settings → Model Config
2. Create a provider or select existing
3. Click "Fetch Models" — verify models appear with metadata
4. Click the settings (gear) icon on a model
5. Change model type, context length, max output tokens
6. Save and verify values persist after page refresh
7. Verify the model type badge shows correctly in the list

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address smoke test issues"
```
