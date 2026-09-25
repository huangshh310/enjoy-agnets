/**
 * 从 approval.required.args 抽出桌面名片字段。无 appKey 或 bypass 时不提供会话放行。
 */
import {
  desktopActAlwaysAsks,
  desktopActAppKey,
  desktopActApprovalText,
  desktopActBypassesSessionAllow
} from "@enjoy-agents/agent-core/computer-use"

export type DesktopApprovalView = {
  appName: string
  appKey: string
  appKeySource: string
  controlName: string
  summary: string
  thumbnail: string
  bypassesSessionAllow: boolean
  canSessionAllow: boolean
}

export function desktopApprovalView(args: unknown): DesktopApprovalView {
  const row = asRecord(args)
  const appName = text(row.appName) || "应用"
  const appKey = desktopActAppKey(row)
  const controlName = text(row.elementName) || text(row.elementId) || (typeof row.x === "number" ? "坐标" : "目标")
  const bypassesSessionAllow = row.bypassesSessionAllow === true || desktopActBypassesSessionAllow(row)
  return {
    appName,
    appKey,
    appKeySource: text(row.appKeySource),
    controlName,
    summary: desktopActApprovalText(row),
    thumbnail: text(row.thumbnailDataUrl),
    bypassesSessionAllow,
    canSessionAllow: Boolean(appKey) && !bypassesSessionAllow && !desktopActAlwaysAsks(row)
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
