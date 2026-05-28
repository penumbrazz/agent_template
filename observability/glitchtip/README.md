# GlitchTip 自托管

## 概述

GlitchTip 用于错误监控、性能追踪和前端 source map 上传。它兼容 Sentry SDK，前后端无需更换依赖即可接入。

## 自托管方式

使用官方 [glitchtip/glitchtip](https://glitchtip.com/) Docker Compose 部署：

```bash
# 参考官方文档: https://glitchtip.com/documentation/install
docker compose up -d
```

## 接入方式

1. 在 GlitchTip 中创建项目，获取 DSN。
2. 将 DSN 填入环境变量 `SENTRY_DSN`（后端）或 `NEXT_PUBLIC_SENTRY_DSN`（前端）。
3. SDK 使用 `sentry-sdk`（Python）或 `@sentry/nextjs`（前端），无需修改代码。

## 注意事项

- 不要把 GlitchTip compose 内联进主 `docker-compose.yml`，避免端口和资源冲突。
- 默认不与应用一起启动。
- 部署完成后配置 DSN 环境变量即可接入。
