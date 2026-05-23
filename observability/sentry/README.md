# Sentry 自托管

## 概述

Sentry 用于错误监控、性能追踪和前端 source map 上传。

## 自托管方式

使用官方 [getsentry/self-hosted](https://github.com/getsentry/self-hosted) 仓库部署：

```bash
git clone https://github.com/getsentry/self-hosted.git
cd self-hosted
./install.sh
docker compose up -d
```

## 注意事项

- 不要把完整 Sentry compose 内联进主 `docker-compose.yml`，避免端口和资源冲突。
- 默认不与应用一起启动。
- 部署完成后配置 DSN 环境变量即可接入。
