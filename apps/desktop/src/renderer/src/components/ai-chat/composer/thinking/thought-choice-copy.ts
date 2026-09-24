/**
 * 把 CLI 官方思考档值翻成和 Enjoy 能量条同一套中文，写回仍用原值。
 */
import type { TranslateFn } from "@renderer/i18n"
import { EFFORT_LEVELS, type EffortMeta } from "../../reasoning-effort-config"

const COPY: Record<string, { label: string; short: string; desc: string }> = {
  minimal: { label: "chat.effortMinimal", short: "chat.effortMinimalShort", desc: "chat.effortMinimalDesc" },
  none: { label: "chat.effortNone", short: "chat.effortNoneShort", desc: "chat.effortNoneDesc" },
  low: { label: "chat.effortLow", short: "chat.effortLowShort", desc: "chat.effortLowDesc" },
  medium: { label: "chat.effortMedium", short: "chat.effortMediumShort", desc: "chat.effortMediumDesc" },
  high: { label: "chat.effortHigh", short: "chat.effortHighShort", desc: "chat.effortHighDesc" },
  xhigh: { label: "chat.effortExtra", short: "chat.effortExtraShort", desc: "chat.effortExtraDesc" },
  max: { label: "chat.effortMax", short: "chat.effortMaxShort", desc: "chat.effortMaxDesc" }
}

export function thoughtChoiceCopy(value: string, fallback: string, t: TranslateFn): { label: string; short: string; desc: string } {
  const key = COPY[value]
  if (!key) return { label: fallback, short: fallback, desc: "" }
  return { label: t(key.label), short: t(key.short), desc: t(key.desc) }
}

/** 按在整条里的位置取能量色，档数不必等于 Enjoy 五档。 */
export function thoughtToneAt(index: number, count: number): EffortMeta {
  if (count <= 1) return EFFORT_LEVELS[0]
  const scaled = Math.round((index / (count - 1)) * (EFFORT_LEVELS.length - 1))
  return EFFORT_LEVELS[Math.min(EFFORT_LEVELS.length - 1, Math.max(0, scaled))]
}
