import type { ComponentType, ImgHTMLAttributes } from "react";

export interface DanmakuImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  persistent?: boolean;
}

export type DanmakuImageComponent = ComponentType<DanmakuImageProps>;

export type ResolveImageUrl = (url: string) => string;

export interface DanmakuImageOptions {
  imageComponent?: DanmakuImageComponent;
  resolveImageUrl?: ResolveImageUrl;
}

/** 默认使用浏览器图片元素，应用可注入缓存或代理实现。 */
export function DanmakuImage({ persistent: _persistent, alt, ...props }: DanmakuImageProps) {
  return <img alt={alt} {...props} />;
}
