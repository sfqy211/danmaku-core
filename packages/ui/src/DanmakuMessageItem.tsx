import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  AtSign,
  Clock,
  Copy,
  ExternalLink,
  ShieldBan,
  User,
} from "lucide-react";
import { InlineEmotText, isEmoticonOnlyContent } from "./InlineEmotText.js";
import { MedalBadge } from "./MedalBadge.js";
import { DanmakuImage, type DanmakuImageOptions } from "./image.js";
import {
  formatDateTime,
  formatTimestamp,
  parseBubbleColor,
} from "./display.js";
import { formatMessagePrice, resolveMessageAccent } from "./price-chip.js";
import type { DanmakuMessage, EmoticonStyle, PriceColors } from "./types.js";

export interface DanmakuMessageAppearance {
  showMedal?: boolean;
  hideGloryLevel?: boolean;
  hideFanMedal?: boolean;
  hideAdminBadge?: boolean;
  hideUserIdColor?: boolean;
  hideUsername?: boolean;
  hideContributionRank?: boolean;
  hideBubbleColor?: boolean;
  emoticonStyle?: EmoticonStyle;
  plainPriceMessages?: boolean;
  priceColors?: Partial<PriceColors>;
}

export interface DanmakuMessageActions {
  onMention?: (username: string) => void;
  onBlockUser?: (uid: number, username: string) => void;
  onOpenUrl?: (url: string) => void | Promise<void>;
  onCopy?: (text: string) => void | Promise<void>;
}

export interface DanmakuMessageItemProps
  extends DanmakuImageOptions,
    DanmakuMessageActions {
  item: DanmakuMessage;
  fontSize?: number;
  cachedEmotUrls?: ReadonlySet<string>;
  appearance?: DanmakuMessageAppearance;
  /** 缺省时跟随调用方的 .dark 主题。 */
  theme?: "light" | "dark";
}

function getMessageTextClass(type: string): string {
  // 礼物/舰长文字本身不再整段染金色：金额在胶囊里，礼物名单独强调，
  // 通体金黄在深色弹幕窗里反而糊成一片。保留兜底给未预期的类型。
  if (type === "entry") {
    return "danmaku-body danmaku-body-entry";
  }

  return "danmaku-body";
}

function getGuardUsernameClass(guardLevel?: number): string {
  switch (guardLevel) {
    case 1: // 总督 Governor
      return "danmaku-username-governor";
    case 2: // 提督 Admiral
      return "danmaku-username-admiral";
    case 3: // 舰长 Captain
      return "danmaku-username-captain";
    default:
      return "danmaku-username-default";
  }
}

function getBigEmoticonSize(
  emoticon?: DanmakuMessage["emoticonOptions"],
  scale = 1,
) {
  const base = {
    width: Math.round(48 * scale),
    height: Math.round(48 * scale),
  };
  if (!emoticon) {
    return base;
  }

  if (emoticon.emoticonUnique?.startsWith("official_")) {
    return {
      width: Math.round(Math.min(emoticon.width ?? 48, 56) * scale),
      height: Math.round(Math.min(emoticon.height ?? 48, 56) * scale),
    };
  }

  return base;
}

