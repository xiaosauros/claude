# PowerShell 执行规范

用 PowerShell 执行命令时遵守。

## 语法

- 正则用单引号包裹，避免 `|`、`(`、`)` 被解析为管道或子表达式。
- 语句块（`foreach`、`if` 等）作管道输入需用 `$()` 或 `@()` 包裹。
- 转义符是反引号 `` ` `` 而非 `\`；原样传参给外部命令用 `--%`。
- 命令结果可能不是数组（0 或 1 个对象时），遍历或取 `.Count` 前用 `@()` 包裹。
- `-eq`、`-like` 默认不区分大小写，需要时用 `-ceq`、`-clike`。
- `&&`、`||` 仅 PowerShell 7+；5.1 用 `;` 分隔，以 `$LASTEXITCODE` 判断成败（`$?` 不是退出码）。
- 路径含空格用调用操作符：`& "C:\Program Files\xxx\x.exe"`。

## 与 Unix 工具的区别

- `rm`、`curl`、`ls`、`cat`、`cp` 等是 PowerShell 别名，行为与 Unix 不同；需要真实工具时显式写 `curl.exe` 等。
- rg 通配目录先用 `Get-ChildItem -Filter` 展开为真实路径。

## 编码

- 含中文的 `.ps1` 必须存 UTF-8 with BOM，否则 5.1 按 ANSI 解析导致乱码。
- `>` 重定向在 5.1 默认 UTF-16LE；UTF-8 文件用 `Out-File -Encoding utf8`。
- 中文乱码先执行 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`。

## 复杂任务

- 复杂命令写入 `.ps1` 执行，不用多层 `-Command`；执行策略报错用 `powershell -ExecutionPolicy Bypass -File xxx.ps1`。
- JSON、CSV、Markdown 和复杂日志优先交 Python 或 Node.js 处理。
- `$env:X` 仅当前进程有效；持久化用 `[Environment]::SetEnvironmentVariable`。
