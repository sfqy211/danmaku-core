import type { Medal } from "./types.js";

/** 等级分档颜色映射（参考 danmu_vue 项目） */
const TIER_COLORS: Record<number, string> = {
  1: "#5963A5", // 1-10  蓝紫
  2: "#C474A4", // 11-20 粉紫
  3: "#4AB3E7", // 21-30 浅蓝
  4: "#5781E4", // 31-40 蓝
  5: "#A779E6", // 41-50 紫
  6: "#E05673", // 51-60 红
  7: "#F08632", // 60+   橙
};

const UNLIGHTED_COLOR = "#919298";

function getTierColor(level: number): string {
  if (level <= 10) return TIER_COLORS[1];
  if (level <= 20) return TIER_COLORS[2];
  if (level <= 30) return TIER_COLORS[3];
  if (level <= 40) return TIER_COLORS[4];
  if (level <= 50) return TIER_COLORS[5];
  if (level <= 60) return TIER_COLORS[6];
  return TIER_COLORS[7];
}

export interface MedalBadgeProps {
  medal: Medal;
  scale?: number;
}

/** 粉丝勋章沿用等级分档与未点亮配色。 */
export function MedalBadge({ medal, scale = 1 }: MedalBadgeProps) {
  const bgColor = medal.isLight ? getTierColor(medal.level) : UNLIGHTED_COLOR;

  return (
    <span
      className="danmaku-medal-badge"
      style={{
        backgroundColor: bgColor,
        color: "#fff",
        fontSize: Math.round(11 * scale),
        padding: `${1 * scale}px ${5 * scale}px`,
      }}
    >
      <span>{medal.name}</span>
      <span className="danmaku-medal-level">{medal.level}</span>
    </span>
  );
}
