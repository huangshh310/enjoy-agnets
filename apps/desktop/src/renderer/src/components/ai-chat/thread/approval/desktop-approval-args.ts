/**
 * 从 approval.required.args 抽出桌面名片字段。无 appKey 或 bypass 时不提供会话放行。
 * 二次确认：previousThumbnailPath = 批准时，thumbnailPath = 重拍后；缺图则 thumbsReady=false。
 * 敏感只信 main 下发的 `sensitive`；缺省 / 非 false 当敏感。禁止再调 desktopActIsSensitive。
 */
import {
  desktopActAppKey,
  desktopActApprovalText,
  desktopActBypassesSessionAllow,
  isStableDesktopAppKey
} from "@enjoy-agents/agent-core/computer-use"

export type DesktopApprovalView = {
  appName: string
  appKey: string
  appKeySource: string
  controlName: string
  summary: string
  thumbnail: string
  previousThumbnail: string
  thumbnailPath: string
  previousThumbnailPath: string
  secondConfirm: boolean
  thumbsReady: boolean
  bypassesSessionAllow: boolean
  canSessionAllow: boolean
  /** 有稳 appKey、非二次确认、且 `sensitive === false` 才露出始终允许。 */
  canAlwaysAllow: boolean
  /** 主进程下发；缺省 / 非 false 当敏感（fail closed）。 */
  sensitive: boolean
}

export function desktopApprovalView(args: unknown): DesktopApprovalView {
  const row = asRecord(args)
  const appName = text(row.appName) || "应用"
  const appKey = desktopActAppKey(row)
  const controlName = text(row.elementName) || text(row.elementId) || (typeof row.x === "number" ? "坐标" : "目标")
  const bypassesSessionAllow = row.bypassesSessionAllow === true || desktopActBypassesSessionAllow(row)
  const thumbnail = text(row.thumbnailDataUrl)
  const previousThumbnail = text(row.previousThumbnailDataUrl)
  const thumbnailPath = text(row.thumbnailPath)
  const previousThumbnailPath = text(row.previousThumbnailPath)
  const secondConfirm = isSecondConfirm(row, previousThumbnail, previousThumbnailPath)
  const sensitive = row.sensitive !== false
  return {
    appName,
    appKey,
    appKeySource: text(row.appKeySource),
    controlName,
    summary: desktopActApprovalText(row),
    thumbnail,
    previousThumbnail,
    thumbnailPath,
    previousThumbnailPath,
    secondConfirm,
    thumbsReady: !secondConfirm || Boolean(thumbnail && previousThumbnail),
    bypassesSessionAllow,
    sensitive,
    canSessionAllow:
      Boolean(appKey) &&
      !bypassesSessionAllow &&
      !desktopActBypassesSessionAllow(row) &&
      row.sensitive === false,
    canAlwaysAllow: !secondConfirm && isStableDesktopAppKey(appKey) && row.sensitive === false
  }
}

function isSecondConfirm(
  row: Record<string, unknown>,
  previousThumbnail: string,
  previousThumbnailPath: string
): boolean {
  return (
    row.needsSecondConfirm === true ||
    row.code === "needs_second_confirm" ||
    Boolean(previousThumbnail) ||
    Boolean(previousThumbnailPath)
  )
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
