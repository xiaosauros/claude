# better-sqlite3 在 Electron/Node 的 ABI 问题

> 适用场景：Electron 项目使用 better-sqlite3 等原生模块、dev 与打包运行时不一致。

- **ABI 不兼容**：better-sqlite3 是原生模块，`.node` 绑定 `NODE_MODULE_VERSION` 的 ABI 不同（本项目 Electron 33≈130，Node≈141），同一份 `.node` 无法被两种运行时共用。
- **双缓存方案**：各编译一份缓存到 `.native-cache/`（如 `better_sqlite3-node.node`），每条 dev 脚本启动前用 `swap-sqlite.mjs` 按运行时把对应那份换上去。
- **swap 判定**：swap 脚本以二进制内容比对判断当前 ABI，不信任 marker 文件（`electron-rebuild` 会外覆盖二进制）；缓存命中只做拷贝，缺失才编译（electron 用 `electron-rebuild`，失败改用 `node-gyp rebuild`）。
- **打包与重编**：esbuild 打包主进程时把 better-sqlite3 等列为 external，运行时 require；换 Node 版本 → `rm -rf .native-cache` 重编；CI/打包必须按宿主机 ABI 重新编译缓存。
