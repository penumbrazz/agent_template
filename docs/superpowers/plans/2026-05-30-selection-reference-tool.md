# 圈选引用工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 chat panel 中实现可配置的圈选引用工具，默认以语义上下文生成 attachment chip，并为截图证据源、ECharts 点位提取和后续上下文压缩预留边界。

**Architecture:** 将功能拆成 Selection Capture、Extractor Registry、Chat Attachment Layer 和配置读取四层。圈选手势只产生几何数据，extractor 根据服务端 policy 提取 DOM/Table/ECharts/截图 artifact，chat 输入区只显示引用 chip，不把长上下文写入 textarea。

**Tech Stack:** Next.js 15、React 19、TypeScript strict mode、Tailwind CSS、`DESIGN.md` token、`lucide-react`、Jest、Playwright、ECharts adapter/registry。

---

## 参考规格

- 设计规格：`docs/superpowers/specs/2026-05-30-selection-reference-tool-design.md`
- 项目准则：`AGENTS.md` 的“圈选引用工具”小节
- 现有 chat panel：`frontend/src/features/agent-chat/agent-chat-panel.tsx`
- 现有 chat 状态：`frontend/src/features/agent-chat/use-agent-chat-state.ts`
- 现有 E2E：`frontend/e2e/agent-chat-panel.spec.ts`

## 文件结构

- 创建 `frontend/src/features/selection-context/types.ts`：定义 policy、geometry、artifact、attachment 类型。
- 创建 `frontend/src/features/selection-context/policy.ts`：读取和归一化服务端 selection policy。
- 创建 `frontend/src/features/selection-context/geometry.ts`：提供 bounding box、点在多边形内、点到路径距离等纯函数。
- 创建 `frontend/src/features/selection-context/extractors/registry.ts`：按 policy 调度 extractor。
- 创建 `frontend/src/features/selection-context/extractors/dom-extractor.ts`：提取普通 DOM 语义。
- 创建 `frontend/src/features/selection-context/extractors/table-extractor.ts`：提取表格行列语义。
- 创建 `frontend/src/features/selection-context/extractors/echarts-registry.ts`：维护可圈选 ECharts 实例注册表。
- 创建 `frontend/src/features/selection-context/extractors/echarts-extractor.ts`：提取 ECharts series 和命中点位。
- 创建 `frontend/src/features/selection-context/extractors/screenshot-extractor.ts`：按 policy 生成截图 artifact，第一版可只实现资源引用边界。
- 创建 `frontend/src/features/selection-context/use-selection-overlay.ts`：管理圈选模式、路径采集、取消和提交。
- 创建 `frontend/src/features/selection-context/selection-overlay.tsx`：全局透明 overlay 和路径显示。
- 创建 `frontend/src/features/agent-chat/attachment-chip.tsx`：显示、删除、预览引用 chip。
- 修改 `frontend/src/features/agent-chat/types.ts`：扩展消息和发送 payload，支持 attachments。
- 修改 `frontend/src/features/agent-chat/use-agent-chat-state.ts`：发送消息时携带 attachments，发送后清空 pending attachments。
- 修改 `frontend/src/features/agent-chat/agent-chat-panel.tsx`：增加圈选按钮、attachment chip 区域和 overlay 挂载。
- 修改 `frontend/src/lib/runtime-config.ts`：把 selection policy 加入 runtime config。
- 修改 `frontend/src/app/runtime-config/route.ts`：暴露 selection policy。
- 修改 `frontend/src/i18n/locales/zh-CN.ts` 和 `frontend/src/i18n/locales/en.ts`：增加圈选工具文案。
- 创建 `frontend/src/features/selection-context/__tests__/geometry.test.ts`。
- 创建 `frontend/src/features/selection-context/__tests__/policy.test.ts`。
- 创建 `frontend/src/features/selection-context/__tests__/registry.test.ts`。
- 创建 `frontend/src/features/selection-context/__tests__/echarts-extractor.test.ts`。
- 修改 `frontend/e2e/agent-chat-panel.spec.ts`：增加圈选引用 E2E。

## 统一类型和测试 ID

实现中必须使用这些测试 ID：

```ts
export const SELECTION_TEST_IDS = {
  toolButton: 'selection-tool-button',
  overlay: 'selection-overlay',
  hint: 'selection-overlay-hint',
  path: 'selection-overlay-path',
  attachmentList: 'agent-chat-attachment-list',
  attachmentChip: 'agent-chat-attachment-chip',
  attachmentRemove: 'agent-chat-attachment-remove',
  attachmentPreview: 'agent-chat-attachment-preview',
}
```

服务端 policy 默认值必须是：

```ts
export const DEFAULT_SELECTION_CONTEXT_POLICY = {
  mode: 'semantic',
  screenshotPolicy: 'never',
  screenshotDelivery: 'reference_only',
} as const
```

## Task 1: 建立 selection-context 类型和 policy

**Files:**
- Create: `frontend/src/features/selection-context/types.ts`
- Create: `frontend/src/features/selection-context/policy.ts`
- Modify: `frontend/src/lib/runtime-config.ts`
- Modify: `frontend/src/app/runtime-config/route.ts`
- Test: `frontend/src/features/selection-context/__tests__/policy.test.ts`

- [ ] **Step 1: 编写 policy 单测**

创建 `frontend/src/features/selection-context/__tests__/policy.test.ts`：

```ts
import {
  DEFAULT_SELECTION_CONTEXT_POLICY,
  normalizeSelectionContextPolicy,
} from '../policy'

describe('normalizeSelectionContextPolicy', () => {
  it('returns semantic defaults for missing input', () => {
    expect(normalizeSelectionContextPolicy(undefined)).toEqual(
      DEFAULT_SELECTION_CONTEXT_POLICY,
    )
  })

  it('accepts a valid hybrid policy', () => {
    expect(
      normalizeSelectionContextPolicy({
        mode: 'hybrid',
        screenshotPolicy: 'on_extractor_miss',
        screenshotDelivery: 'reference_only',
      }),
    ).toEqual({
      mode: 'hybrid',
      screenshotPolicy: 'on_extractor_miss',
      screenshotDelivery: 'reference_only',
    })
  })

  it('rejects invalid inline screenshot settings by falling back to defaults', () => {
    expect(
      normalizeSelectionContextPolicy({
        mode: 'semantic',
        screenshotPolicy: 'always',
        screenshotDelivery: 'inline_image',
      }),
    ).toEqual(DEFAULT_SELECTION_CONTEXT_POLICY)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd frontend && npm run test -- selection-context/__tests__/policy.test.ts
```

