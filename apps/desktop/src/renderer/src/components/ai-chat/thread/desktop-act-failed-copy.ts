/**
 * CU-P1-36：action_failed / 坐标硬拒的人话。只说失败并建议重看窗口，不附假观察。
 * 两条路径都只认合约码：`tool.result` 事件，或折叠后 ThreadToolCall.result。
 */
import {
  DESKTOP_ACT_ACTION_FAILED,
  DESKTOP_ACT_BARE_COORDS_DISABLED,
  readDesktopActBareCoordsDeniedCode
} from "@enjoy-agents/ipc-contract/desktop-act-codes"
import type { TranslateFn } from "@renderer/i18n"

export type DesktopActFailureKind =
  | typeof DESKTOP_ACT_ACTION_FAILED
  | typeof DESKTOP_ACT_BARE_COORDS_DISABLED

export function desktopActFailureKind(value: unknown): DesktopActFailureKind | null {
  if (readDesktopActBareCoordsDeniedCode(value) === DESKTOP_ACT_BARE_COORDS_DISABLED) {
    return DESKTOP_ACT_BARE_COORDS_DISABLED
  }
  if (hasFailureCode(value, DESKTOP_ACT_ACTION_FAILED)) return DESKTOP_ACT_ACTION_FAILED
  return null
}

export function desktopActFailedCopy(
  kind: DesktopActFailureKind,
  t: TranslateFn
): { title: string; body: string } {
  if (kind === DESKTOP_ACT_BARE_COORDS_DISABLED) {
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

function hasFailureCode(value: unknown, code: string): boolean {
  const row = asRecord(value)
  if (row.code === code) return true
  return asRecord(row.result).code === code
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
