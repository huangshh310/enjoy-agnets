/**
 * 从 approval.required.args 抽出桌面名片字段。缺 appKey 时不能提供会话放行。
 */
import { desktopActAppKey, desktopActApprovalText } from "@enjoy-agents/agent-core/computer-use"
import { asRecord } from "@renderer/lib/record"

export type DesktopApprovalView = {
  appName: string
  appKey: string
  controlName: string
  summary: string
  thumbnail: string
  canSessionAllow: boolean
}

export function desktopApprovalView(args: unknown): DesktopApprovalView {
  const row = asRecord(args)
  const appName = text(row.appName) || "应用"
  const appKey = desktopActAppKey(row)
  const controlName = text(row.elementName) || text(row.elementId) || (typeof row.x === "number" ? "坐标" : "目标")
  return {
    appName,
    appKey,
    controlName,
    summary: desktopActApprovalText(row),
    thumbnail: text(row.thumbnailDataUrl),
    canSessionAllow: Boolean(appKey)
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
