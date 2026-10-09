/**
 * CU-P1-36：action_failed / 裸坐标硬拒的人话。只说失败并建议重拍，不附假观察。
 * 码字符串与 agent-core desktop-act-honesty 对齐，renderer 不回源名单。
 */
import type { TranslateFn } from "@renderer/i18n"

export type DesktopActFailureKind = "action_failed" | "bare_coords_disabled"

const ACTION_FAILED = "action_failed"
const BARE_COORDS_DISABLED = "bare_coords_disabled"

export function desktopActFailureKind(result: unknown): DesktopActFailureKind | null {
  const row = result && typeof result === "object" && !Array.isArray(result)
    ? (result as Record<string, unknown>)
    : {}
  if (row.code === ACTION_FAILED) return "action_failed"
  if (row.code === BARE_COORDS_DISABLED) return "bare_coords_disabled"
  return null
}

export function desktopActFailedCopy(
  kind: DesktopActFailureKind,
  t: TranslateFn
): { title: string; body: string; code: string } {
  if (kind === "bare_coords_disabled") {
    return {
      title: t("chat.desktopCoordsDisabledTitle"),
      body: t("chat.desktopCoordsDisabledBody"),
      code: BARE_COORDS_DISABLED
    }
  }
  return {
    title: t("chat.desktopActFailedTitle"),
    body: t("chat.desktopActFailedBody"),
    code: ACTION_FAILED
  }
}