Expected: FAIL，提示找不到 `../policy`。

- [ ] **Step 3: 创建类型定义**

创建 `frontend/src/features/selection-context/types.ts`：

```ts
export type SelectionContextMode = 'semantic' | 'screenshot' | 'hybrid'

export type ScreenshotPolicy = 'never' | 'on_extractor_miss' | 'always'

export type ScreenshotDelivery = 'reference_only' | 'inline_image'

export interface SelectionContextPolicy {
  mode: SelectionContextMode
  screenshotPolicy: ScreenshotPolicy
  screenshotDelivery: ScreenshotDelivery
}

export interface SelectionPoint {
  x: number
  y: number
}

export interface SelectionBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface SelectionGeometry {
  id: string
  path: SelectionPoint[]
  boundingBox: SelectionBoundingBox
  viewport: {
    width: number
    height: number
    scrollX: number
    scrollY: number
  }
  createdAt: string
}

export type SelectionArtifactKind = 'dom' | 'table' | 'chart' | 'screenshot'

export interface SelectionArtifactBase {
  id: string
  kind: SelectionArtifactKind
  label: string
  geometry: SelectionGeometry
  summary: string
}

export interface DomSelectionArtifact extends SelectionArtifactBase {
  kind: 'dom'
  text: string
  testIds: string[]
  roles: string[]
}

export interface TableSelectionArtifact extends SelectionArtifactBase {
  kind: 'table'
  tableTitle?: string
  columns: string[]
  rows: Array<Record<string, string>>
}

export interface ChartSelectionArtifact extends SelectionArtifactBase {
  kind: 'chart'
  chartTitle: string
  chartTestId?: string
  selectedSeries: Array<{
    name: string
    points: Array<{
      x: string | number
      y: number
      label?: string
      raw?: unknown
    }>
  }>
  xRange?: { min: string | number; max: string | number }
}

export interface ScreenshotSelectionArtifact extends SelectionArtifactBase {
  kind: 'screenshot'
  resourceId: string
  delivery: ScreenshotDelivery
}

export type SelectionArtifact =
  | DomSelectionArtifact
  | TableSelectionArtifact
  | ChartSelectionArtifact
  | ScreenshotSelectionArtifact

export interface ChatAttachment {
  id: string
  label: string
  artifact: SelectionArtifact
}
```

- [ ] **Step 4: 创建 policy 归一化实现**

创建 `frontend/src/features/selection-context/policy.ts`：

```ts
import type { SelectionContextPolicy } from './types'

export const DEFAULT_SELECTION_CONTEXT_POLICY: SelectionContextPolicy = {
  mode: 'semantic',
  screenshotPolicy: 'never',
  screenshotDelivery: 'reference_only',
}

const VALID_MODES = new Set(['semantic', 'screenshot', 'hybrid'])
const VALID_SCREENSHOT_POLICIES = new Set([
  'never',
  'on_extractor_miss',
  'always',
])
const VALID_SCREENSHOT_DELIVERIES = new Set(['reference_only', 'inline_image'])

export function normalizeSelectionContextPolicy(
  value: unknown,
): SelectionContextPolicy {
  if (!value || typeof value !== 'object') {
    return DEFAULT_SELECTION_CONTEXT_POLICY
  }

  const candidate = value as Partial<SelectionContextPolicy>
  const hasValidShape =
    VALID_MODES.has(String(candidate.mode)) &&
    VALID_SCREENSHOT_POLICIES.has(String(candidate.screenshotPolicy)) &&
    VALID_SCREENSHOT_DELIVERIES.has(String(candidate.screenshotDelivery))

  if (!hasValidShape) {
    return DEFAULT_SELECTION_CONTEXT_POLICY
  }

  if (
    candidate.mode === 'semantic' &&
    (candidate.screenshotPolicy !== 'never' ||
      candidate.screenshotDelivery !== 'reference_only')
  ) {
    return DEFAULT_SELECTION_CONTEXT_POLICY
  }

  return {
    mode: candidate.mode,
    screenshotPolicy: candidate.screenshotPolicy,
    screenshotDelivery: candidate.screenshotDelivery,
  }
}
```

- [ ] **Step 5: 扩展 runtime config**

修改 `frontend/src/lib/runtime-config.ts`，增加 `selectionContextPolicy`：

```ts
import {
  DEFAULT_SELECTION_CONTEXT_POLICY,
  normalizeSelectionContextPolicy,
} from '@/features/selection-context/policy'
import type { SelectionContextPolicy } from '@/features/selection-context/types'

export interface RuntimeConfig {
  apiUrl: string
  otelEnabled: boolean
  otelServiceName: string
  otelCollectorEndpoint: string
  appVersion: string
  selectionContextPolicy: SelectionContextPolicy
}

const defaultConfig: RuntimeConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  otelEnabled: process.env.NEXT_PUBLIC_OTEL_ENABLED === 'true',
  otelServiceName:
    process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME || 'agent-template-frontend',
  otelCollectorEndpoint:
    process.env.NEXT_PUBLIC_OTEL_COLLECTOR_ENDPOINT || 'http://localhost:4318',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
  selectionContextPolicy: normalizeSelectionContextPolicy(
    process.env.NEXT_PUBLIC_SELECTION_CONTEXT_POLICY
      ? JSON.parse(process.env.NEXT_PUBLIC_SELECTION_CONTEXT_POLICY)
      : DEFAULT_SELECTION_CONTEXT_POLICY,
  ),
}
```

如果直接 `JSON.parse` 会让无效环境变量导致启动失败，改用安全解析：

```ts
function parseSelectionPolicyFromEnv(): SelectionContextPolicy {
  const raw = process.env.NEXT_PUBLIC_SELECTION_CONTEXT_POLICY
  if (!raw) {
    return DEFAULT_SELECTION_CONTEXT_POLICY
  }

  try {
    return normalizeSelectionContextPolicy(JSON.parse(raw))
  } catch {
    return DEFAULT_SELECTION_CONTEXT_POLICY
  }
}
```

然后 `defaultConfig.selectionContextPolicy` 使用 `parseSelectionPolicyFromEnv()`。

