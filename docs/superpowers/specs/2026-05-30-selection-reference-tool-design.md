# 圈选引用工具设计

## 背景

Chat panel 需要新增一个类似画笔/套索的引用工具。用户可以在页面上圈选一块区域，将该区域相关内容作为下一条消息的上下文提供给大模型。目标场景包括普通文本、表格行、业务卡片，以及 ECharts 折线图中一段趋势或一批数据点。

该功能后续会接入本地大模型。本地模型上下文窗口较小，因此默认不能把截图或大量原始数据直接塞进 prompt。第一版以语义上下文为默认输出，截图仅作为受部署配置控制的可选证据源。

## 目标

- 在 chat 输入区提供圈选工具入口。
- 支持用户左键拖动自由圈选页面区域。
- 支持连续圈选多个区域，并以 attachment chip 形式挂在输入框上方。
- 默认提取结构化语义上下文，不默认生成或发送截图。
- 对自家应用中的 ECharts 图表，提取被圈选的数据系列和点位，而不是依赖截图/OCR 推断。
- 通过服务端部署配置控制语义、截图或混合模式。
- 为后续上下文预算压缩、用户偏好设置、更多 extractor 类型预留扩展点。
- 将圈选引用相关开发准则写入 `AGENTS.md`，方便 GLM 5.1 执行实现时遵循。

## 非目标

- 第一版不实现上下文预算压缩层。
- 第一版不实现用户设置 UI。
- 第一版不支持任意外部网页、跨域 iframe 或不可控第三方图表的语义提取。
- 第一版不要求截图 inline 进入模型上下文。
- 本规格不包含具体代码实现；实现任务将交给 GLM 5.1。

## 推荐方案

采用“语义优先 + 截图证据可配置”的双通道设计。

用户圈选只表达“我指的是这里”。系统根据圈选区域尝试提取结构化上下文：普通 DOM 提取文本和元素标识，表格提取命中行列，ECharts 提取 series 与点位。截图能力作为可选证据源存在，但是否采集、是否随消息发送，由服务端 policy 控制。默认部署配置只使用语义上下文。

## 总体架构

### Selection Tool UI

- chat 输入区左侧增加画笔/套索图标按钮。
- 点击后进入全局圈选模式，页面出现透明 overlay。
- 用户拖动时显示珊瑚色路径和半透明选区。
- `Esc` 取消当前圈选。
- 再次点击工具按钮退出圈选模式。
- chat panel 自身默认不参与圈选，避免引用输入框、按钮、历史抽屉等控制元素。

### Selection Capture

该层只负责记录用户手势，不判断选中了什么。

```ts
interface SelectionGeometry {
  id: string
  path: Array<{ x: number; y: number }>
  boundingBox: { x: number; y: number; width: number; height: number }
  viewport: { width: number; height: number; scrollX: number; scrollY: number }
  createdAt: string
}
```

坐标使用 viewport 坐标，并记录 scroll offset。后续 extractor 可以把 viewport 坐标转换为文档坐标、元素局部坐标或图表坐标。

### Extractor Registry

圈选结束后，由 registry 根据 policy 和命中内容运行 extractor。

- `DomSelectionExtractor`：提取普通可见文本、`data-testid`、`role`、`aria-label`、表单值、邻近标题。
- `TableSelectionExtractor`：提取命中的表格、列名、行号、主键、单元格值。
- `EchartsSelectionExtractor`：通过应用内 chart registry 提取图表语义和被圈选点位。
- `ScreenshotSelectionExtractor`：仅在 policy 允许时生成截图 artifact，作为 fallback 或补充证据。

extractor 输出统一 artifact：

```ts
type SelectionArtifact =
  | DomSelectionArtifact
  | TableSelectionArtifact
  | ChartSelectionArtifact
  | ScreenshotSelectionArtifact
```

### Chat Attachment Layer

输入框上方显示引用 chip，而不是把大段结构化数据塞进 textarea。

```ts
interface ChatAttachment {
  id: string
  label: string
  artifact: SelectionArtifact
}

interface SendMessagePayload {
  content: string
  attachments: ChatAttachment[]
}
```

chip 支持：

- 类型图标：文本、表格、图表、截图。
- 简短标题，例如 `图表 · 订单趋势 · 7 个点`。
- 删除按钮。
- 点击展开预览。

发送消息时，用户文本和 attachments 一起提交。发送成功后，清空输入框和当前 attachments。

## 配置设计

配置以服务端部署 policy 为准，前端只读取生效后的 policy。第一版不做用户偏好设置 UI。

```ts
type SelectionContextMode = 'semantic' | 'screenshot' | 'hybrid'

interface SelectionContextPolicy {
  mode: SelectionContextMode
  screenshotPolicy: 'never' | 'on_extractor_miss' | 'always'
  screenshotDelivery: 'reference_only' | 'inline_image'
}
```

默认值：

