# 设置面板 Sheet 改 Dialog 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将设置面板从右侧滑出 Sheet 改为左侧导航式居中弹窗 Dialog。

**Architecture:** 替换 `settings-panel.tsx` 中的 Sheet 组件为 Dialog 组件，保持内部左侧导航 + 右侧内容的布局结构不变。仅修改容器层，不动子组件逻辑。E2E 测试通过保留所有 `data-testid` 属性来保证兼容。

**Tech Stack:** React 19, shadcn/ui (Dialog 基于 `@radix-ui/react-dialog`), Tailwind CSS, Playwright E2E

---

### Task 1: 重写 SettingsPanel 组件（Sheet → Dialog）

**Files:**
- Modify: `frontend/src/components/settings/settings-panel.tsx` (全文重写)

- [ ] **Step 1: 重写 settings-panel.tsx**

将当前基于 Sheet 的实现替换为 Dialog。所有 `data-testid` 保持不变。

```tsx
'use client'

import { useState } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { GeneralSettings } from './general-settings'
import { ModelConfig } from './model-config'

type Tab = 'general' | 'models'

export function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('models')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="settings-trigger"
          className="fixed right-4 top-4 z-50"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-[700px] w-[700px] p-0 max-h-[80vh] overflow-hidden rounded-xl"
        data-testid="settings-panel"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>设置</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 overflow-hidden">
          <nav className="w-40 border-r p-4 flex flex-col gap-1 bg-[#efe9de]">
            <button
              data-testid="tab-general"
              onClick={() => setActiveTab('general')}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === 'general'
                  ? 'bg-[#cc785c] text-white'
                  : 'text-[#6b6560] hover:bg-[#e6dfd8]'
              }`}
            >
              通用设置
            </button>
            <button
              data-testid="tab-models"
              onClick={() => setActiveTab('models')}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === 'models'
                  ? 'bg-[#cc785c] text-white'
                  : 'text-[#6b6560] hover:bg-[#e6dfd8]'
              }`}
            >
              模型配置
            </button>
          </nav>
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'models' && <ModelConfig />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `cd frontend && npx tsc --noEmit`
Expected: 无错误输出

- [ ] **Step 3: 启动开发服务器，手动验证弹窗打开/关闭/Tab 切换**

Run: `cd frontend && npm run dev`

在浏览器中验证：
1. 点击右上角齿轮图标 → 弹窗居中打开（不是侧边滑出）
2. 左侧导航显示「通用设置」和「模型配置」，选中项为珊瑚色
3. 点击导航项可切换内容
4. 右上角 X 按钮可关闭弹窗
5. 点击遮罩层可关闭弹窗
6. 弹窗内子 Dialog（添加 Provider 等）正常弹出

- [ ] **Step 4: 运行 E2E 测试，确认全部通过**

Run: `cd frontend && npx playwright test e2e/model-configuration.spec.ts`
Expected: 10/10 tests passed

- [ ] **Step 5: 提交**

```bash
git add frontend/src/components/settings/settings-panel.tsx
git commit -m "refactor(frontend): replace settings Sheet with centered Dialog modal"
```

---

### Task 2: 移除未使用的 Sheet 导入

**Files:**
- Read: `frontend/src/components/settings/settings-panel.tsx`

- [ ] **Step 1: 全局搜索确认 Sheet 不再被 settings 模块引用**

Run: `grep -r "sheet" frontend/src/components/settings/`
Expected: 无匹配结果（settings-panel.tsx 已不再 import sheet）

- [ ] **Step 2: 全局搜索确认 Sheet 组件是否被其他文件使用**

Run: `grep -r "from.*sheet" frontend/src/ --include="*.tsx" --include="*.ts" | grep -v node_modules`
Expected: 如果只有 `sheet.tsx` 自身和可能的类型导入，则安全

如果 Sheet 组件仅被 settings-panel 使用且已不再需要，无需删除 `sheet.tsx` 文件本身（它是 shadcn/ui 基础组件，保留备用）。

- [ ] **Step 3: 提交（如有变更）**

仅当发现其他文件中有残留的 Sheet 导入需要清理时才提交。
