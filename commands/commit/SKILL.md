---
name: commit
description: 按项目规范提交本次修改，生成 `YYYYMMdd：类型：描述` 格式的 commit message
---

帮用户提交本次修改的代码。

## 流程

1. **一次调用获取改动信息**，不要分多次执行：
   ```bash
   git status --short && git diff --stat HEAD && git diff HEAD | head -c 6000
   ```
   diff 被截断时以 `--stat` 判断改动范围，不追加读取完整 diff。
2. **生成 message**：格式 `YYYYMMdd：类型：描述`（与 AGENTS.md 会话命名规范一致）。
   - 类型只能取：`功能 | 修复 | 优化 | 重构 | 文档 | 样式 | 测试`
   - 描述不超过 50 字，简明说明变更内容。
3. **确认后提交**：展示 message 与待提交文件清单，**等用户确认**后再执行 `git add` 和 `git commit`；**不要自动 push**。

## 规则

- 只 add 相关文件，禁止 `git add -A`；混入无关改动时先提示用户确认。
- 用户已自行 stage 的内容，只 commit 已 stage 部分。
- 无改动时直接告知，不执行提交。
- 发现敏感文件（`.env`、密钥、证书）时警告用户并跳过。

## Bash 提交方式

必须用 HEREDOC 传 message：

```bash
git commit -m "$(cat <<'EOF'
20260410：修复：修改派单字段取值逻辑
EOF
)"
```
