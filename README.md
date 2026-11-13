# danmaku-core

供 BiliDanmu 桌面应用与弹幕网站共同使用的公共仓库，包含两个独立包。

| 包 | 路径 | 职责 |
| --- | --- | --- |
| `danmaku-core` | `crates/danmaku-core` | 平台无关的弹幕事件模型与 Bilibili 协议解析 |
| `@danmaku-core/ui` | `packages/ui` | React 弹幕条目、表情正文、粉丝牌、金额与配色规则 |

Rust 包已从 BiliDanmu 抽取事件模型、Bilibili 二进制协议与命令解析，客户端通过固定 Git 修订接入。React 包已抽取弹幕展示组件、显示规则与独立样式，客户端通过同级目录的本地包接入。

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
│       ├── DanmakuMessageItem.tsx
│       ├── InlineEmotText.tsx
│       ├── MedalBadge.tsx
│       ├── types.ts
│       ├── price-chip.ts
│       ├── display.ts
│       ├── image.tsx
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
npm test
cargo check --workspace --locked
cargo build --workspace --locked
cargo test --workspace --locked
```

前端构建输出位于 `packages/ui/dist/`，包含 JS、类型声明、独立 CSS 与许可文本。包使用 ESM，React 19 与 React DOM 19 作为 peer dependency，由调用方提供。`npm test` 使用 Node 内置测试运行器验证金额、配色、表情、图片适配和条目显示契约。Rust 构建输出位于根目录 `target/`。

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

先从本公共仓库检出调用方固定的源码修订，完成 `npm ci` 和 `npm run build`，再在 React 应用目录安装前端包。

```sh
npm install D:/AHEU/code/danmaku-core/packages/ui
```

本地目录依赖使用链接，共同开发时在公共仓库重新构建即可更新产物。包也可通过 `npm pack` 生成的 `.tgz` 安装，后续再配置包发布。

```ts
import "@danmaku-core/ui";
import "@danmaku-core/ui/styles.css";
```

公共 API 包括以下组件和规则。

- `DanmakuMessageItem` 展示普通弹幕、纯表情、礼物、SC、舰长、活动及开播/下播标记。
- `InlineEmotText` 与 `isEmoticonOnlyContent` 保留最长表情 token 优先、原始图片尺寸以及 image/text/hidden 三种展示模式。
- `MedalBadge` 保留七档等级色、未点亮状态与字号缩放。
- `DanmakuMessage`、`Medal`、`InlineEmoticon`、`BigEmoticonOptions`、`PriceColors` 等类型保留客户端现有字段。
- `formatMessagePrice`、`resolveMessageAccent`、`normalizePriceColors`、`DEFAULT_PRICE_COLORS` 和 `PRICE_TIERS` 保留 SC 人民币、礼物/舰长金瓜子单价乘数量以及旧配色补全规则。
- `formatTimestamp`、`formatDateTime` 和 `parseBubbleColor` 保留本地时间格式与 Android AARRGGBB 到 CSS 颜色的转换。

金额规则可从 `@danmaku-core/ui/price-chip` 单独导入，时间与气泡规则可从 `@danmaku-core/ui/display` 导入，类型可从 `@danmaku-core/ui/types` 导入。

`DanmakuMessageItem` 通过 `appearance` 接收显示配置，字段沿用客户端的 `showMedal`、各项 `hide*`、`emoticonStyle`、`plainPriceMessages` 和 `priceColors`。图片能力通过 `imageComponent` 与 `resolveImageUrl` 注入，`persistent` 仍按原始 URL 的缓存集合判断。默认图片实现使用浏览器 `<img>`。荣耀等级图标沿用 `wealth-level://<level>` 标识，宿主通过图片组件或 URL 解析回调映射到自己的资源。

`onMention`、`onBlockUser`、`onOpenUrl` 和 `onCopy` 将操作交给调用方。屏蔽菜单项在提供 `onBlockUser` 时显示。默认打开链接与复制使用浏览器能力，右键菜单支持键盘打开、方向键导航和 Escape 关闭。

样式通过 `@danmaku-core/ui/styles.css` 显式导入，所有选择器限定在组件类名内。主题默认跟随 `.dark`，也可为条目传入 `theme="light"` 或 `theme="dark"`。调用方可在文档根层设置成对的 `--danmaku-text-light/dark`、`--danmaku-muted-light/dark`、`--danmaku-menu-bg-light/dark` 等变量。隐藏用户等级颜色时，用户名使用宿主 `--ink`，缺省时回退主题正文色。`--sc-accent` 与 `--bubble-*` 继续承接逐条配色。字体由容器继承，`fontSize` 控制文字与标记缩放。

客户端注入原有 `ProxiedImage`、Tauri opener 和屏蔽持久化回调，设置对象与数据库字段保持现有契约。Vite 对 `react` 和 `react-dom` 配置去重，以支持本地链接包。

客户端前端依赖为 `file:../danmaku-core/packages/ui`，typecheck、renderer build 和 renderer dev 入口会先构建共享包。本地和云端都使用同级目录布局，公共源码修订与客户端 Rust 依赖的固定修订保持一致。构建时先安装并构建公共仓库，再安装客户端依赖。文档首页通过客户端价格模块读取默认值，独立构建文档时也需要先准备共享包与客户端依赖，再在 `docs/` 安装依赖并构建。CI 检出两个仓库时，将调用方与 `danmaku-core` 放在 workspace 内的相邻子目录，即可使用同一套相对路径。

## 后续抽取

Rust 侧后续继续核对网站场次文件契约，处理事件名称、时间戳单位、金额语义与历史文件兼容，再抽取文件解析及通用规则。Tauri 事件、窗口、凭据、网络连接管理和数据库服务由应用层承接。

React 侧后续可继续抽取其他可复用展示模块。应用状态、路由、图片代理与桌面能力由调用方接入，公共样式按组件范围组织。

## 许可与来源

本仓库保留 BiliDanmu 的 AGPLv3 许可、上游 MIT 与 CC BY-NC 4.0 来源及原有声明，完整文本见 `LICENSE`、`LICENSES/` 和 `THIRD_PARTY_NOTICES.md`。