function ContextMenu({
  item,
  x,
  y,
  onClose,
  onMention,
  onBlockUser,
  onOpenUrl,
  onCopy,
  theme,
}: {
  item: DanmakuMessage;
  x: number;
  y: number;
  onClose: (restoreFocus?: boolean) => void;
  theme?: "light" | "dark";
} & DanmakuMessageActions) {
  const menuNodeRef = useRef<HTMLDivElement | null>(null);

  // 定位、显示和聚焦在同一布局阶段完成。
  useLayoutEffect(() => {
    const node = menuNodeRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = document.documentElement.clientHeight || window.innerHeight;
    const margin = 8;

    // 水平：右侧空间不足则向左翻转
    let left = x;
    if (x + rect.width + margin > vw) {
      left = x - rect.width;
    }
    left = Math.max(margin, Math.min(left, vw - rect.width - margin));

    // 垂直：下方空间不足则向上翻转
    let top = y;
    if (y + rect.height + margin > vh) {
      top = y - rect.height;
    }
    top = Math.max(margin, Math.min(top, vh - rect.height - margin));

    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
    node.style.visibility = "visible";
    node
      .querySelector<HTMLButtonElement>('button[role="menuitem"]')
      ?.focus({ preventScroll: true });
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuNodeRef.current &&
        !menuNodeRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose(true);
        return;
      }
      if (event.key === "Tab") {
        onClose();
        return;
      }
      const menu = menuNodeRef.current;
      if (!menu?.contains(document.activeElement)) return;
      const buttons = Array.from(
        menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]'),
      );
      const current = buttons.findIndex(
        (button) => button === document.activeElement,
      );
      let next = current;
      switch (event.key) {
        case "ArrowDown":
          next = (current + 1) % buttons.length;
          break;
        case "ArrowUp":
          next = (current - 1 + buttons.length) % buttons.length;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = buttons.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      buttons[next]?.focus();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const copyToClipboard = useCallback(
    async (text: string) => {
      if (onCopy) {
        await onCopy(text);
        onClose();
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // fallback
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      onClose();
    },
    [onClose, onCopy],
  );

  const openHomepage = useCallback(() => {
    if (item.uid) {
      const url = `https://space.bilibili.com/${item.uid}`;
      if (onOpenUrl) void onOpenUrl(url);
      else window.open(url, "_blank", "noopener,noreferrer");
    }
    onClose();
  }, [item.uid, onClose, onOpenUrl]);

  const handleBlockUser = useCallback(() => {
    if (item.uid) onBlockUser?.(item.uid, item.username);
    onClose();
  }, [item.uid, item.username, onClose, onBlockUser]);

  const handleMention = useCallback(() => {
    if (onMention) {
      onMention(item.username);
    }
    onClose();
  }, [item.username, onMention, onClose]);

  return (
    <div
      data-interactive=""
      data-theme={theme}
      role="menu"
      aria-label="弹幕操作"
      ref={menuNodeRef}
      className="danmaku-context-menu"
      style={{ left: x, top: y, visibility: "hidden" }}
    >
      {onMention && item.type === "danmaku" && (
        <button
          type="button"
          role="menuitem"
          onClick={handleMention}
          className="danmaku-context-action"
        >
          <AtSign className="danmaku-context-icon" />
          <span className="danmaku-context-label">{item.username}</span>
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        onClick={() => void copyToClipboard(item.username)}
        className="danmaku-context-action"
      >
        <User className="danmaku-context-icon" />
        <span className="danmaku-context-label">复制昵称</span>
      </button>
      {item.content && (
        <button
          type="button"
          role="menuitem"
          onClick={() => void copyToClipboard(item.content)}
          className="danmaku-context-action"
        >
          <Copy className="danmaku-context-icon" />
          <span className="danmaku-context-label">复制内容</span>
        </button>
      )}
      {item.uid !== undefined && item.uid > 0 && (
        <>
          {onBlockUser && (
            <button
              type="button"
              role="menuitem"
              onClick={handleBlockUser}
              className="danmaku-context-action"
            >
              <ShieldBan className="danmaku-context-icon" />
              <span className="danmaku-context-label">屏蔽此用户</span>
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={openHomepage}
            className="danmaku-context-action"
          >
            <ExternalLink className="danmaku-context-icon" />
            <span className="danmaku-context-label">打开主页</span>
          </button>
        </>
      )}
      {/* 时间只在右键时展示：行内常驻时间会挤占窄弹幕窗的正文宽度 */}
      {item.timestamp > 0 && (
        <>
          <div className="danmaku-context-divider" />
          <div className="danmaku-context-time">
            <Clock className="danmaku-context-icon" />
            <span className="danmaku-time-value">
              {formatDateTime(item.timestamp)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// memo：分割栏拖动/新消息到达引发的重渲染中，props 未变的行直接跳过
export const DanmakuMessageItem = memo(function DanmakuMessageItem({
  item,
  fontSize = 14,
  cachedEmotUrls,
  onMention,
  onBlockUser,
  onOpenUrl,
  onCopy,
  appearance = {},
  theme,
  imageComponent: Image = DanmakuImage,
  resolveImageUrl,
}: DanmakuMessageItemProps) {
  const {
    showMedal = true,
    hideGloryLevel = false,
    hideFanMedal = false,
    hideAdminBadge = false,
    hideUserIdColor = false,
    hideUsername = false,
    hideContributionRank = false,
    emoticonStyle = "image",
    plainPriceMessages = false,
    hideBubbleColor = false,
    priceColors,
  } = appearance;
  const scale = fontSize / 14;
  const bigEmoticonSize =
    item.type === "danmaku" &&
    item.dmType === 1 &&
    item.emoticonOptions &&
    emoticonStyle === "image"
      ? getBigEmoticonSize(item.emoticonOptions, scale)
      : null;

  // 大表情是否在已加载的表情包中（优先本地缓存）
  const bigEmotPersistent =
    bigEmoticonSize && item.emoticonOptions?.url
      ? (cachedEmotUrls?.has(item.emoticonOptions.url) ?? false)
      : false;

  // 醒目留言/礼物/舰长共用一套金额胶囊与强调色，颜色来自外观设置里的档位配色；
  // 用户勾选「与普通弹幕一致」后去掉彩色胶囊与着色，金额仍以普通文字显示
  const accent = plainPriceMessages
    ? undefined
    : resolveMessageAccent(item, priceColors);
  const priceChip = formatMessagePrice(item);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const contentRef = useRef<HTMLSpanElement | null>(null);

  // 气泡聊天皮肤：颜色随 DANMU_MSG 的 info[0][11] 一起下发，只有普通文本弹幕参与
  // （礼物/SC/舰长已有自己的金额胶囊与强调色，再套气泡会打架）
  const bubble =
    item.type === "danmaku" && !accent && !hideBubbleColor
      ? parseBubbleColor(item.bubbleColor)
      : undefined;
  const bubbleStyle = bubble
    ? ({
        "--bubble-start": bubble.start,
        "--bubble-end": bubble.end,
        ...(bubble.border ? { "--bubble-border": bubble.border } : {}),
      } as CSSProperties)
    : undefined;
  // 气泡是深色渐变底，默认黑字正文会看不清；用户名/勋章保留各自的档位色，
  // 只有正文需要提亮，这里跟着正文一起切换

  const handleContextMenu = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);
  const closeContextMenu = useCallback((restoreFocus = false) => {
    setContextMenu(null);
    if (restoreFocus) contentRef.current?.focus();
  }, []);
  const handleContextKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLSpanElement>) => {
      if (
        event.key === "ContextMenu" ||
        (event.shiftKey && event.key === "F10") ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        const bounds = event.currentTarget.getBoundingClientRect();
        setContextMenu({ x: bounds.left, y: bounds.bottom });
      }
    },
    [],
  );

  // 表情弹幕在"不显示"模式下整条隐藏：大表情整条消息，
  // 以及去掉表情 token 后没有正文的纯小表情弹幕（否则会渲染成空行）
  if (
    emoticonStyle === "hidden" &&
    item.type === "danmaku" &&
    ((item.dmType === 1 && item.emoticonOptions) ||
      isEmoticonOnlyContent(item.content, item.emots))
  ) {
    return null;
  }

  // 开播/下播场次标记：文字与时间合成一行居中（开播红色、下播灰色），时间恒用中性灰。
  // 整行 pointer-events-none，让空白区域的 mousedown 穿透到滚动容器以支持拖动窗口。
  if (item.type === "live" || item.type === "preparing") {
    return (
      <div
        className="danmaku-message danmaku-system-message"
        data-theme={theme}
        style={{ fontSize: Math.round(12 * scale) }}
      >
        <span
          className={
            item.type === "live"
              ? "danmaku-system-live"
              : "danmaku-system-muted"
          }
        >
          {item.content}
        </span>
        <span className="danmaku-system-muted">
          {formatTimestamp(item.timestamp, true)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`danmaku-message${bubble ? " danmaku-message-bubble" : ""}`}
      data-theme={theme}
      style={{ fontSize, ...bubbleStyle }}
    >
      <span
        ref={contentRef}
        className="danmaku-message-content"
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={contextMenu !== null}
        onContextMenu={handleContextMenu}
        onKeyDown={handleContextKeyDown}
      >
        {item.contributionRank &&
        item.contributionRank <= 3 &&
        !hideContributionRank &&
        item.type !== "superChat" ? (
          <span
            className={`danmaku-contribution-rank danmaku-contribution-rank-${item.contributionRank}`}
            style={{
              fontSize: Math.round(11 * scale),
              height: Math.round(18 * scale),
              padding: `0 ${Math.round(4 * scale)}px`,
            }}
          >
            榜{item.contributionRank}
          </span>
        ) : null}
        {item.isAdmin && !hideAdminBadge ? (
          <span
            className="danmaku-admin-badge"
            style={{ fontSize: Math.round(10 * scale), lineHeight: 1 }}
          >
            房
          </span>
        ) : null}
        {item.wealthLevel && showMedal && !hideGloryLevel ? (
          <Image
            src={
              resolveImageUrl?.(`wealth-level://${item.wealthLevel}`) ??
              `wealth-level://${item.wealthLevel}`
            }
            alt={`荣耀等级 ${item.wealthLevel}`}
            persistent
            className="danmaku-wealth-image"
            style={{ height: Math.round(18 * scale) }}
          />
        ) : null}
        {/* 金额胶囊前置：醒目留言、礼物、舰长共用同一套视觉语言。
          关闭彩色样式后退化为普通文字金额，信息不丢、观感与普通弹幕一致 */}
        {priceChip && !plainPriceMessages ? (
          <span
            className="danmaku-price-chip"
            style={{ "--sc-accent": accent } as CSSProperties}
          >
            {priceChip}
          </span>
        ) : null}
        {priceChip && plainPriceMessages ? (
          <span className="danmaku-plain-price">{priceChip}</span>
        ) : null}
        {item.medal && showMedal && !hideFanMedal ? (
          <MedalBadge medal={item.medal} scale={scale} />
        ) : null}
        {item.type === "entry" ? (
          <span className="danmaku-entry-mark">↪</span>
        ) : null}
        {!hideUsername ? (
          <span
          className={`danmaku-username ${hideUserIdColor ? "danmaku-username-plain" : getGuardUsernameClass(item.guardLevel)}`}
          >
            {item.username}
          </span>
        ) : null}
        {item.replyUsername && (
          <span className="danmaku-reply">回复 @{item.replyUsername}</span>
        )}
        <span
          className={
            accent
              ? "danmaku-body danmaku-accent-text"
              : bubble
                ? "danmaku-body"
                : getMessageTextClass(item.type)
          }
          style={
            accent ? ({ "--sc-accent": accent } as CSSProperties) : undefined
          }
        >
          {item.type === "danmaku" &&
          item.dmType === 1 &&
          item.emoticonOptions &&
          bigEmoticonSize ? (
            <span className="danmaku-big-emoticon">
              <Image
                src={
                  resolveImageUrl?.(item.emoticonOptions.url) ??
                  item.emoticonOptions.url
                }
                alt={item.emoticonOptions.emoticonUnique}
                persistent={bigEmotPersistent}
                className="danmaku-big-emoticon-image"
                style={{
                  width: bigEmoticonSize.width,
                  height: bigEmoticonSize.height,
                }}
              />
            </span>
          ) : item.type === "danmaku" &&
            item.dmType === 1 &&
            item.emoticonOptions &&
            emoticonStyle === "text" ? (
            item.content
          ) : item.type === "danmaku" ? (
            <InlineEmotText
              content={item.content}
              emots={item.emots}
              cachedEmotUrls={cachedEmotUrls}
              emoticonStyle={emoticonStyle}
              imageComponent={Image}
              resolveImageUrl={resolveImageUrl}
            />
          ) : item.type === "gift" || item.type === "guard" ? (
            // 礼物/舰长：金额已在胶囊里，正文只留「名称 ×数量」，与 SC 的正文同位。
            // 舰长的档位名（舰长/提督/总督）本身已说明行为，不再加「开通了」这类动词。
            <>
              <span className="danmaku-gift-name">
                {item.giftName ?? item.content}
              </span>
              {item.count && item.count > 1 ? (
                <span className="danmaku-gift-count"> ×{item.count}</span>
              ) : null}
            </>
          ) : (
            <>
              {item.content}
              {item.type === "superChat" && item.contentTrans ? (
                <span className="danmaku-translation">
                  {" ／ "}
                  {item.contentTrans}
                </span>
              ) : null}
            </>
          )}
        </span>
      </span>
      {contextMenu &&
        createPortal(
          <ContextMenu
            item={item}
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={closeContextMenu}
            onMention={onMention}
            onBlockUser={onBlockUser}
            onOpenUrl={onOpenUrl}
            onCopy={onCopy}
            theme={theme}
          />,
          document.body,
        )}
    </div>
  );
});
