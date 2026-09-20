---
name: commit
description: 按项目规范提交本次修改，生成 `YYYYMMdd：类型：描述` 格式的 commit message
---

帮用户提交本次修改的代码。

## 流程

1. **一次调用获取改动信息与作者身份**，不分多次执行。Bash 优先，不可用时用 PowerShell。
   - Bash：
     ```bash
     echo "user.name=[$(git config user.name)] user.email=[$(git config user.email)]"; git status --short && git diff --stat HEAD && git diff HEAD | head -c 6000
     ```
   - PowerShell：
     ```powershell
     "user.name=[$(git config user.name)] user.email=[$(git config user.email)]"; git status --short; git diff --stat HEAD; git diff HEAD | Select-Object -First 80
     ```
     输出中文乱码时先执行 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`。
   diff 被截断时以 `--stat` 判断改动范围，不追加读取完整 diff。
2. **生成 message**：格式 `YYYYMMdd：类型：描述`。
   - 类型限定：`功能 | 修复 | 优化 | 重构 | 文档 | 样式 | 测试`。
   - 描述不超过 50 字，简明说明变更内容。
3. **确认后提交**：展示 message 与待提交文件清单，**等用户确认**后再 `git add`、`git commit`；**不自动 push**。

## 规则

- 只 add 相关文件，禁止 `git add -A`；混入无关改动时先提示用户确认。
- 用户已自行 stage 的内容，只 commit 已 stage 部分。
- 无改动时直接告知，不执行提交。
- 发现敏感文件（`.env`、密钥、证书）时警告用户并跳过。
- **提交前检查作者身份**：作者身份已并入流程 1 的组合命令（输出首行 `user.name=[...] user.email=[...]`，方括号为空即未配置）。任一为空说明沙箱环境（如 Codex）读不到全局/includeIf 配置，提交会报 `Author identity unknown`；此时取**当前仓库的**作者身份写入仓库级配置后再提交，取值顺序：`git log -1 --format='%an|%ae'` 的历史作者 → 会话上下文中的 Git 用户 → 询问用户：
  ```powershell
  git config user.name "<姓名>"
  git config user.email "<邮箱>"
  ```
  ```bash
  git config user.name "<姓名>" && git config user.email "<邮箱>"
  ```

## 提交方式

Bash 优先，不可用时用 PowerShell；两者都用多行字符串安全传递 message。

### Bash：HEREDOC

```bash
git commit -m "$(cat <<'EOF'
20260410：修复：修改派单字段取值逻辑
EOF
)"
```

### PowerShell：here-string

```powershell
git commit -m @'
20260410：修复：修改派单字段取值逻辑
'@
```

注意：

- `-m` 后禁止直接跟含中文的普通双引号字符串（如 `git commit -m "20260410：修复：..."`）：PowerShell 5.1 默认 GBK 编码，中文会乱码。
- 闭合 `'@` 必须顶格在行首。
- 多行 message 直接换行即可，无需 `\n` 或反引号拼接。
