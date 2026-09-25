/**
 * CU-P1-R 二次确认卡视图：新旧对照、缺图诚实失败。
 * 不读文件系统；只吃 approval.required.args 里的 data URL。
 */
import { desktopActAppKey } from "@enjoy-agents/agent-core/computer-use"

export type DesktopSecondConfirmSide = {
  appName: string
  appKey: string
  control: string
  role: string
  observationId: string
  thumbnail: string
}

export type DesktopSecondConfirmView = {
  tone: "warn" | "danger"
  canConfirm: boolean
  missingThumb: boolean
  weakIdentity: boolean
  action: string
  screenshotCode: string
  appChanged: boolean
  controlChanged: boolean
  previous: DesktopSecondConfirmSide
  next: DesktopSecondConfirmSide
}

export function isDesktopSecondConfirm(args: unknown): boolean {
  const row = asRecord(args)
  return row.code === "needs_second_confirm" || row.needsSecondConfirm === true
}

export function desktopSecondConfirmView(args: unknown): DesktopSecondConfirmView {
  const row = asRecord(args)
  const previous = sideFrom(row, "previous")
  const next = sideFrom(row, "next")
  const missingThumb = !previous.thumbnail || !next.thumbnail
  const previousRole = text(row.previousElementRole)
  const previousName = text(row.previousElementName)
  return {
    tone: missingThumb ? "danger" : "warn",
    canConfirm: !missingThumb,
    missingThumb,
    weakIdentity: !previousRole && !previousName,
    action: text(row.action) || "click",
    screenshotCode: text(row.screenshotUnavailable) || (missingThumb ? "screenshot_unavailable" : ""),
    appChanged: Boolean(previous.appKey && next.appKey && previous.appKey !== next.appKey),
    controlChanged: Boolean(previous.control && next.control && previous.control !== next.control),
    previous,
    next
  }
}

function sideFrom(row: Record<string, unknown>, which: "previous" | "next"): DesktopSecondConfirmSide {
  if (which === "previous") {
    return {
      appName: text(row.previousAppName) || text(row.appName) || "应用",
      appKey: text(row.previousAppKey) || desktopActAppKey({ appKey: row.previousAppKey, appName: row.previousAppName }),
      control: controlLabel(row.previousElementName, row.previousElementRole, row.elementId),
      role: text(row.previousElementRole),
      observationId: text(row.previousObservationId),
      thumbnail: text(row.previousThumbnailDataUrl)
    }
  }
  return {
    appName: text(row.appName) || "应用",
    appKey: desktopActAppKey(row),
    control: controlLabel(row.elementName, row.elementRole, row.elementId) || "对不上",
    role: text(row.elementRole),
    observationId: text(row.observationId),
    thumbnail: text(row.thumbnailDataUrl)
  }
}

function controlLabel(name: unknown, role: unknown, elementId: unknown): string {
  const label = text(name)
  if (label) return label
  const roleText = text(role)
  if (roleText) return roleText
  return text(elementId)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

/** 观察号给人看：留头尾，中间省略。 */
export function shortObservationId(id: string): string {
  const trimmed = id.trim()
  if (trimmed.length <= 8) return trimmed || "—"
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-2)}`
}
