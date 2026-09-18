# Next.js Dev / HMR / 构建污染问题

> 适用场景：Next.js 15 monorepo 项目的 dev 启动、HMR、生产构建与 Electron 打包。

- **dev 必须用 Turbopack**：`next dev --turbopack`。webpack 的 HMR 在 `transpilePackages` 跨包重编时会出现 chunk 引用失效（`Cannot read properties of undefined (reading 'call')`），且改码后连续 500 不自愈；Turbopack 不存在此问题。
- **build 与 dev 隔离**：`next build` 与 `next dev` 共用 `.next`，生产构建写入的 `BUILD_ID` 会污染 dev → 启动即 `MODULE_NOT_FOUND`。dev 前用 `predev` 守卫，仅当检测到 `BUILD_ID` 才清理 `.next`，保留正常增量缓存。
- **Electron 独立产物**：Electron 构建用独立 `distDir: '.next-electron'`，从源头避免 export 产物污染 dev 的 `.next`；`.next-electron/` 加入 gitignore 与 turbo outputs。
- **Turbopack root**：在 `next.config.mjs` 显式指定 `turbopack.root` 为 monorepo 根，消除多 lockfile 警告。
