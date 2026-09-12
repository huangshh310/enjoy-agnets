/**
 * 抽屉信任卡文案：健康四态 + 仅 quota=true 的本月用量。禁止假绿灯、假条。
 */
import type { AgentToolQuotaInfo } from "@enjoy-agents/ipc-contract"
import type { TrustHealthInput, TrustHealthView, TrustUsageInput, TrustUsageView } from "./drawer-trust.types"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const DOT = {
  pass: "bg-notification-success-foreground",
  fail: "bg-text-error-primary",
  idle: "bg-separator-border",
  checking: "animate-pulse bg-text-tertiary"
} as const

/**
 * 检测中压过旧结果，避免再跑时闪绿灯或「尚未」。
 */
export function resolveTrustHealth(input: TrustHealthInput): TrustHealthView {
  if (input.checking) {
    const label = input.t("settings.agentTools.trustDoctorChecking")
    return healthView("checking", label, DOT.checking, "text-text-tertiary", true)
  }
  if (!input.result) {
    const label = input.t("settings.agentTools.trustDoctorIdle")
    return healthView("idle", label, DOT.idle, "text-text-primary", false)
  }
  if (input.result.ok) return passHealth(input)
  return failHealth(input)
}

/**
 * 本月用量只在 quota=true 且有官方数字时出现；否则诚实空态，不画条。
 */
export function resolveTrustUsage(input: TrustUsageInput): TrustUsageView {
  const percent = input.quota ? pickOfficialMonthPercent(input.quotaInfo) : null
  if (!input.quota || percent == null) {
    return {
      kind: "empty",
      label: input.t("settings.agentTools.trustUsageNone"),
      showDetail: false
    }
  }
  const month = input.t("settings.agentTools.trustUsageMonth", { percent: Math.round(percent) })
  const resetAt = pickMonthlyResetAt(input.quotaInfo)
  const label = resetAt
    ? `${month} · ${input.t("settings.agentTools.trustUsageReset", { date: formatResetDate(resetAt) })}`
    : month
  return { kind: "monthly", label, showDetail: true }
}

export function formatDoctorRelative(
  ranAt: number,
  now: number,
  t: TrustHealthInput["t"]
): string {
  const delta = Math.max(0, now - ranAt)
  if (delta < MINUTE) return t("settings.agentTools.trustJustNow")
  if (delta < HOUR) {
    return t("settings.agentTools.trustMinutesAgo", { n: Math.max(1, Math.round(delta / MINUTE)) })
  }
  if (delta < DAY) {
    return t("settings.agentTools.trustHoursAgo", { n: Math.max(1, Math.round(delta / HOUR)) })
  }
  return t("settings.agentTools.trustDaysAgo", { n: Math.max(1, Math.round(delta / DAY)) })
}

/** 预览「重置 9/30」：本地月/日，不补零。 */
export function formatResetDate(resetAt: number): string {
  const date = new Date(resetAt)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

/** 优先月窗，其次顶层 usedPercent；无数返回 null，禁止回落 0。 */
export function pickOfficialMonthPercent(quota?: AgentToolQuotaInfo): number | null {
  const monthly = quota?.windows?.find((item) => item.windowType === "monthly")
  if (monthly && Number.isFinite(monthly.usedPercent)) return clampPercent(monthly.usedPercent)
  if (typeof quota?.usedPercent === "number" && Number.isFinite(quota.usedPercent)) {
    return clampPercent(quota.usedPercent)
  }
  const first = quota?.windows?.find((item) => Number.isFinite(item.usedPercent))
  return first ? clampPercent(first.usedPercent) : null
}

export function pickMonthlyResetAt(quota?: AgentToolQuotaInfo): number | null {
  const windows = quota?.windows ?? []
  const monthly = windows.find((item) => item.windowType === "monthly" && item.resetAt)
  if (monthly?.resetAt) return monthly.resetAt
  return windows.find((item) => item.resetAt)?.resetAt ?? null
}

/** 失败短因：超时 / 缺二进制可并列，不摊堆栈与 ACP 原文。 */
export function shortDoctorReason(raw: string, t: TrustHealthInput["t"]): string {
  const lower = raw.toLowerCase()
  const timeout = isDoctorTimeout(lower)
  const missing = isDoctorMissing(lower)
  if (timeout && missing) return t("settings.agentTools.trustDoctorFailTimeoutMissing")
  if (timeout) return t("settings.agentTools.trustDoctorFailTimeout")
  if (missing) return t("settings.agentTools.trustDoctorFailMissing")
  if (/login required|not logged|auth required|needs? login/.test(lower)) {
    return t("settings.agentTools.trustDoctorFailLogin")
  }
  if (/initialize failed|handshake failed|acp initialize failed/.test(lower)) {
    return t("settings.agentTools.trustDoctorFailHandshake")
  }
  return t("settings.agentTools.trustDoctorFailGeneric")
}

function passHealth(input: TrustHealthInput): TrustHealthView {
  const head = input.t("settings.agentTools.trustDoctorPass")
  const time = input.ranAt ? formatDoctorRelative(input.ranAt, input.now, input.t) : ""
  const label = time ? `${head} · ${time}` : head
  return healthView("pass", label, DOT.pass, "text-text-primary", false)
}

function failHealth(input: TrustHealthInput): TrustHealthView {
  const head = input.t("settings.agentTools.trustDoctorFail")
  const reason = shortDoctorReason(input.result?.message ?? "", input.t)
  const label = `${head} · ${reason}`
  return healthView("fail", label, DOT.fail, "text-text-error-primary", false)
}

function healthView(
  kind: TrustHealthView["kind"],
  label: string,
  dotClass: string,
  textClass: string,
  ctaDisabled: boolean
): TrustHealthView {
  return { kind, label, title: label, dotClass, textClass, ctaDisabled }
}

function isDoctorTimeout(lower: string): boolean {
  return /timed out|timeout|etimedout|handshake timeout/.test(lower)
}

function isDoctorMissing(lower: string): boolean {
  return /not found|enoent|not on path|ensure it is on path|path 上找不到|找不到二进制/.test(lower)
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}
