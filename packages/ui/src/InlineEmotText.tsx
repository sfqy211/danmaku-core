import type { ReactNode } from "react";
import { DanmakuImage, type DanmakuImageOptions } from "./image.js";
import type { EmoticonStyle, InlineEmoticon } from "./types.js";

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildEmotPattern(emots: Record<string, InlineEmoticon>): RegExp {
  const keys = [...Object.keys(emots)].sort((a, b) => b.length - a.length);
  return new RegExp(keys.map(escapeRegExp).join("|"), "g");
}

/** 去除表情 token 后正文是否为空（"不显示"模式下用于整条隐藏纯表情弹幕） */
export function isEmoticonOnlyContent(
  content: string,
  emots?: Record<string, InlineEmoticon>,
): boolean {
  if (!emots || Object.keys(emots).length === 0) {
    return false;
  }
  return content.replace(buildEmotPattern(emots), "").trim().length === 0;
}

export interface InlineEmotTextProps extends DanmakuImageOptions {
  content: string;
  emots?: Record<string, InlineEmoticon>;
  cachedEmotUrls?: ReadonlySet<string>;
  emoticonStyle?: EmoticonStyle;
}

export function InlineEmotText({
  content,
  emots,
  cachedEmotUrls,
  emoticonStyle = "image",
  imageComponent: Image = DanmakuImage,
  resolveImageUrl,
}: InlineEmotTextProps) {
  if (!emots || Object.keys(emots).length === 0) {
    return <>{content}</>;
  }

  const pattern = buildEmotPattern(emots);
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push(content.slice(lastIndex, index));
    }

    const token = match[0];
    const emot = emots[token];

    if (emoticonStyle === "hidden") {
      // 不显示：跳过表情 token
    } else if (emoticonStyle === "text" || !emot?.url) {
      // 文字模式：显示原始 token 文本
      parts.push(emot?.emoji ?? token);
    } else {
      // 图片模式（默认），缓存标记始终按上游原始 URL 查询。
      const persistent = cachedEmotUrls?.has(emot.url) ?? false;
      parts.push(
        <Image
          key={`${token}-${index}`}
          src={resolveImageUrl?.(emot.url) ?? emot.url}
          alt={emot.emoji ?? token}
          title={emot.descript ?? token}
          persistent={persistent}
          className="danmaku-inline-emot"
          style={{ width: emot.width ?? 20, height: emot.height ?? 20 }}
        />,
      );
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <>{parts}</>;
}
