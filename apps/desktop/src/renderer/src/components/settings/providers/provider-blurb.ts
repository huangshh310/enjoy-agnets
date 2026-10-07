/**
 * 预设卡片和抽屉副文案。按 kind 取 i18n，缺键时退回 preset 原文。
 */
import type { TranslateFn } from "@renderer/i18n"

/** 中文设置页不直接渲染 preset.description。 */
export function presetBlurb(kind: string, fallback: string, t: TranslateFn): string {
  const key = `settings.providers.blurb.${kind}`
  const text = t(key)
  return text === key ? fallback : text
}
