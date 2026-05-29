# 设置面板：从侧滑 Sheet 改为居中弹窗 Dialog

## 背景

当前设置面板使用 shadcn/ui 的 Sheet 组件从右侧滑出（宽 700px），包含「通用设置」和「模型配置」两个 Tab。项目中子表单（添加 Provider、添加模型、测试连通性）已经使用 Dialog 弹窗，主设置面板统一为弹窗风格可提升视觉一致性和交互体验。

## 方案

将 Sheet 替换为 Dialog，采用左侧导航式弹窗布局。

### 整体结构

- 宽度：700px（`max-w-[700px]`）
- 高度：自适应，最大 `max-h-[80vh]`，超出时内容区滚动
- 布局：左侧 160px 导航栏 + 右侧可滚动内容区
- 导航项：「通用设置」和「模型配置」，选中项以珊瑚色 `#cc785c` 高亮
- 触发方式不变：右上角齿轮图标按钮

### 样式规格

- 遮罩层：`bg-black/80`
- 弹窗背景：Canvas 奶油画布 `#faf9f5`
- 左侧导航背景：Surface Card `#efe9de`
- 圆角：`rounded-xl`（16px）
- 关闭按钮：右上角 X 图标
- 动画：zoom-in/out（复用现有 Dialog 动画）

### 组件改动范围

| 文件 | 改动 |
|---|---|
| `frontend/src/components/settings/settings-panel.tsx` | Sheet → Dialog，重新布局为左侧导航 + 右侧内容 |
| `frontend/src/components/ui/dialog.tsx` | 可能需要调整 DialogContent 以支持 700px 宽度 |
| `frontend/src/components/ui/sheet.tsx` | 保留不动，仅设置面板不再使用 |

以下文件无需改动：

- `general-settings.tsx` — 内容不变，作为右侧内容区注入
- `model-config.tsx` — 内容不变，作为右侧内容区注入
- `model-form-dialog.tsx`、`provider-form-dialog.tsx`、`test-model-dialog.tsx` — 嵌套 Dialog 保持不变

### 行为不变项

- 即时保存：设置修改后立即生效，不添加统一保存按钮
- 子表单：Provider/模型/测试连通性仍使用独立嵌套 Dialog
- 数据流和 API 调用不变
- 移动端暂不涉及
