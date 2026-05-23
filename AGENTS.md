# AGENTS.md

总是用中文回复用户、编写文档。

## 项目定位

这是一个全栈 AI 应用模板，不是 Wegent 的删减版。Wegent 只作为迁移参考。

## 第一批边界

- 保留 FastAPI、Next.js、shared、OpenTelemetry、Docker、测试和文档底座。
- 暂不实现多智能体编排、提示词模板、模型供应商、知识库、工具能力等业务模块。
- 不引入 Wegent 品牌、Logo、初始化数据和专有业务名。

## 代码规范

- Python 使用 uv、Black、isort、类型注解。
- TypeScript 使用严格模式、函数组件、单引号、不使用分号。
- 代码注释使用英文，文档使用中文优先。
- 交互式前端元素必须添加 `data-testid`。
