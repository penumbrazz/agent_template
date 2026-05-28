# Observability

模板使用三层观测设计：

- **OpenTelemetry**：统一 trace/metrics 底层。已在第一批工程底座中集成，默认关闭。
- **GlitchTip**：错误监控、性能追踪、前端 source map、release tracking（兼容 Sentry SDK）。详见 [glitchtip/README.md](glitchtip/README.md)。
- **Langfuse**：AI 调用链、提示词、模型调用、工具调用、工作流 trace。详见 [langfuse/README.md](langfuse/README.md)。

第一批只迁移 OpenTelemetry。GlitchTip 和 Langfuse 作为可选自托管栈保留说明，不默认启动。
