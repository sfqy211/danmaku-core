//! 桌面应用与服务端共享的弹幕核心库。
//!
//! [`message`] 定义事件的 Serde 契约，[`protocol`] 提供 Bilibili 二进制封包、
//! 解包和命令解析。消息时间统一为 Unix 秒，连接管理和事件分发由调用方负责。

pub mod message;
mod pb;
pub mod protocol;

pub use message::{DanmakuEvent, Medal};
