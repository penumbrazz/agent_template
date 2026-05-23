# Langfuse 自托管

## 概述

Langfuse 用于 AI 调用链追踪，包括提示词、模型调用、工具调用、工作流 trace。

## 自托管方式

使用官方 Docker Compose：

```bash
git clone https://github.com/langfuse/langfuse.git
cd langfuse
docker compose up -d
```

或参考 [Langfuse 自托管文档](https://langfuse.com/self-hosting)。

## 注意事项

- Langfuse 默认不与应用一起启动，避免端口和资源冲突。
- 部署完成后配置 `LANGFUSE_PUBLIC_KEY` 和 `LANGFUSE_SECRET_KEY` 环境变量即可接入。
- 适合本地开发或单机部署场景。
