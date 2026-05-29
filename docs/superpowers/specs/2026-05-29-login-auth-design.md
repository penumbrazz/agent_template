# 登录认证功能设计

## 概述

为全栈 AI 应用模板添加完整的登录认证流程，包括后端认证接口改造、默认管理员种子数据、前端登录页面和认证状态管理。

**目标：** 应用启动后，用户必须先登录才能访问任何功能页面。

## 决策记录

| 决策 | 选择 | 理由 |
|---|---|---|
| Token 存储方式 | httpOnly Cookie | 防 XSS，安全性最高 |
| 登录页风格 | 独立登录页 | 类似 SaaS 产品体验 |
| 注册功能 | 关闭注册 | 仅管理员账号 |
| 会话过期策略 | 自动续期（无感刷新） | 用户体验好 |
| 实现方案 | Cookie 双模式（access + refresh） | 安全性与复杂度平衡 |

## 后端设计

### 认证流程

```
登录 → POST /api/auth/login (username + password)
     ← Set-Cookie: refresh_token (httpOnly, SameSite=Lax, 30天, Path=/api/auth)
     ← Body: { access_token, token_type: "bearer", expires_in }

刷新 → POST /api/auth/refresh (浏览器自动带 cookie)
     ← 新 Set-Cookie: refresh_token
     ← Body: { access_token, token_type: "bearer", expires_in }

登出 → POST /api/auth/logout
     ← 清除 cookie
```

### Token 策略

- **Access Token**：有效期 30 分钟，JWT 格式，存前端内存变量
- **Refresh Token**：有效期 30 天，JWT 格式，存 httpOnly cookie
- 密码哈希：bcrypt（已有）

### 后端改动清单

| 文件 | 改动 |
|---|---|
| `backend/app/services/auth.py` | 新增 `create_refresh_token`、`verify_refresh_token`；修改 `login` 返回 cookie |
| `backend/app/api/endpoints/auth.py` | 修改 login 响应设置 cookie；新增 `/refresh`、`/logout` 端点 |
| `backend/app/api/deps.py` | 新增从 cookie 读取 refresh token 的依赖 |
| `backend/app/core/config.py` | 新增 `REFRESH_TOKEN_EXPIRE_DAYS`（默认 30 天） |
| `backend/app/db/seed.py`（新建） | 启动时检查并创建默认 admin 用户 |
| `backend/app/main.py` | lifespan 中调用 seed 初始化 |

### 默认管理员种子数据

启动时检查数据库是否存在用户，若不存在则创建：

- username: `admin`
- password: `admin`（bcrypt 哈希）
- `is_superuser`: `True`
- `is_active`: `True`

### API 端点变更

| 端点 | 方法 | 认证 | 说明 |
|---|---|---|---|
| `/api/auth/login` | POST | 无 | 登录，返回 access_token + 设置 refresh cookie |
| `/api/auth/refresh` | POST | cookie | 刷新 access_token |
| `/api/auth/logout` | POST | cookie | 清除 cookie，登出 |
| `/api/auth/me` | GET | Bearer | 获取当前用户信息（不变） |
| `/api/auth/register` | POST | 无 | 保留端点但不在前端暴露 |

## 前端设计

### 目录结构

```
src/features/auth/
├── auth-context.tsx     # React Context + Provider
├── use-auth.ts          # 自定义 hook
└── auth-guard.tsx       # 路由守卫组件

src/app/login/
└── page.tsx             # 独立登录页面
```

### 认证状态管理

**AuthContext** 提供：

- `user`: 当前用户信息（null 表示未登录）
- `isAuthenticated`: 是否已认证
- `isLoading`: 初始化加载状态
- `login(username, password)`: 登录
- `logout()`: 登出

初始化流程：应用启动时调用 `/api/auth/me` 检查是否有有效会话。

### API 客户端改造

修改 `src/apis/client.ts`：

- **请求拦截器**：从内存中读取 access_token，添加 `Authorization: Bearer` header
- **响应拦截器**：
  - 收到 401 → 调用 `/api/auth/refresh` → 成功则重试原请求，失败则跳转 `/login`
  - 防止并发刷新：使用 Promise 共享同一刷新请求
- Access token 存在内存变量中（模块级变量），refresh token 在 httpOnly cookie 中

### 登录页面

- 全屏居中的登录表单
- 遵循 DESIGN.md 设计系统：
  - Canvas 奶油画布背景（`#faf9f5`）
  - 衬线体标题
  - 珊瑚色（`#cc785c`）登录按钮
  - Surface Card 风格的表单卡片
- 交互元素添加 `data-testid`
- 错误提示使用 toast
- 登录成功后跳转到 `/`

### 路由保护

- `layout.tsx` 中包裹 `AuthProvider`
- 首页 `page.tsx` 外层添加 `AuthGuard`
- 未认证 → 重定向 `/login`
- 已认证访问 `/login` → 重定向 `/`
- `/login` 路由不需要 `AuthGuard`

## 测试计划

### 后端测试

- 种子数据：验证首次启动创建 admin 用户
- 种子数据：验证已有用户时不重复创建
- `/api/auth/login`：正确凭证返回 access_token 和 cookie
- `/api/auth/login`：错误凭证返回 401
- `/api/auth/refresh`：有效 cookie 返回新 access_token
- `/api/auth/refresh`：无效/过期 cookie 返回 401
- `/api/auth/logout`：清除 cookie
- 现有端点仍需 Bearer token 访问

### 前端测试

- 登录页渲染
- 登录成功流程
- 登录失败提示
- 未认证访问重定向
- 已认证访问 `/login` 重定向
- API 401 自动刷新 token
