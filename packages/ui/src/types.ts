export interface Medal {
  name: string;
  level: number;
  /** 是否点亮（1=点亮, 0=熄灭） */
  isLight: number;
}

export type DanmakuMessageType =
  | "danmaku"
  | "gift"
  | "superChat"
  | "guard"
  | "entry"
  | "like"
  | "system"
  | "live"
  | "preparing";

export interface LikeCountUpdatePayload {
  roomId: number;
  clickCount: number;
}

export interface InlineEmoticon {
  count?: number;
  descript?: string;
  emoji?: string;
  emoticonId?: number;
  emoticonUnique?: string;
  height?: number;
  url: string;
  width?: number;
}

export interface BigEmoticonOptions {
  emoticonUnique: string;
  url: string;
  width: number;
  height: number;
  isDynamic?: number;
  bulgeDisplay?: number;
  inPlayerArea?: number;
}

export interface DanmakuMessage {
  id: string;
  roomId: number;
  type: DanmakuMessageType;
  username: string;
  content: string;
  /** 醒目留言的外文/机翻文案（message_jpn / message_trans），无翻译时为空 */
  contentTrans?: string;
  /** 消息时间，Unix **秒**（Rust 侧已把各命令不统一的毫秒/微秒归一化） */
  timestamp: number;
  avatar?: string;
  medal?: Medal;
  wealthLevel?: number;
  price?: number;
  giftName?: string;
  count?: number;
  uid?: number;
  color?: number;
  guardLevel?: number;
  isAdmin?: boolean;
  dmType?: number;
  backgroundColor?: string;
  backgroundBottomColor?: string;
  backgroundPriceColor?: string;
  messageFontColor?: string;
  backgroundImage?: string;
  emots?: Record<string, InlineEmoticon>;
  emoticonOptions?: BigEmoticonOptions;
  /** @回复的目标用户 UID */
  replyUid?: number;
  /** @回复的目标用户名 */
  replyUsername?: string;
  /** 高能榜排名（仅前 3 名） */
  contributionRank?: number;
  /**
   * 弹幕气泡渐变背景色，原始值使用 Android `#AARRGGBB` 顺序
   * （起始 / 结束 / 边框三档）。随 `DANMU_MSG` 的 `info[0][11]` 一起下发，
   * 无需额外请求；无气泡时缺省。
   */
  bubbleColor?: string;
}

export type EmoticonStyle = "hidden" | "text" | "image";

/** 金额档位配色：醒目留言与礼物共用金额六档，大航海按等级单独配色 */
export interface PriceColors {
  /** 醒目留言与礼物 ≤30 元 */
  scTier1: string;
  /** 醒目留言与礼物 31–50 元 */
  scTier2: string;
  /** 醒目留言与礼物 51–100 元 */
  scTier3: string;
  /** 醒目留言与礼物 101–500 元 */
  scTier4: string;
  /** 醒目留言与礼物 501–1000 元 */
  scTier5: string;
  /** 醒目留言与礼物 >1000 元 */
  scTier6: string;
  /** 总督 */
  guardGovernor: string;
  /** 提督 */
  guardAdmiral: string;
  /** 舰长 */
  guardCaptain: string;
}
