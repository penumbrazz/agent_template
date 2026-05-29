# 设置面板 - 账户标签页设计

## 概述

在现有设置面板的标签导航中新增"账户"标签页，提供账户信息展示和退出登录功能。

## 需求

- 在设置 Dialog 左侧标签栏新增第三个标签"账户"
- 显示当前登录用户的用户名
- 提供退出登录功能，点击后弹出确认弹窗，确认后退出并跳转到登录页

## 设计

### 新增组件：`AccountSettings`

**文件：** `frontend/src/components/settings/account-settings.tsx`

- 使用 `useAuth()` 获取 `user` 和 `logout`
- 展示用户名（`user.username`），使用卡片样式
- 退出登录按钮：coral 主色（`#cc785c`），点击弹出确认 Dialog
- 确认弹窗内容：
  - 标题："退出登录"
  - 文案："确定要退出登录吗？"
  - 按钮："取消"（灰色）和"退出登录"（coral）
- 确认后调用 `logout()`，`AuthGuard` 自动重定向到登录页

### 修改组件：`SettingsPanel`

**文件：** `frontend/src/components/settings/settings-panel.tsx`

- 在标签列表中新增 `{ key: 'account', label: '账户', icon: User }` （lucide `User` 图标）
- 排在现有"通用设置"和"模型配置"之后
- 内容区域新增条件渲染：`activeTab === 'account'` 时渲染 `<AccountSettings />`

### 涉及文件

| 操作 | 文件 |
|------|------|
| 新建 | `frontend/src/components/settings/account-settings.tsx` |
| 修改 | `frontend/src/components/settings/settings-panel.tsx` |

### 不涉及的改动

- 后端无需改动
- 无需新增 API
- 无需新增类型定义（复用 `AuthUser`）