- [ ] **Step 6: 暴露 runtime policy**

修改 `frontend/src/app/runtime-config/route.ts`，返回值增加：

```ts
selectionContextPolicy: config.selectionContextPolicy,
```

- [ ] **Step 7: 运行测试**

Run:

```bash
cd frontend && npm run test -- selection-context/__tests__/policy.test.ts
```

Expected: PASS。

- [ ] **Step 8: 提交**

```bash
git add frontend/src/features/selection-context/types.ts \
  frontend/src/features/selection-context/policy.ts \
  frontend/src/features/selection-context/__tests__/policy.test.ts \
  frontend/src/lib/runtime-config.ts \
  frontend/src/app/runtime-config/route.ts
git commit -m "feat(frontend): add selection context policy"
```

## Task 2: 实现几何工具和 extractor registry

**Files:**
- Create: `frontend/src/features/selection-context/geometry.ts`
- Create: `frontend/src/features/selection-context/extractors/registry.ts`
- Test: `frontend/src/features/selection-context/__tests__/geometry.test.ts`
- Test: `frontend/src/features/selection-context/__tests__/registry.test.ts`

- [ ] **Step 1: 编写几何单测**

创建 `frontend/src/features/selection-context/__tests__/geometry.test.ts`：

```ts
import {
  calculateBoundingBox,
  distanceToPath,
  isPointInPolygon,
} from '../geometry'

describe('selection geometry', () => {
  it('calculates bounding box for a path', () => {
    expect(
      calculateBoundingBox([
        { x: 10, y: 20 },
        { x: 30, y: 5 },
        { x: 25, y: 45 },
      ]),
    ).toEqual({ x: 10, y: 5, width: 20, height: 40 })
  })

  it('detects points inside a polygon', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ]

    expect(isPointInPolygon({ x: 10, y: 10 }, square)).toBe(true)
    expect(isPointInPolygon({ x: 30, y: 10 }, square)).toBe(false)
  })

  it('computes distance from point to path', () => {
    expect(
      Math.round(distanceToPath({ x: 5, y: 5 }, [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ])),
    ).toBe(5)
  })
})
```

- [ ] **Step 2: 编写 registry 单测**

创建 `frontend/src/features/selection-context/__tests__/registry.test.ts`：

```ts
import { createExtractorRegistry } from '../extractors/registry'
import type { SelectionArtifact, SelectionGeometry } from '../types'

const geometry: SelectionGeometry = {
  id: 'selection-1',
  path: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ],
  boundingBox: { x: 0, y: 0, width: 10, height: 10 },
  viewport: { width: 100, height: 100, scrollX: 0, scrollY: 0 },
  createdAt: '2026-05-30T00:00:00.000Z',
}

describe('createExtractorRegistry', () => {
  it('runs only semantic extractors in semantic mode', async () => {
    const artifact: SelectionArtifact = {
      id: 'artifact-1',
      kind: 'dom',
      label: '文本区域',
      geometry,
      summary: '文本区域',
      text: 'hello',
      testIds: [],
      roles: [],
    }
    const registry = createExtractorRegistry([
      {
        kind: 'dom',
        extract: jest.fn().mockResolvedValue([artifact]),
      },
      {
        kind: 'screenshot',
        extract: jest.fn().mockResolvedValue([]),
      },
    ])

    const result = await registry.extract(geometry, {
      mode: 'semantic',
      screenshotPolicy: 'never',
      screenshotDelivery: 'reference_only',
    })

    expect(result).toEqual([artifact])
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

Run:

```bash
cd frontend && npm run test -- selection-context/__tests__/geometry.test.ts selection-context/__tests__/registry.test.ts
```

Expected: FAIL，提示找不到 `geometry` 和 `registry`。

- [ ] **Step 4: 实现几何工具**

创建 `frontend/src/features/selection-context/geometry.ts`：

```ts
import type {
  SelectionBoundingBox,
  SelectionPoint,
} from './types'

export function calculateBoundingBox(
  path: SelectionPoint[],
): SelectionBoundingBox {
  const xs = path.map((point) => point.x)
  const ys = path.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function isPointInPolygon(
  point: SelectionPoint,
  polygon: SelectionPoint[],
): boolean {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index]
    const previousPoint = polygon[previous]
    const crossesY =
      currentPoint.y > point.y !== previousPoint.y > point.y
    const xOnSegment =
      ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
        (previousPoint.y - currentPoint.y) +
      currentPoint.x

    if (crossesY && point.x < xOnSegment) {
      inside = !inside
    }
  }
  return inside
}

export function distanceToPath(
  point: SelectionPoint,
  path: SelectionPoint[],
): number {
  if (path.length < 2) {
    return Number.POSITIVE_INFINITY
  }

  return Math.min(
    ...path.slice(1).map((nextPoint, index) =>
      distanceToSegment(point, path[index], nextPoint),
    ),
  )
}

function distanceToSegment(
  point: SelectionPoint,
  start: SelectionPoint,
  end: SelectionPoint,
): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        lengthSquared,
    ),
  )
  const projected = { x: start.x + t * dx, y: start.y + t * dy }
  return Math.hypot(point.x - projected.x, point.y - projected.y)
}
```

- [ ] **Step 5: 实现 registry**

创建 `frontend/src/features/selection-context/extractors/registry.ts`：

```ts
import type {
  SelectionArtifact,
  SelectionArtifactKind,
  SelectionContextPolicy,
  SelectionGeometry,
} from '../types'

export interface SelectionExtractor {
  kind: SelectionArtifactKind
  extract: (geometry: SelectionGeometry) => Promise<SelectionArtifact[]>
}

