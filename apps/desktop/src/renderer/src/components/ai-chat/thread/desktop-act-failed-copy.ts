/**
 * CU-P1-36：action_failed / 坐标硬拒的人话。只说失败并建议重看窗口，不附假观察。
 * 两条路径都只认 `code`：执行面失败包，或 kai 审批层 denial 带同一码。
 */
import type { TranslateFn } from "@renderer/i18n"

export type DesktopActFailureKind = "action_failed" | "bare_coords_disabled"

const ACTION_FAILED = "action_failed"
const BARE_COORDS_DISABLED = "bare_coords_disabled"

export function desktopActFailureKind(result: unknown): DesktopActFailureKind | null {
  const row = result && typeof result === "object" && !Array.isArray(result)
    ? (result as Record<string, unknown>)
    : {}
  if (row.code === BARE_COORDS_DISABLED) return "bare_coords_disabled"
  if (row.code === ACTION_FAILED) return "action_failed"
  return null
}

export function desktopActFailedCopy(
  kind: DesktopActFailureKind,
  t: TranslateFn
): { title: string; body: string } {
  if (kind === "bare_coords_disabled") {
    return {
      title: t("chat.desktopCoordsDisabledTitle"),
      body: t("chat.desktopCoordsDisabledBody")
    }
  }
  return {
    title: t("chat.desktopActFailedTitle"),
    body: t("chat.desktopActFailedBody")
  }
}
