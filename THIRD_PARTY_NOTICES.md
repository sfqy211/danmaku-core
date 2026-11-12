# 来源与许可声明

## BiliDanmu

`crates/danmaku-core/src/message.rs`、`protocol.rs` 与相关测试从 sfqy211 维护的 BiliDanmu 抽取，保留原有字段、解析行为和来源注释。根目录 `LICENSE` 原样保留其 GNU Affero General Public License v3.0 全文。

[BiliDanmu](https://github.com/sfqy211/bilidanmu)

## JLiverTool

`crates/danmaku-core/src/pb.rs` 的实现参考 JLiverTool，`protocol.rs` 中 `SEND_GIFT_V2` 的 `SAMPLE_PB` 测试样本也来自该项目。原始版权为 `Copyright (c) 2021-2023 Xinrea`，MIT 许可全文保留在 `LICENSES/JLiverTool-MIT.txt`。

[JLiverTool](https://github.com/Xinrea/JLiverTool)

## bilibili-API-collect

协议字段参考以及 `protocol.rs` 中 `parse_super_chat_jpn_variant` 的日语 SC 测试样本来自 bilibili-API-collect。原项目采用 Creative Commons Attribution-NonCommercial 4.0 International，许可全文保留在 `LICENSES/CC-BY-NC-4.0.txt`。样本随解析测试迁移，源文件中的来源说明予以保留。

BiliDanmu 原 README 的相关声明原样保留如下。

> `bilibili-API-collect` 采用 CC BY-NC 4.0 许可（禁止商业使用），本项目的 B 站 API 文档参考自该项目，同样禁止将本项目用于商业用途。

[bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) · [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)

`SEND_GIFT_V2` 字段说明还保留了对 sjh8130/bili_danmaku 的原始参考注释。