export function createExtractorRegistry(extractors: SelectionExtractor[]) {
  async function extract(
    geometry: SelectionGeometry,
    policy: SelectionContextPolicy,
  ): Promise<SelectionArtifact[]> {
    const semanticKinds = new Set<SelectionArtifactKind>([
      'dom',
      'table',
      'chart',
    ])
    const shouldRunScreenshot =
      policy.mode === 'screenshot' ||
      policy.mode === 'hybrid' && policy.screenshotPolicy === 'always'

    const activeExtractors = extractors.filter((extractor) => {
      if (policy.mode === 'semantic') {
        return semanticKinds.has(extractor.kind)
      }
      if (policy.mode === 'screenshot') {
        return extractor.kind === 'screenshot'
      }
      return semanticKinds.has(extractor.kind) || shouldRunScreenshot
    })

    const semanticResults = (
      await Promise.all(activeExtractors.map((extractor) => extractor.extract(geometry)))
    ).flat()

    if (
      policy.mode === 'hybrid' &&
      policy.screenshotPolicy === 'on_extractor_miss' &&
      semanticResults.length === 0
    ) {
      const screenshotExtractor = extractors.find(
        (extractor) => extractor.kind === 'screenshot',
      )
      return screenshotExtractor ? screenshotExtractor.extract(geometry) : []
    }

    return semanticResults
  }

  return { extract }
}
```

- [ ] **Step 6: 运行测试**

Run:

```bash
cd frontend && npm run test -- selection-context/__tests__/geometry.test.ts selection-context/__tests__/registry.test.ts
```

Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add frontend/src/features/selection-context/geometry.ts \
  frontend/src/features/selection-context/extractors/registry.ts \
  frontend/src/features/selection-context/__tests__/geometry.test.ts \
  frontend/src/features/selection-context/__tests__/registry.test.ts
git commit -m "feat(frontend): add selection extractor primitives"
```

## Task 3: 实现 DOM 和 Table 语义 extractor

**Files:**
- Create: `frontend/src/features/selection-context/extractors/dom-extractor.ts`
- Create: `frontend/src/features/selection-context/extractors/table-extractor.ts`
- Test: `frontend/src/features/selection-context/__tests__/dom-extractor.test.ts`
- Test: `frontend/src/features/selection-context/__tests__/table-extractor.test.ts`

- [ ] **Step 1: 编写 DOM extractor 测试**

创建 `frontend/src/features/selection-context/__tests__/dom-extractor.test.ts`：

```ts
import { extractDomSelection } from '../extractors/dom-extractor'
import type { SelectionGeometry } from '../types'

function geometry(): SelectionGeometry {
  return {
    id: 'selection-dom',
    path: [{ x: 0, y: 0 }],
    boundingBox: { x: 0, y: 0, width: 200, height: 100 },
    viewport: { width: 400, height: 300, scrollX: 0, scrollY: 0 },
    createdAt: '2026-05-30T00:00:00.000Z',
  }
}

describe('extractDomSelection', () => {
  it('extracts visible text and data-testid from intersecting elements', async () => {
    document.body.innerHTML = `
      <main>
        <button data-testid="save-button" aria-label="保存">保存订单</button>
      </main>
    `
    const button = document.querySelector('button') as HTMLButtonElement
    button.getBoundingClientRect = () =>
      ({ x: 10, y: 10, width: 100, height: 40, top: 10, left: 10, right: 110, bottom: 50 } as DOMRect)

    const result = await extractDomSelection(geometry())

    expect(result[0]).toMatchObject({
      kind: 'dom',
      text: '保存订单',
      testIds: ['save-button'],
    })
  })
})
```

- [ ] **Step 2: 编写 Table extractor 测试**

创建 `frontend/src/features/selection-context/__tests__/table-extractor.test.ts`：

```ts
import { extractTableSelection } from '../extractors/table-extractor'
import type { SelectionGeometry } from '../types'

const selection: SelectionGeometry = {
  id: 'selection-table',
  path: [{ x: 0, y: 0 }],
  boundingBox: { x: 0, y: 40, width: 400, height: 40 },
  viewport: { width: 800, height: 600, scrollX: 0, scrollY: 0 },
  createdAt: '2026-05-30T00:00:00.000Z',
}

describe('extractTableSelection', () => {
  it('extracts selected table rows with column names', async () => {
    document.body.innerHTML = `
      <table data-selection-title="订单明细">
        <thead><tr><th>日期</th><th>订单数</th></tr></thead>
        <tbody><tr><td>2026-05-01</td><td>128</td></tr></tbody>
      </table>
    `
    const row = document.querySelector('tbody tr') as HTMLTableRowElement
    row.getBoundingClientRect = () =>
      ({ x: 0, y: 45, width: 300, height: 30, top: 45, left: 0, right: 300, bottom: 75 } as DOMRect)

    const result = await extractTableSelection(selection)

    expect(result[0]).toMatchObject({
      kind: 'table',
      tableTitle: '订单明细',
      columns: ['日期', '订单数'],
      rows: [{ 日期: '2026-05-01', 订单数: '128' }],
    })
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

Run:

```bash
cd frontend && npm run test -- selection-context/__tests__/dom-extractor.test.ts selection-context/__tests__/table-extractor.test.ts
```

Expected: FAIL，提示 extractor 文件不存在。

- [ ] **Step 4: 实现 DOM extractor**

创建 `frontend/src/features/selection-context/extractors/dom-extractor.ts`：

```ts
import type { DomSelectionArtifact, SelectionGeometry } from '../types'

export async function extractDomSelection(
  geometry: SelectionGeometry,
): Promise<DomSelectionArtifact[]> {
  const elements = Array.from(document.body.querySelectorAll<HTMLElement>('*'))
    .filter((element) => intersectsSelection(element, geometry))
    .filter((element) => element.offsetParent !== null)

  const text = Array.from(
    new Set(elements.map((element) => element.innerText.trim()).filter(Boolean)),
  ).join('\n')
  const testIds = Array.from(
    new Set(
      elements
        .map((element) => element.dataset.testid)
        .filter((value): value is string => Boolean(value)),
    ),
  )
  const roles = Array.from(
    new Set(
      elements
        .map((element) => element.getAttribute('role'))
        .filter((value): value is string => Boolean(value)),
    ),
  )

  if (!text && testIds.length === 0 && roles.length === 0) {
    return []
  }

  return [
    {
      id: `artifact-dom-${geometry.id}`,
      kind: 'dom',
      label: '页面内容',
      geometry,
      summary: text.slice(0, 120) || testIds.join(', '),
      text,
      testIds,
      roles,
    },
  ]
}

function intersectsSelection(
  element: HTMLElement,
  geometry: SelectionGeometry,
): boolean {
  if (element.closest('[data-selection-ignore="true"]')) {
    return false
  }

  const rect = element.getBoundingClientRect()
  const box = geometry.boundingBox
  return (
    rect.right >= box.x &&
    rect.left <= box.x + box.width &&
    rect.bottom >= box.y &&
    rect.top <= box.y + box.height
  )
}
```

- [ ] **Step 5: 实现 Table extractor**

创建 `frontend/src/features/selection-context/extractors/table-extractor.ts`：

```ts
import type { SelectionGeometry, TableSelectionArtifact } from '../types'

