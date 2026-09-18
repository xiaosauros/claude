# 前端总则

> 适用场景：所有前端相关任务常驻生效。

- **禁用原生弹窗与反馈**：不得使用 `alert`、`confirm`、`prompt`、原生 `message` 等浏览器自带元素；所有提示、确认、输入交互一律使用项目组件库提供的组件（Modal、Message、Dialog、Notification 等），保证视觉与行为统一。
- **样式初始化重置**：HTML 元素自带默认样式（margin/padding、列表符号、表单控件、标题字号等）须通过 reset 或 normalize 统一重置，消除浏览器间差异后再应用项目样式。
- **遵循设计 token 规范**：若项目存在 `DESIGN.md`（或同类设计 token 规范文件），颜色、间距、字号、圆角、阴影、动效等视觉取值须引用其中定义的 token，不得硬编码魔法值；新增或调整 token 时同步更新该文件。