```ts
{
  mode: 'semantic',
  screenshotPolicy: 'never',
  screenshotDelivery: 'reference_only',
}
```

行为：

- `semantic`：只运行 DOM/Table/ECharts 等语义 extractor。
- `screenshot`：只生成截图 artifact。
- `hybrid`：先运行语义 extractor，再按 `screenshotPolicy` 决定是否补截图。
- `reference_only`：消息只携带截图资源 ID、区域元数据和圈选路径，不直接内联图片。
- `inline_image`：仅当服务端明确允许，且模型适配层确认支持视觉输入时才能启用。

后续如果增加用户设置，应采用服务端 policy 决定上限、用户 preference 在允许范围内选择的模式：

```ts
interface SelectionServerPolicy {
  allowedModes: SelectionContextMode[]
  defaultMode: SelectionContextMode
  allowScreenshotCapture: boolean
  allowInlineScreenshot: boolean
}
```

## ECharts 语义提取

由于图表由自家应用渲染，可以要求可圈选图表统一注册。

业务图表容器应提供稳定元数据：

```tsx
<div
  data-selection-kind="echarts"
  data-selection-title="订单趋势"
  data-testid="orders-trend-chart"
/>
```

应用内维护 chart registry：

```ts
registerSelectableChart({
  element,
  chart,
  title,
  getSemanticMetadata,
})
```

提取流程：

1. 找到圈选 bounding box 命中的 chart 容器。
2. 从 chart registry 获取 ECharts instance 与业务 metadata。
3. 读取 `chart.getOption()` 中的 series、xAxis、dataset 等数据。
4. 将数据点映射到屏幕坐标，或将圈选路径映射回图表坐标。
5. 判断哪些点被自由路径命中。
6. 生成 chart artifact。

建议的命中规则：

- 点在闭合路径内：命中。
- 或点到圈选路径距离小于 8px：命中。
- 如果命中点为 0，但 bounding box 命中图表，则退化为选择 x 轴范围内的点。
- 多 series 时，默认提取所有落入区域的 series 点。

chart artifact 示例：

```ts
interface ChartSelectionArtifact {
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
  summary: {
    pointCount: number
    seriesCount: number
  }
}
```

模型上下文中的紧凑表达示例：

```text
图表：订单趋势
系列：支付订单数
选中点：7 个
范围：2026-05-01 至 2026-05-07
点位：2026-05-01=128, 2026-05-02=142, 2026-05-03=96
```

## 错误处理

- 无语义命中且截图关闭：提示 `未识别到可引用内容`，不生成 chip。
- ECharts registry 未找到实例：降级为 DOM artifact；如果 policy 允许截图，再补截图 artifact。
- 图表点位计算失败：保留图表容器标题、`data-testid`、用户选区范围，chip 标为 `图表区域` 而非 `图表点位`。
- 截图被 policy 禁止：UI 不显示截图预览入口。
- extractor 超时：单个 extractor 失败不能阻塞其他 extractor。
- 圈选面积过小：提示用户重新圈选，不生成 attachment。

## 测试策略

### 纯逻辑单测

- `pointInPolygon`、`distanceToPath`、`boundingBox` 等几何函数。
- extractor registry 的选择顺序与 policy 行为。
- DOM/Table extractor 在普通文本、嵌套元素、空选区下的输出。
- ECharts extractor 使用 mock chart adapter 测试点命中逻辑，避免依赖真实 canvas。

### React 组件测试

- 点击画笔按钮进入/退出圈选模式。
- 鼠标拖动后生成 attachment chip。
- chip 可删除、可展开预览。
- policy 为 `semantic` 时不显示截图预览。
- policy 为 `hybrid` 且语义失败时生成截图 fallback。

### Playwright E2E

- 打开 chat panel，圈选页面文字，输入问题并发送，消息包含引用摘要。
- 连续圈选两个区域，生成两个 chip，发送后输入区清空。
- 圈选 mock ECharts 折线图一段区域，断言 chip 显示点数量和图表标题。
- 截图关闭时，圈选无语义区域应显示失败提示，不静默失败。
- 保留并新增所有交互元素的 `data-testid`。

提交前按项目规则运行：

```bash
npm run lint
npm run test
npm run e2e
```

如果涉及后端配置或 Python API：

```bash
uv run pytest
```

## 面向 GLM 5.1 的实现边界

- 先实现语义默认路径，不要把截图作为默认 prompt 内容。
- 不要把提取出的长内容直接写入 textarea；必须通过 attachment chip 承载。
- 优先抽象 Selection Capture、Extractor Registry、Chat Attachment Layer，避免把所有逻辑堆进 `agent-chat-panel.tsx`。
- ECharts 必须通过 registry/adapter 读取实例和数据，不要用截图或 OCR 推断数据点。
- 截图采集、截图预览、截图发送必须受服务端 policy 控制。
- 上下文预算压缩暂不实现，但数据结构要保留 artifact ID、summary 和 raw data 的边界，方便后续增加压缩层。