export async function extractTableSelection(
  geometry: SelectionGeometry,
): Promise<TableSelectionArtifact[]> {
  const tables = Array.from(document.querySelectorAll<HTMLTableElement>('table'))
  const artifacts = tables
    .map((table) => extractFromTable(table, geometry))
    .filter((artifact): artifact is TableSelectionArtifact => Boolean(artifact))

  return artifacts
}

function extractFromTable(
  table: HTMLTableElement,
  geometry: SelectionGeometry,
): TableSelectionArtifact | null {
  const columns = Array.from(table.querySelectorAll('thead th')).map((cell) =>
    cell.textContent?.trim() ?? '',
  )
  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'))
    .filter((row) => intersectsSelection(row, geometry))
    .map((row) => {
      const values = Array.from(row.querySelectorAll('td')).map(
        (cell) => cell.textContent?.trim() ?? '',
      )
      return Object.fromEntries(
        values.map((value, index) => [columns[index] ?? `列 ${index + 1}`, value]),
      )
    })

  if (rows.length === 0) {
    return null
  }

  const tableTitle =
    table.dataset.selectionTitle ||
    table.getAttribute('aria-label') ||
    undefined

  return {
    id: `artifact-table-${geometry.id}`,
    kind: 'table',
    label: tableTitle ? `表格 · ${tableTitle} · ${rows.length} 行` : `表格 · ${rows.length} 行`,
    geometry,
    summary: `${columns.join(', ')}；选中 ${rows.length} 行`,
    tableTitle,
    columns,
    rows,
  }
}

function intersectsSelection(
  element: HTMLElement,
  geometry: SelectionGeometry,
): boolean {
  const rect = element.getBoundingClientRect()
  const box = geometry.boundingBox
  return (
    rect.right >= box.x &&
    rect.left <= box.x + box.width &&
    rect.bottom >= box.y &&
    rect.top <= box.y + box.height
  )
}
```

- [ ] **Step 6: 运行测试**

Run:

```bash
cd frontend && npm run test -- selection-context/__tests__/dom-extractor.test.ts selection-context/__tests__/table-extractor.test.ts
```

Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add frontend/src/features/selection-context/extractors/dom-extractor.ts \
  frontend/src/features/selection-context/extractors/table-extractor.ts \
  frontend/src/features/selection-context/__tests__/dom-extractor.test.ts \
  frontend/src/features/selection-context/__tests__/table-extractor.test.ts
git commit -m "feat(frontend): extract semantic dom selections"
```

## Task 4: 实现 ECharts registry 和点位 extractor

**Files:**
- Create: `frontend/src/features/selection-context/extractors/echarts-registry.ts`
- Create: `frontend/src/features/selection-context/extractors/echarts-extractor.ts`
- Test: `frontend/src/features/selection-context/__tests__/echarts-extractor.test.ts`

- [ ] **Step 1: 编写 ECharts extractor 测试**

创建 `frontend/src/features/selection-context/__tests__/echarts-extractor.test.ts`：

```ts
import {
  clearSelectableCharts,
  registerSelectableChart,
} from '../extractors/echarts-registry'
import { extractEchartsSelection } from '../extractors/echarts-extractor'
import type { SelectionGeometry } from '../types'

const geometry: SelectionGeometry = {
  id: 'selection-chart',
  path: [
    { x: 10, y: 10 },
    { x: 80, y: 10 },
    { x: 80, y: 80 },
    { x: 10, y: 80 },
  ],
  boundingBox: { x: 10, y: 10, width: 70, height: 70 },
  viewport: { width: 400, height: 300, scrollX: 0, scrollY: 0 },
  createdAt: '2026-05-30T00:00:00.000Z',
}

describe('extractEchartsSelection', () => {
  afterEach(() => clearSelectableCharts())

  it('extracts selected points from registered chart', async () => {
    const element = document.createElement('div')
    element.dataset.testid = 'orders-trend-chart'
    element.dataset.selectionTitle = '订单趋势'
    element.getBoundingClientRect = () =>
      ({ x: 0, y: 0, width: 200, height: 120, top: 0, left: 0, right: 200, bottom: 120 } as DOMRect)
    document.body.appendChild(element)

    registerSelectableChart({
      element,
      title: '订单趋势',
      getPoints: () => [
        { seriesName: '支付订单数', x: '2026-05-01', y: 128, screenX: 20, screenY: 40 },
        { seriesName: '支付订单数', x: '2026-05-02', y: 142, screenX: 60, screenY: 35 },
        { seriesName: '支付订单数', x: '2026-05-10', y: 88, screenX: 160, screenY: 100 },
      ],
    })

    const result = await extractEchartsSelection(geometry)

    expect(result[0]).toMatchObject({
      kind: 'chart',
      chartTitle: '订单趋势',
      chartTestId: 'orders-trend-chart',
    })
    expect(result[0].selectedSeries[0].points).toHaveLength(2)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd frontend && npm run test -- selection-context/__tests__/echarts-extractor.test.ts
```

Expected: FAIL，提示 ECharts registry/extractor 不存在。

- [ ] **Step 3: 实现 ECharts registry**

创建 `frontend/src/features/selection-context/extractors/echarts-registry.ts`：

```ts
export interface SelectableChartPoint {
  seriesName: string
  x: string | number
  y: number
  screenX: number
  screenY: number
  label?: string
  raw?: unknown
}

export interface SelectableChartRegistration {
  element: HTMLElement
  title: string
  getPoints: () => SelectableChartPoint[]
}

const charts = new Set<SelectableChartRegistration>()

export function registerSelectableChart(
  chart: SelectableChartRegistration,
): () => void {
  charts.add(chart)
  return () => charts.delete(chart)
}

export function getSelectableCharts(): SelectableChartRegistration[] {
  return Array.from(charts)
}

export function clearSelectableCharts() {
  charts.clear()
}
```

- [ ] **Step 4: 实现 ECharts extractor**

创建 `frontend/src/features/selection-context/extractors/echarts-extractor.ts`：

