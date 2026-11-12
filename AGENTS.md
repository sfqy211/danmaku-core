# AGENTS.md

- Rust workspace 位于根目录，库包为 `crates/danmaku-core`。
- npm workspace 位于根目录，React 包为 `packages/ui`。
- 安装依赖使用 `npm ci`。
- 修改后运行 `npm run typecheck`、`npm run build`、`cargo check --workspace --locked` 和 `cargo build --workspace --locked`。
- 修改导出或打包配置后，运行 `npm pack --workspace @danmaku-core/ui --dry-run` 并检查产物。
- 业务抽取以两个调用方的实际契约为依据，保留历史数据兼容。
- Rust 库保持平台无关，应用集成能力通过调用方适配。React 组件通过 props 接收应用数据与回调。
- 仅在用户当前消息明确要求时执行 `git commit`，采用中文描述的 conventional commit 单行主题。
