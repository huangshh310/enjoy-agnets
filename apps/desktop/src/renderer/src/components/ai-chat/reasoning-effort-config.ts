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
    themeColor: "var(--color-sky-400)",
    barGradient: "bg-linear-to-r from-accent-500 to-accent-500",
    glowClass: "shadow-[0_0_12px] shadow-sky-400/40",
    badgeClass: "bg-accent-500/10 text-accent-500 dark:text-accent-500 border-accent-500/20",
    activeBgClass: "bg-accent-500/10 text-accent-500 dark:text-accent-500 font-semibold border-accent-500/30",
    iconColorClass: "text-accent-500"
  },
  {
    value: "low",
    effortValue: "low",
    index: 1,
    label: "Low",
    shortLabel: "Fast",
    desc: "Fast & lightweight concise thinking",
    percentage: 34,
    themeColor: "var(--color-emerald-500)",
    barGradient: "bg-linear-to-r from-state-success-text to-chart-1",
    glowClass: "shadow-[0_0_12px] shadow-state-success-text/40",
    badgeClass: "bg-state-success-text/10 text-state-success-text dark:text-state-success-text border-state-success-text/20",
    activeBgClass: "bg-state-success-text/10 text-state-success-text dark:text-state-success-text font-semibold border-state-success-text/30",
    iconColorClass: "text-state-success-text"
  },
  {
    value: "medium",
    effortValue: "medium",
    index: 2,
    label: "Medium",
    shortLabel: "Balanced",
    desc: "Balanced thinking depth & speed",
    percentage: 56,
    themeColor: "var(--color-amber-500)",
    barGradient: "bg-linear-to-r from-status-yellow-text to-status-yellow-text",
    glowClass: "shadow-[0_0_12px] shadow-amber-400/40",
    badgeClass: "bg-status-yellow-background/10 text-status-yellow-text dark:text-status-yellow-text border-status-yellow-text/20",
    activeBgClass: "bg-status-yellow-background/10 text-status-yellow-text dark:text-status-yellow-text font-semibold border-status-yellow-text/30",
    iconColorClass: "text-status-yellow-text"
  },
  {
    value: "high",
    effortValue: "high",
    index: 3,
    label: "High",
    shortLabel: "Deep",
    desc: "Thorough multi-step deep reasoning",
    percentage: 78,
    themeColor: "var(--color-orange-500)",
    barGradient: "bg-linear-to-r from-status-yellow-text to-text-error-primary",
    glowClass: "shadow-[0_0_14px] shadow-orange-400/45",
    badgeClass: "bg-status-yellow-background/10 text-status-yellow-text dark:text-status-yellow-text border-status-yellow-text/20",
    activeBgClass: "bg-status-yellow-background/10 text-status-yellow-text dark:text-status-yellow-text font-semibold border-status-yellow-text/30",
    iconColorClass: "text-status-yellow-text"
  },
  {
    value: "xhigh",
    effortValue: "xhigh",
    index: 4,
    label: "Max",
    shortLabel: "Extreme",
    desc: "Exhaustive deep thinking for complex architectures",
    percentage: 100,
    themeColor: "var(--color-purple-500)",
    barGradient: "bg-linear-to-r from-chart-5 via-chart-5 to-accent-500",
    glowClass: "shadow-[0_0_16px] shadow-purple-400/50",
    badgeClass: "bg-chart-5/10 text-chart-5 dark:text-chart-5 border-chart-5/20",
    activeBgClass: "bg-chart-5/10 text-chart-5 dark:text-chart-5 font-semibold border-chart-5/30",
    iconColorClass: "text-chart-5"
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