```ts
import {
  distanceToPath,
  isPointInPolygon,
} from '../geometry'
import type { ChartSelectionArtifact, SelectionGeometry } from '../types'
import { getSelectableCharts } from './echarts-registry'

const PATH_DISTANCE_THRESHOLD = 8

export async function extractEchartsSelection(
  geometry: SelectionGeometry,
): Promise<ChartSelectionArtifact[]> {
  return getSelectableCharts()
    .filter((chart) => intersectsSelection(chart.element, geometry))
    .map((chart) => {
      const selectedPoints = chart.getPoints().filter((point) => {
        const screenPoint = { x: point.screenX, y: point.screenY }
        return (
          isPointInPolygon(screenPoint, geometry.path) ||
          distanceToPath(screenPoint, geometry.path) <= PATH_DISTANCE_THRESHOLD
        )
      })

      if (selectedPoints.length === 0) {
        return null
      }

      const seriesMap = new Map<string, typeof selectedPoints>()
      for (const point of selectedPoints) {
        const series = seriesMap.get(point.seriesName) ?? []
        series.push(point)
        seriesMap.set(point.seriesName, series)
      }

      const selectedSeries = Array.from(seriesMap.entries()).map(
        ([name, points]) => ({
          name,
          points: points.map((point) => ({
            x: point.x,
            y: point.y,
            label: point.label,
            raw: point.raw,
          })),
        }),
      )

      const chartTestId = chart.element.dataset.testid
      return {
        id: `artifact-chart-${geometry.id}`,
        kind: 'chart',
        label: `图表 · ${chart.title} · ${selectedPoints.length} 个点`,
        geometry,
        summary: `${chart.title}：选中 ${selectedPoints.length} 个点`,
        chartTitle: chart.title,
        chartTestId,
        selectedSeries,
        xRange: {
          min: selectedPoints[0].x,
          max: selectedPoints[selectedPoints.length - 1].x,
        },
      } satisfies ChartSelectionArtifact
    })
    .filter((artifact): artifact is ChartSelectionArtifact => Boolean(artifact))
}

function intersectsSelection(
  element: HTMLElement,
  geometry: SelectionGeometry,
): boolean {
  const rect = element.getBoundingClientRect()
  const box = geometry.boundingBox
  return (
    rect.right >= box.x &&
    rect.left <= box.x + box.width &&
    rect.bottom >= box.y &&
    rect.top <= box.y + box.height
  )
}
```

- [ ] **Step 5: 运行测试**

Run:

```bash
cd frontend && npm run test -- selection-context/__tests__/echarts-extractor.test.ts
```

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add frontend/src/features/selection-context/extractors/echarts-registry.ts \
  frontend/src/features/selection-context/extractors/echarts-extractor.ts \
  frontend/src/features/selection-context/__tests__/echarts-extractor.test.ts
git commit -m "feat(frontend): extract selectable chart points"
```

## Task 5: 实现 overlay 手势采集

**Files:**
- Create: `frontend/src/features/selection-context/use-selection-overlay.ts`
- Create: `frontend/src/features/selection-context/selection-overlay.tsx`
- Modify: `frontend/src/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/i18n/locales/en.ts`

- [ ] **Step 1: 增加 i18n 文案**

在 `frontend/src/i18n/locales/zh-CN.ts` 的 `agentChat` 下增加：

```ts
selectionTool: '圈选引用',
selectionHint: '圈选页面区域，Esc 取消',
selectionEmpty: '未识别到可引用内容',
```

在 `frontend/src/i18n/locales/en.ts` 的 `agentChat` 下增加：

```ts
selectionTool: 'Select page context',
selectionHint: 'Select a page area. Press Esc to cancel.',
selectionEmpty: 'No referenceable content found',
```

- [ ] **Step 2: 创建 overlay hook**

创建 `frontend/src/features/selection-context/use-selection-overlay.ts`：

```ts
'use client'

import { useEffect, useState } from 'react'

import { calculateBoundingBox } from './geometry'
import type { SelectionGeometry, SelectionPoint } from './types'

const MIN_SELECTION_SIZE = 8

export function useSelectionOverlay(
  onComplete: (geometry: SelectionGeometry) => void,
) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [path, setPath] = useState<SelectionPoint[]>([])

  useEffect(() => {
    if (!isSelecting) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSelecting(false)
        setPath([])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSelecting])

  function startSelection() {
    setIsSelecting(true)
    setPath([])
  }

  function stopSelection() {
    setIsSelecting(false)
    setPath([])
  }

  function handlePointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return
    setPath([{ x: event.clientX, y: event.clientY }])
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (path.length === 0) return
    setPath((previous) => [
      ...previous,
      { x: event.clientX, y: event.clientY },
    ])
  }

  function handlePointerUp() {
    if (path.length < 2) {
      stopSelection()
      return
    }

    const boundingBox = calculateBoundingBox(path)
    if (
      boundingBox.width < MIN_SELECTION_SIZE ||
      boundingBox.height < MIN_SELECTION_SIZE
    ) {
      stopSelection()
      return
    }

    onComplete({
      id: `selection-${Date.now()}`,
      path,
      boundingBox,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      },
      createdAt: new Date().toISOString(),
    })
    stopSelection()
  }

  return {
    isSelecting,
    path,
    startSelection,
    stopSelection,
    overlayProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  }
}
```

- [ ] **Step 3: 创建 overlay 组件**

创建 `frontend/src/features/selection-context/selection-overlay.tsx`：

```tsx
'use client'

import { useT } from '@/i18n'

import type { SelectionPoint } from './types'

interface SelectionOverlayProps {
  path: SelectionPoint[]
  overlayProps: {
    onPointerDown: (event: React.PointerEvent) => void
    onPointerMove: (event: React.PointerEvent) => void
    onPointerUp: () => void
  }
}

export function SelectionOverlay({
  path,
  overlayProps,
}: SelectionOverlayProps) {
  const t = useT()
  const pathData = path
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return (
    <div
      data-testid="selection-overlay"
      className="fixed inset-0 z-50 cursor-crosshair bg-black/5"
      {...overlayProps}
    >
      <div
        data-testid="selection-overlay-hint"
        className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-surface-dark px-4 py-2 text-sm text-white shadow-lg"
      >
        {t('agentChat.selectionHint')}
      </div>
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <path
          data-testid="selection-overlay-path"
          d={pathData}
          fill="none"
          stroke="rgb(var(--color-primary))"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </svg>
    </div>
  )
}
```

- [ ] **Step 4: 运行 lint**

Run:

```bash
cd frontend && npm run lint
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/features/selection-context/use-selection-overlay.ts \
  frontend/src/features/selection-context/selection-overlay.tsx \
  frontend/src/i18n/locales/zh-CN.ts \
  frontend/src/i18n/locales/en.ts
