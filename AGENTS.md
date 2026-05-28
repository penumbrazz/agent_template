# AGENTS.md

## 项目定位

这是一个全栈 AI 应用模板
------------------------

## 代码规范

- Python 使用 uv、Black、isort、类型注解。
- TypeScript 使用严格模式、函数组件、单引号、不使用分号。
- 代码注释使用英文，文档使用中文优先。
- 交互式前端元素必须添加 `data-testid`。

---

## 🧪 测试

**提交前务必运行测试。** 目标覆盖率：最低 60%。

**⚠️ Python 模块使用 [uv](https://docs.astral.sh/uv/) 管理依赖。始终使用 `uv run` 执行 Python 命令。**

**测试原则：**

- 遵循 AAA 模式：Arrange（准备）、Act（执行）、Assert（断言）
- Mock 外部服务（Anthropic、OpenAI、Docker、API）
- 测试边缘情况和错误条件
- 保持测试独立和隔离

**E2E 测试规则：**

- ⚠️ E2E 测试不允许优雅失败——禁止 `test.skip()`，禁止静默失败
- ⚠️ 前端禁止 Mock 后端 API——必须发送真实 HTTP 请求
- 如果测试失败，修复问题——绝不能为了通过 CI 而跳过

---

## 💻 代码风格

### 通用原则

- **高内聚，低耦合**：每个模块/类应有单一职责
- **文件大小限制**：如果文件超过 **1000 行**，应拆分为多个子模块
- **函数长度**：每个函数最多 50 行（推荐）

### 代码设计准则

⚠️ **实现新功能或修改现有代码时请遵循以下准则：**

1. **长期可维护性优于短期简洁性**：当存在多种实现方案时，避免那些现在实现简单但长期增加维护成本的方案。选择平衡实现成本和长期可持续性的方案。
2. **使用设计模式进行解耦**：积极考虑应用设计模式（如策略模式、工厂模式、观察者模式、适配器模式）来解耦模块并提高代码灵活性。这使代码库更易于扩展和测试。
3. **通过提取管理复杂性**：如果模块已经很复杂，优先将公共逻辑提取到工具模块或创建新模块，而不是在现有模块上增加更多复杂性。有疑问时，拆分而非扩展。
4. **先参考，再提取，然后复用**：实现新功能之前，务必：

   - 搜索解决类似问题的现有实现
   - 如有发现，从现有代码中提取可复用的模式
   - 创建可在代码库中复用的共享工具
   - 绝不复制粘贴代码或编写重复逻辑
5. **先重构再扩展**：分析代码时，识别与新功能相关的特性。如果存在相关代码，在添加新功能之前先使用设计模式重构并提取公共方法——绝不重新实现已有逻辑。
6. **修复所有发现的问题**：在开发过程中发现问题时，必须立即修复。绝不能因为问题看似"不相关"而忽略——发现的所有 bug 都必须处理。**主动审查**代码和文档中的问题——不要等待用户指出。
7. **优先采用行业标准而非项目惯例**：如果项目有不符行业标准的实践，应采用标准方法而非扩展非标准模式。这提高了代码的可维护性，减少了新开发者的上手难度。
8. **积极删除死代码**：无论需要多大努力，确保删除已废弃、未使用或过时的代码。死代码降低可维护性并造成混乱——保持代码库整洁是不可商量的。
9. **从所有代码中提取公共逻辑**：在进行更改时，如果发现应提取到共享工具的逻辑，立即执行。这适用于所有代码——不仅是"新代码复用旧代码"，也包括从现有代码段之间提取共性。每个复用机会都必须抓住。
10. **避免向后兼容——为理想状态设计**：实现更改时，就像没有遗留负担一样设计——考虑"如果从零开始，最好的方法是什么"。避免为旧逻辑编写兼容性垫片或变通方案。如果向后兼容绝对不可避免，在继续之前先与用户协商。

### Python（Backend、Executor、Shared）

**标准：** PEP 8、Black 格式化（行长度：88）、isort、必须使用类型提示

```bash
black . && isort .
```

**准则：**

- 使用描述性命名，公共函数/类必须有 docstring
- 将魔法数字提取为常量

### TypeScript/React（Frontend）

**标准：** TypeScript 严格模式、函数式组件、Prettier、ESLint、单引号、无分号

```bash
npm run format && npm run lint
```

**准则：**

- 优先使用 `const` 而非 `let`，禁止使用 `var`
- 组件名：PascalCase，文件名：kebab-case
- 类型定义放在 `src/types/`

### 组件复用

⚠️ **创建新组件前务必检查现有组件**

1. 在 `src/components/ui/`、`src/components/common/`、`src/features/*/components/` 中搜索现有组件
2. 如果多次实现类似的 UI 模式，提取可复用逻辑

### 测试属性（data-testid）

⚠️ **保留并添加 `data-testid` 属性用于 E2E 测试**

**修改现有代码时：**

- ✅ **始终保留**现有的 `data-testid` 属性——它们被 E2E 测试使用
- ❌ 不要重命名或删除 `data-testid`，除非同时更新对应的 E2E 测试

**创建新的交互组件时：**

- ✅ **必须添加** `data-testid` 属性到交互元素（按钮、输入框、链接、选择框等）
- ✅ 使用描述性的、一致的命名：`{动作}-{元素类型}`（例如 `save-button`、`cancel-link`、`search-input`）
- ❌ 不要在交互元素上省略 `data-testid`

### 响应式架构

⚠️ 该项目**采用移动优先、组件分离的响应式设计架构**

**断点系统：**

- 移动端：≤767px - 触摸优化 UI，带抽屉侧边栏
- 平板：768px-1023px - 使用桌面布局
- 桌面端：≥1024px - 全功能 UI，所有控件可用

**何时分离组件：**

- 布局差异 >30%：创建独立的移动端/桌面端组件
- 不同的交互模式：分离以获得更好的用户体验
- 性能优化：通过动态导入使用代码分割

**何时使用 Tailwind 响应式类：**

- 简单的样式调整（间距、字号）
- 显示/隐藏场景
- 次要的布局变化

**页面级分离模式：**

```
app/(tasks)/chat/
├── page.tsx                 # 路由组件（动态导入）
├── ChatPageDesktop.tsx      # 桌面端实现
└── ChatPageMobile.tsx       # 移动端实现
```

**组件级分离模式：**

```typescript
// ChatInputControls.tsx（包含路由逻辑）
export function ChatInputControls(props: Props) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobileChatInputControls {...props} />
  }

  return <DesktopChatInputControls {...props} />
}
```

**触摸友好要求（移动端）：**

- 所有交互元素至少 44px × 44px
- 按钮使用 `h-11 min-w-[44px]`
- 示例：`<Button className="h-11 min-w-[44px] px-4">...</Button>`

---

## 🔄 Git 工作流

### 分支命名与提交

**分支模式：** `<类型>/<描述>`（feature/、fix/、refactor/、docs/、test/、chore/）

**提交格式：** [约定式提交](https://www.conventionalcommits.org/)

```
<type>[scope]: <description>
# 类型：feat | fix | docs | style | refactor | test | chore
# 示例：feat(backend): add Ghost YAML import API
```

### Git 钩子（Husky）

| 钩子           | 用途                                             |
| -------------- | ------------------------------------------------ |
| `pre-commit` | Python 格式化（black + isort）、前端 lint-staged |
| `commit-msg` | 验证提交信息格式                                 |
| `pre-push`   | AI 推送质量检查                                  |

**⚠️ AI 智能体必须遵守 Git 钩子输出——修复问题，禁止使用 `--no-verify`**

---

## 📊 OpenTelemetry 追踪

**位置：** `shared/telemetry/decorators.py`

| 场景                   | 方法                                                         |
| ---------------------- | ------------------------------------------------------------ |
| 追踪整个异步函数       | `@trace_async(span_name, tracer_name, extract_attributes)` |
| 追踪整个同步函数       | `@trace_sync(span_name, tracer_name, extract_attributes)`  |
| 向当前 span 添加事件   | `add_span_event(name, attributes)`                         |
| 在当前 span 上设置属性 | `set_span_attribute(key, value)`                           |
