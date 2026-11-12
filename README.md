# danmaku-core

供 BiliDanmu 桌面应用与弹幕网站共同使用的公共仓库，包含两个独立包。

| 包 | 路径 | 职责 |
| --- | --- | --- |
| `danmaku-core` | `crates/danmaku-core` | 平台无关的弹幕事件模型与 Bilibili 协议解析 |
| `@danmaku-core/ui` | `packages/ui` | React 弹幕展示与组件样式的包骨架 |

Rust 包已从 BiliDanmu 抽取事件模型、Bilibili 二进制协议与命令解析，客户端已通过固定 Git 修订接入。React 包已建立库入口、类型声明及样式导出，展示组件待后续抽取。

## 目录

```text
danmaku-core/
├── crates/danmaku-core/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── message.rs
│   │   ├── protocol.rs
│   │   └── pb.rs
│   └── tests/public_api.rs
├── packages/ui/
│   ├── package.json
│   ├── tsconfig.json
│   ├── scripts/copy-styles.mjs
│   └── src/
│       ├── index.ts
│       └── styles.css
├── Cargo.toml
├── Cargo.lock
├── package.json
└── package-lock.json
```

## 构建与校验

使用已安装的 Rust/Cargo、Node.js 和 npm。在仓库根目录执行以下命令。

```sh
npm ci
npm run typecheck
npm run build
cargo check --workspace --locked
cargo build --workspace --locked
cargo test --workspace --locked
```

前端构建输出为 `packages/ui/dist/index.js`、`index.d.ts` 和 `styles.css`。包使用 ESM，React 19 作为 peer dependency，由调用方提供。Rust 构建输出位于根目录 `target/`。

```sh
npm pack --workspace @danmaku-core/ui --dry-run
```

该命令会先构建前端包，再检查包内容。移除 `--dry-run` 可生成供其他项目安装的 `.tgz` 文件。

## 应用引用

桌面应用在 `bilidanmu/src-tauri/Cargo.toml` 中使用本仓库的固定 Git 修订，具体提交以客户端配置及 `Cargo.lock` 为准。Cargo 会获取该修订中的 `danmaku-core` 包。其他 Rust 应用也可通过 Git dependency 的 `git` 与 `rev` 引用本仓库。

本地联调时将两个仓库放在同级目录。从客户端的 `src-tauri/` 运行以下 PowerShell 命令，让 Cargo 使用本地公共源码，并将联调锁文件保存在被忽略的构建目录中。该锁文件配置需要 Cargo 1.97 及以上版本。

```powershell
New-Item -ItemType Directory -Force 'target/local-core' | Out-Null
Copy-Item -LiteralPath 'Cargo.lock' -Destination 'target/local-core/Cargo.lock'
cargo check `
  --config "patch.'https://github.com/sfqy211/danmaku-core.git'.danmaku-core.path='../../danmaku-core/crates/danmaku-core'" `
  --config "resolver.lockfile-path='target/local-core/Cargo.lock'"
```

同样的两个 `--config` 参数可用于 `cargo test --lib`。日常直接执行 Cargo 命令时会使用客户端固定的远程修订。

### Rust API

- `danmaku_core::{DanmakuEvent, Medal}` 及 `danmaku_core::message` 提供共享事件类型，保留客户端现有 Serde 字段、事件名称与金额语义，消息时间统一为 Unix 秒。
- `protocol::{PacketHeader, ParsedPacket}`、`HEADER_SIZE` 和 `OP_*` 常量提供 Bilibili 包头与解包结果。
- `protocol::{auth_packet, heartbeat_packet, make_packet, decode_packets}` 负责二进制封包、解包及 Brotli/Zlib 压缩载荷。
- `protocol::{parse_danmaku_command, parse_danmaku_events}` 负责命令转事件。调用 `parse_danmaku_events` 可保留 `SEND_GIFT_V2` 一条消息产生多件礼物的结果。
- `protocol::parse_live_status` 供调用方完成房间筛选后构造开播/下播系统事件。

解析覆盖现有 `DANMU_MSG`、`SEND_GIFT`、`SEND_GIFT_V2`、`INTERACT_WORD`、`INTERACT_WORD_V2`、普通与日语 SC、`GUARD_BUY`、`LIVE`、`PREPARING` 及点赞命令。Protobuf 解码作为包内实现维护，保留原解析行为与测试样本来源说明。

客户端的 `models::message` 和 `bili::protocol` 保留薄重导出，现有调用路径直接使用共享实现。WebSocket 生命周期、房间筛选、SC 去重及 Tauri 事件广播继续由客户端承接。

### React 包

先在公共仓库完成 `npm ci` 和 `npm run build`，再在 React 应用目录安装前端包。

```sh
npm install D:/AHEU/code/danmaku-core/packages/ui
```

本地目录依赖使用链接，共同开发时在公共仓库重新构建即可更新产物。包也可通过 `npm pack` 生成的 `.tgz` 安装，后续再配置包发布。

```ts
import "@danmaku-core/ui";
import "@danmaku-core/ui/styles.css";
```

当前入口可解析，具体组件导出会随实际抽取加入。样式通过独立子路径显式导入。

## 后续抽取

Rust 侧后续继续核对网站场次文件契约，处理事件名称、时间戳单位、金额语义与历史文件兼容，再抽取文件解析及通用规则。Tauri 事件、窗口、凭据、网络连接管理和数据库服务由应用层承接。

React 侧从现有弹幕展示中提取受控组件，通过 props 接收数据、配置和操作回调。应用状态、路由、图片代理与桌面能力由调用方接入，公共样式按组件范围组织。

## 许可与来源

本仓库保留 BiliDanmu 的 AGPLv3 许可、上游 MIT 与 CC BY-NC 4.0 来源及原有声明，完整文本见 `LICENSE`、`LICENSES/` 和 `THIRD_PARTY_NOTICES.md`。