git commit -m "feat(frontend): add selection overlay"
```

## Task 6: 接入 chat attachment chip 和发送状态

**Files:**
- Create: `frontend/src/features/agent-chat/attachment-chip.tsx`
- Modify: `frontend/src/features/agent-chat/types.ts`
- Modify: `frontend/src/features/agent-chat/use-agent-chat-state.ts`
- Modify: `frontend/src/features/agent-chat/agent-chat-panel.tsx`

- [ ] **Step 1: 扩展 chat 类型**

修改 `frontend/src/features/agent-chat/types.ts`：

```ts
import type { ChatAttachment } from '@/features/selection-context/types'

export type AgentChatMode = 'minimized' | 'floating' | 'docked'

export interface AgentChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachments?: ChatAttachment[]
}

export interface SendAgentChatMessagePayload {
  content: string
  attachments: ChatAttachment[]
}
```

保留文件中已有的 `AgentChatSession` 和 `FloatingPanelPosition` 类型。

- [ ] **Step 2: 创建 attachment chip 组件**

创建 `frontend/src/features/agent-chat/attachment-chip.tsx`：

```tsx
'use client'

import { BarChart3, FileText, Image, Table2, X } from 'lucide-react'

import type { ChatAttachment } from '@/features/selection-context/types'

interface AttachmentChipProps {
  attachment: ChatAttachment
  onRemove: (id: string) => void
}

export function AttachmentChip({
  attachment,
  onRemove,
}: AttachmentChipProps) {
  const Icon = getIcon(attachment.artifact.kind)

  return (
    <div
      data-testid="agent-chat-attachment-chip"
      className="flex max-w-full items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-primary"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="truncate">{attachment.label}</span>
      <button
        data-testid="agent-chat-attachment-remove"
        type="button"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-base"
        onClick={() => onRemove(attachment.id)}
        aria-label="删除引用"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

function getIcon(kind: ChatAttachment['artifact']['kind']) {
  if (kind === 'chart') return BarChart3
  if (kind === 'table') return Table2
  if (kind === 'screenshot') return Image
  return FileText
}
```

- [ ] **Step 3: 扩展 chat state**

修改 `frontend/src/features/agent-chat/use-agent-chat-state.ts`：

```ts
import type {
  AgentChatMessage,
  AgentChatSession,
  SendAgentChatMessagePayload,
} from './types'
```

把 `sendMessage(content: string)` 改为：

```ts
function sendMessage(payload: SendAgentChatMessagePayload) {
  const trimmed = payload.content.trim()
  if (!trimmed && payload.attachments.length === 0) {
    return
  }

  const userMessage = createMessage('user', trimmed || '引用页面上下文')
  userMessage.attachments = payload.attachments
  const assistantMessage = createMessage('assistant', MOCK_ASSISTANT_REPLY)
  // 保留原有 setSessions 更新逻辑
}
```

保留标题生成逻辑，但标题内容使用：

```ts
const titleSource = trimmed || payload.attachments[0]?.label || ''
title: !session.title ? titleSource.slice(0, 16) : session.title,
```

- [ ] **Step 4: 接入 agent chat panel**

在 `frontend/src/features/agent-chat/agent-chat-panel.tsx` 中：

1. 引入 `MousePointer2` 图标、`AttachmentChip`、`SelectionOverlay`、`useSelectionOverlay`、`createExtractorRegistry` 和各 extractor。
2. 增加状态：

```ts
const [attachments, setAttachments] = useState<ChatAttachment[]>([])
```

3. 圈选完成时运行 extractor：

```ts
async function handleSelectionComplete(geometry: SelectionGeometry) {
  const artifacts = await extractorRegistry.extract(
    geometry,
    getRuntimeConfigSync().selectionContextPolicy,
  )
  setAttachments((previous) => [
    ...previous,
    ...artifacts.map((artifact) => ({
      id: artifact.id,
      label: artifact.label,
      artifact,
    })),
  ])
}
```

4. `handleSend` 改为：

```ts
function handleSend() {
  if (!draft.trim() && attachments.length === 0) return
  sendMessage({ content: draft, attachments })
  setDraft('')
  setAttachments([])
}
```

5. 输入区按钮左侧增加圈选按钮：

```tsx
<button
  data-testid="selection-tool-button"
  onClick={startSelection}
  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-primary hover:bg-base transition-colors"
  type="button"
  aria-label={t('agentChat.selectionTool')}
>
  <MousePointer2 className="h-4 w-4" />
</button>
```

6. textarea 上方增加 chip 列表：

```tsx
{attachments.length > 0 && (
  <div
    data-testid="agent-chat-attachment-list"
    className="mb-2 flex flex-wrap gap-2"
  >
    {attachments.map((attachment) => (
      <AttachmentChip
        key={attachment.id}
        attachment={attachment}
        onRemove={(id) =>
          setAttachments((previous) =>
            previous.filter((item) => item.id !== id),
          )
        }
      />
    ))}
  </div>
)}
```

7. panel 根元素增加：

```tsx
data-selection-ignore="true"
```

8. 组件末尾渲染：

```tsx
{isSelecting && (
  <SelectionOverlay path={path} overlayProps={overlayProps} />
)}
```

- [ ] **Step 5: 运行 lint**

Run:

```bash
cd frontend && npm run lint
```

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add frontend/src/features/agent-chat/attachment-chip.tsx \
  frontend/src/features/agent-chat/types.ts \
  frontend/src/features/agent-chat/use-agent-chat-state.ts \
  frontend/src/features/agent-chat/agent-chat-panel.tsx
git commit -m "feat(frontend): attach page selections to chat messages"
```

## Task 7: 增加 screenshot artifact 受控 fallback

**Files:**
- Create: `frontend/src/features/selection-context/extractors/screenshot-extractor.ts`
- Modify: `frontend/src/features/selection-context/extractors/registry.ts`
- Test: `frontend/src/features/selection-context/__tests__/registry.test.ts`

- [ ] **Step 1: 扩展 registry 测试**

在 `frontend/src/features/selection-context/__tests__/registry.test.ts` 增加：

```ts
it('runs screenshot extractor only on semantic miss when hybrid policy allows it', async () => {
  const screenshotArtifact: SelectionArtifact = {
    id: 'artifact-screenshot-1',
    kind: 'screenshot',
    label: '截图区域',
    geometry,
    summary: '截图区域',
    resourceId: 'selection://screenshot/1',
    delivery: 'reference_only',
  }
  const registry = createExtractorRegistry([
    {
      kind: 'dom',
      extract: jest.fn().mockResolvedValue([]),
    },
    {
      kind: 'screenshot',
      extract: jest.fn().mockResolvedValue([screenshotArtifact]),
    },
  ])

  const result = await registry.extract(geometry, {
    mode: 'hybrid',
    screenshotPolicy: 'on_extractor_miss',
    screenshotDelivery: 'reference_only',
  })

  expect(result).toEqual([screenshotArtifact])
})
```

- [ ] **Step 2: 创建 screenshot extractor**

创建 `frontend/src/features/selection-context/extractors/screenshot-extractor.ts`：

```ts
import type {
  ScreenshotDelivery,
  ScreenshotSelectionArtifact,
  SelectionGeometry,
} from '../types'

export async function extractScreenshotSelection(
  geometry: SelectionGeometry,
  delivery: ScreenshotDelivery,
): Promise<ScreenshotSelectionArtifact[]> {
  return [
    {
      id: `artifact-screenshot-${geometry.id}`,
      kind: 'screenshot',
      label: '截图区域',
      geometry,
      summary: '截图证据已按引用保存，默认不进入模型上下文',
      resourceId: `selection://screenshot/${geometry.id}`,
      delivery,
    },
  ]
}
```

第一版只建立资源引用边界，不实际生成大图；如果要真正截图，应在后续任务里引入受 policy 控制的截图库和后端资源存储。

- [ ] **Step 3: 运行 registry 测试**

Run:

```bash
cd frontend && npm run test -- selection-context/__tests__/registry.test.ts
```

Expected: PASS。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/features/selection-context/extractors/screenshot-extractor.ts \
  frontend/src/features/selection-context/extractors/registry.ts \
  frontend/src/features/selection-context/__tests__/registry.test.ts
git commit -m "feat(frontend): add controlled screenshot selection artifact"
```

