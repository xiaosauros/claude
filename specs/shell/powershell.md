# PowerShell 执行规范

用 PowerShell 执行命令时遵守。

## 命令选择

- `npm`、`npx`、`pnpm` 用 `npm.cmd` 等带 `.cmd` 形式：裸名解析到 `.ps1`，启动慢且可能被执行策略拦截。
- Python 用 `python.exe` 或 `py`：裸 `python` 可能命中 WindowsApps 存根，静默失败或弹商店。
- 搜索优先 `rg`；通配目录先用 `Get-ChildItem -Filter` 展开为真实路径。
- `sed`、`awk`、`grep`、`chmod` 等 Unix 专用工具默认不存在，确认已安装才可用。
- `rm`、`cp`、`mv`、`ls`、`cat`、`curl` 是 PowerShell 别名，行为与 Unix 不同；需要真实工具时显式写 `curl.exe` 等。

## 语法

- 正则用单引号包裹，避免 `|`、`(`、`)` 被解析为管道或子表达式。
- 语句块（`foreach`、`if` 等）作管道输入需用 `$()` 或 `@()` 包裹。
- 转义符是反引号 `` ` `` 而非 `\`；原样传参给外部命令用 `--%`。
- 命令结果可能不是数组（0 或 1 个对象时），遍历或取 `.Count` 前用 `@()` 包裹。
- `-eq`、`-like` 默认不区分大小写，需要时用 `-ceq`、`-clike`。
- `&&`、`||` 仅 PowerShell 7+；5.1 用 `;` 分隔，以 `$LASTEXITCODE` 判断成败（`$?` 不是退出码）。
- 路径含空格用调用操作符：`& "C:\Program Files\xxx\x.exe"`。

## 失败与重试

- 失败先定位原因（语法、权限、沙盒限制）再针对性调整；不靠换引号、换包装器等表面改写反复重试同一命令。
- 相关的只读检查（查看文件、状态、日志等）合并为一次调用执行。
- 读取/修改文件优先用内置文件工具（Read/Edit），不用 PowerShell 命令；大文件用 offset/limit 只读需要的段。
- 输出可能超长（diff、日志、目录列表）时主动截断：`| Select-Object -First 50`。
- 测试只跑与改动文件相关的用例，除非需要更广泛的验证。

## 编码

- 含中文的 `.ps1` 必须存 UTF-8 with BOM，否则 5.1 按 ANSI 解析导致乱码。
- `>` 重定向在 5.1 默认 UTF-16LE；UTF-8 文件用 `Out-File -Encoding utf8`。
- 中文乱码先执行 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`。

## 复杂任务

- 复杂命令写入 `.ps1` 执行，不用多层 `-Command`；执行策略报错用 `powershell -ExecutionPolicy Bypass -File xxx.ps1`。
- JSON、CSV、Markdown 和复杂日志优先交 Python 或 Node.js 处理。
- `$env:X` 仅当前进程有效；持久化用 `[Environment]::SetEnvironmentVariable`。
