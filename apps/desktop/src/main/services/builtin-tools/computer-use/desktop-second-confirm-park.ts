/**
 * Dock 停靠：二次确认 UI 载荷、活泵 waiter、确认后剥 UI 字段。
 * 缩略图记忆 / 禁静默 click 仍走 kai 数据面 desktop-second-confirm.ts。
 */
import { DESKTOP_ACT_SECOND_CONFIRM, desktopActAppKey } from "@enjoy-agents/agent-core/computer-use"
import { attachDesktopApprovalThumbs, mergeSecondConfirmApprovalArgs } from "./desktop-second-confirm.ts"

export type SecondConfirmDecision = "allow" | "deny" | "allow_session" | "allow_always"

type SecondConfirmWaiter = (args: Record<string, unknown>) => Promise<SecondConfirmDecision>

let waiter: SecondConfirmWaiter | null = null

/** 活泵（含子 Agent）期间挂上；泵结束必须解绑，避免跨 run 串卡。 */
export function bindDesktopSecondConfirmWait(fn: SecondConfirmWaiter | null) {
  waiter = fn
}

export function hasDesktopSecondConfirmWait(): boolean {
  return waiter != null
}

export function waitDesktopSecondConfirm(args: Record<string, unknown>): Promise<SecondConfirmDecision> {
  if (!waiter) return Promise.resolve("deny")
  return waiter(args)
}

export function isDesktopSecondConfirmResult(result: Record<string, unknown> | null | undefined): boolean {
  return result?.code === DESKTOP_ACT_SECOND_CONFIRM
}

/** 原审批 args + 重拍失败载荷 → 二次确认卡 args。observationId 换成新号。 */
export function mergeSecondConfirmArgs(
  original: Record<string, unknown>,
  result: Record<string, unknown>
): Record<string, unknown> {
  const previousId = text(result.previousObservationId) || text(original.observationId)
  const nextId = text(result.observationId) || previousId
  return mergeSecondConfirmApprovalArgs({
    ...original,
    ...result,
    code: DESKTOP_ACT_SECOND_CONFIRM,
    needsSecondConfirm: true,
    observationId: nextId,
    previousObservationId: previousId,
    previousThumbnailPath: text(result.previousThumbnailPath) || text(original.thumbnailPath),
    thumbnailPath: text(result.thumbnailPath),
    previousAppName: text(result.previousAppName) || text(original.appName),
    appName: text(result.appName) || text(original.appName),
    previousAppKey: text(result.previousAppKey) || desktopActAppKey(original),
    appKey: text(result.appKey) || desktopActAppKey(result) || desktopActAppKey(original),
    action: text(result.action) || text(original.action) || "click",
    previousElementName: text(result.previousElementName) || text(original.elementName),
    elementName: text(result.elementName),
    previousElementRole: text(result.previousElementRole) || text(original.elementRole),
    elementRole: text(result.elementRole),
    // 二次确认不是 H2 会话放行；藏「本会话允许此应用」，也不写 #86 会话表。
    bypassesSessionAllow: true
  })
}

/** 读新旧缩略图 data URL。缺图不编造，UI 走诚实失败。 */
export async function enrichSecondConfirmApprovalArgs(
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { readThumbDataUrl } = await import("./desktop-thumbs.ts")
  const attached = await attachDesktopApprovalThumbs(args, readThumbDataUrl)
  const missing = !text(attached.previousThumbnailDataUrl) || !text(attached.thumbnailDataUrl)
  return {
    ...attached,
    ...(missing ? { screenshotUnavailable: "screenshot_unavailable" } : {})
  }
}

/** 确认后交给 resume：只留 act 入参，丢掉 UI / 旧观察号。 */
export function confirmActArgs(parked: Record<string, unknown>): Record<string, unknown> {
  return {
    ...parked,
    code: undefined,
    needsSecondConfirm: undefined,
    previousThumbnailDataUrl: undefined,
    thumbnailDataUrl: undefined,
    screenshotUnavailable: undefined,
    message: undefined,
    denied: undefined
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
