# Claude Code 配置与扩展示例

本目录用于收集和说明 Claude Code 中常用的配置项、自定义脚本及扩展内容，方便快速查阅和复用。

## 目录

| 文件/目录 | 类型 | 说明 |
|-----------|------|------|
| `settings.json` | 配置 | 主配置示例（含权限、环境变量、状态栏等） |
| `settings-kimi.json` | 配置 | Kimi 模型相关的配置示例 |
| `settings-arks.json` | 配置 | Arks 模型相关的配置示例 |
| `statusline.js` | 脚本 | 自定义 Claude Code 状态栏输出 |
| `README.md` | 文档 | 本说明文件 |

## 常用配置项

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| `includeCoAuthoredBy` | 关闭/开启 git 提交记录中 Claude 的提交者记录 | `true` / `false` |
| `env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | 自动压缩上下文的百分比 | `75` |
| `env.CLAUDE_CODE_AUTO_COMPACT_WINDOW` | 自动压缩上下文的 token 阈值 | `200000` |
| `env.CLAUDE_CODE_MAX_RETRIES` | API 请求失败时的最大重试次数 | `5` |
| `permissions.defaultMode` | 默认权限模式，可设为最大权限模式 | `"bypassPermissions"` / `"auto"` |

### `CLAUDE_CODE_MAX_RETRIES` 说明

- **作用**：控制 Claude Code 向模型 API 发起请求失败时的最大重试次数。
- **触发重试的错误**：限流（429）、服务端错误（5xx）、过载（529）、网络抖动等瞬时错误；非瞬时错误（如鉴权失败 401）不会重试。
- **取值**：非负整数，值越大重试次数越多，但同时会延长单次请求在最坏情况下的等待时间（通常配合指数退避）。
- **建议**：网络不稳定或经代理/中转链路较长时适当调高（如 `5`～`10`）；默认值由 Claude Code 内置行为决定，未设置时按其默认重试策略执行。
- **生效范围**：通过 `settings.json` 的 `env` 配置，作用于整个会话；也可在启动前通过系统环境变量 `CLAUDE_CODE_MAX_RETRIES=5 claude` 临时指定。

## 启动命令

| 用途 | 命令 |
|------|------|
| 使用指定 settings 文件覆盖默认配置（仅覆盖同名 key） | `claude --settings ~/.claude/settings-kimi.json` |
| 高权限启动（跳过权限确认） | `claude --dangerously-skip-permissions` |
| 高权限启动（指定权限模式） | `claude --permission-mode auto` 或 `claude --permission-mode bypassPermissions` |

> 注：`--settings settings.json` 会覆盖 `~/.claude/settings.json` 中的同名配置项。

## 自定义状态栏（statusline）

`statusline.js` 是一个自定义 Claude Code 状态栏脚本，从标准输入读取 JSON 数据，输出格式化的状态栏信息。

### 输出格式

```
{version} | {model} | {context_used_percentage} | {cwd} [| {branch}] [| {worktree}]
```

### 读取字段

| JSON 字段 | 说明 |
|-----------|------|
| `version` | Claude Code 版本 |
| `model.display_name` / `model.id` | 当前模型 |
| `context_window.used_percentage` | 上下文使用百分比 |
| `workspace.current_dir` / `cwd` | 当前工作目录 |
| `worktree.branch` | 当前 git 分支（优先） |
| `worktree.name` / `workspace.git_worktree` | worktree 名称 |

### 启用方式

在 `settings.json` 中配置 `statusLine`：

```json
{
    "statusLine": {
        "type": "command",
        "command": "node ~/.claude/statusline.js"
    }
}
```

### 本地测试

```bash
echo '{"version":"0.1.0","model":{"display_name":"Claude Sonnet"},"context_window":{"used_percentage":42.5},"workspace":{"current_dir":"/home/user/project"}}' | node statusline.js
```

## 参考

- [Claude Code 官方文档](https://docs.anthropic.com/en/docs/claude-code)
- [Claude Code 配置参考](https://docs.anthropic.com/en/docs/claude-code/settings)