## Task 8: 增加 Playwright E2E

**Files:**
- Modify: `frontend/e2e/agent-chat-panel.spec.ts`

- [ ] **Step 1: 增加连续圈选 E2E**

在 `frontend/e2e/agent-chat-panel.spec.ts` 增加：

```ts
test('creates selection attachment chips and sends them with a message', async ({ page }) => {
  await mockAuth(page)
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.getByTestId('agent-chat-minimized-button').click()

  await page.getByTestId('selection-tool-button').click()
  await expect(page.getByTestId('selection-overlay')).toBeVisible()

  await page.mouse.move(80, 120)
  await page.mouse.down()
  await page.mouse.move(240, 120)
  await page.mouse.move(240, 220)
  await page.mouse.up()

  await expect(page.getByTestId('agent-chat-attachment-list')).toBeVisible()
  await expect(page.getByTestId('agent-chat-attachment-chip')).toHaveCount(1)

  await page.getByTestId('agent-chat-input').fill('解释这个区域')
  await page.getByTestId('agent-chat-send-button').click()

  await expect(page.getByTestId('agent-chat-panel')).toContainText('解释这个区域')
  await expect(page.getByTestId('agent-chat-attachment-list')).not.toBeVisible()
})
```

- [ ] **Step 2: 增加删除 chip E2E**

继续增加：

```ts
test('removes a pending selection attachment', async ({ page }) => {
  await mockAuth(page)
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.getByTestId('agent-chat-minimized-button').click()

  await page.getByTestId('selection-tool-button').click()
  await page.mouse.move(80, 120)
  await page.mouse.down()
  await page.mouse.move(220, 180)
  await page.mouse.up()

  await expect(page.getByTestId('agent-chat-attachment-chip')).toHaveCount(1)
  await page.getByTestId('agent-chat-attachment-remove').click()
  await expect(page.getByTestId('agent-chat-attachment-chip')).toHaveCount(0)
})
```

- [ ] **Step 3: 运行 E2E**

Run:

```bash
cd frontend && npm run e2e -- agent-chat-panel.spec.ts
```

Expected: PASS。

- [ ] **Step 4: 提交**

```bash
git add frontend/e2e/agent-chat-panel.spec.ts
git commit -m "test(frontend): cover selection attachments in chat panel"
```

## Task 9: 全量验证和整理

**Files:**
- Verify all files changed in Tasks 1-8.

- [ ] **Step 1: 运行前端 lint**

Run:

```bash
cd frontend && npm run lint
```

Expected: PASS。

- [ ] **Step 2: 运行前端单测**

Run:

```bash
cd frontend && npm run test
```

Expected: PASS。

- [ ] **Step 3: 运行 E2E**

Run:

```bash
cd frontend && npm run e2e
```

Expected: PASS。

- [ ] **Step 4: 检查没有破坏 data-testid**

Run:

```bash
rg -n "agent-chat-input|agent-chat-send-button|selection-tool-button|agent-chat-attachment-chip" frontend/src frontend/e2e
```

Expected: 能看到 chat 输入、发送按钮、圈选按钮、attachment chip 的稳定测试 ID。

- [ ] **Step 5: 检查 git 状态**

Run:

```bash
git status --short
```

Expected: 输出为空。

## GLM 5.1 执行注意事项

- 不要把所有逻辑写进 `agent-chat-panel.tsx`，该文件只做组合和 UI 编排。
- 默认 policy 必须是 `semantic + never + reference_only`。
- 不要默认引入真实截图库；第一版截图 artifact 只建立资源引用边界。
- ECharts 点位提取必须通过 `registerSelectableChart` 注册的数据点完成。
- 如果实现中需要接真实 ECharts 实例，把实例适配成 `getPoints()`，不要让 extractor 直接依赖具体业务图表组件。
- 所有新增交互元素都必须有 `data-testid`。
- E2E 不允许 `test.skip()` 或静默失败。
