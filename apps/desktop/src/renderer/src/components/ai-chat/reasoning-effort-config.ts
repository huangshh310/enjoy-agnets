/**
 * 思考强度 / 推理模式 (Reasoning Effort) 的配置与能量色彩体系。
 */
import type { ReasoningEffort } from "@renderer/components/settings/providers/providers.types"
import type { TranslateFn } from "@renderer/i18n"


export type EffortLevel = "none" | "low" | "medium" | "high" | "xhigh"

export type EffortMeta = {
  value: EffortLevel
  effortValue: ReasoningEffort | undefined
  index: number
  label: string
  shortLabel: string
  desc: string
  percentage: number
  themeColor: string
  barGradient: string
  glowClass: string
  badgeClass: string
  activeBgClass: string
  iconColorClass: string
}

export const EFFORT_LEVELS: EffortMeta[] = [
  {
    value: "none",
    effortValue: undefined,
    index: 0,
    label: "Default",
    shortLabel: "Native",
    desc: "AI SDK provider-default, mapped per model",
    percentage: 12,
    themeColor: "#38bdf8",
    barGradient: "bg-linear-to-r from-sky-400 to-blue-500",
    glowClass: "shadow-[0_0_12px_rgba(56,189,248,0.4)]",
    badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    activeBgClass: "bg-sky-500/10 text-sky-600 dark:text-sky-300 font-semibold border-sky-500/30",
    iconColorClass: "text-sky-500"
  },
  {
    value: "low",
    effortValue: "low",
    index: 1,
    label: "Low",
    shortLabel: "Fast",
    desc: "Fast & lightweight concise thinking",
    percentage: 34,
    themeColor: "#10b981",
    barGradient: "bg-linear-to-r from-emerald-400 to-teal-500",
    glowClass: "shadow-[0_0_12px_rgba(16,185,129,0.4)]",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    activeBgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 font-semibold border-emerald-500/30",
    iconColorClass: "text-emerald-500"
  },
  {
    value: "medium",
    effortValue: "medium",
    index: 2,
    label: "Medium",
    shortLabel: "Balanced",
    desc: "Balanced thinking depth & speed",
    percentage: 56,
    themeColor: "#f59e0b",
    barGradient: "bg-linear-to-r from-amber-400 to-yellow-500",
    glowClass: "shadow-[0_0_12px_rgba(245,158,11,0.4)]",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    activeBgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-300 font-semibold border-amber-500/30",
    iconColorClass: "text-amber-500"
  },
  {
    value: "high",
    effortValue: "high",
    index: 3,
    label: "High",
    shortLabel: "Deep",
    desc: "Thorough multi-step deep reasoning",
    percentage: 78,
    themeColor: "#f97316",
    barGradient: "bg-linear-to-r from-orange-400 to-rose-500",
    glowClass: "shadow-[0_0_14px_rgba(249,115,22,0.45)]",
    badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    activeBgClass: "bg-orange-500/10 text-orange-600 dark:text-orange-300 font-semibold border-orange-500/30",
    iconColorClass: "text-orange-500"
  },
  {
    value: "xhigh",
    effortValue: "xhigh",
    index: 4,
    label: "Max",
    shortLabel: "Extreme",
    desc: "Exhaustive deep thinking for complex architectures",
    percentage: 100,
    themeColor: "#a855f7",
    barGradient: "bg-linear-to-r from-purple-500 via-fuchsia-500 to-indigo-500",
    glowClass: "shadow-[0_0_16px_rgba(168,85,247,0.5)]",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    activeBgClass: "bg-purple-500/10 text-purple-600 dark:text-purple-300 font-semibold border-purple-500/30",
    iconColorClass: "text-purple-500"
  }
]

const EFFORT_COPY: Record<EffortLevel, { label: string; short: string; desc: string }> = {
  none: { label: "chat.effortNone", short: "chat.effortNoneShort", desc: "chat.effortNoneDesc" },
  low: { label: "chat.effortLow", short: "chat.effortLowShort", desc: "chat.effortLowDesc" },
  medium: { label: "chat.effortMedium", short: "chat.effortMediumShort", desc: "chat.effortMediumDesc" },
  high: { label: "chat.effortHigh", short: "chat.effortHighShort", desc: "chat.effortHighDesc" },
  xhigh: { label: "chat.effortMax", short: "chat.effortMaxShort", desc: "chat.effortMaxDesc" }
}

export function getEffortLevels(t: TranslateFn): EffortMeta[] {
  return EFFORT_LEVELS.map((level) => {
    const copy = EFFORT_COPY[level.value]
    return { ...level, label: t(copy.label), shortLabel: t(copy.short), desc: t(copy.desc) }
  })
}

export function getEffortMeta(value: ReasoningEffort | "none" | undefined, t?: TranslateFn): EffortMeta {
  const levels = t ? getEffortLevels(t) : EFFORT_LEVELS
  const norm = value || "none"
  return levels.find((item) => item.value === norm) ?? levels[0]
}
