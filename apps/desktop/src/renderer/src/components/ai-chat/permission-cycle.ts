/**
 * Shift+Tab 切审批档的判定：只在焦点在 Composer 且为空时切；有字让出焦点；
 * 焦点不在 Composer（浮层、弹窗、菜单、其它输入框、终端）一律不切，让 Shift+Tab 做焦点后退（luna #154）。
 */
export function shouldCyclePermissionOnShiftTab(input: {
  composerEmpty: boolean
  composerFocus: boolean
  inputFocus: boolean
  terminalFocus: boolean
}): boolean {
  if (input.terminalFocus) return false
  if (input.composerFocus) return input.composerEmpty
  return false
}

export function composerInputEmpty(
  root: { querySelector: (sel: string) => unknown } | null,
  storeComposer = ""
): boolean {
  const el = root?.querySelector('[data-testid="composer-input"]')
  if (el && typeof el === "object" && "value" in el) {
    return !String((el as { value: unknown }).value ?? "").trim()
  }
  return !storeComposer.trim()
}

/** 快捷键切档后的提示文案（luna #154：别静默改权限）。 */
export function permissionCycledMessage(
  mode: "allow-reads" | "allow-edits" | "allow-all",
  t: (key: "chat.permissionCycled" | "chat.approvalReads" | "chat.approvalEdits" | "chat.approvalAll", vars?: Record<string, string>) => string
): string {
  const label =
    mode === "allow-edits" ? t("chat.approvalEdits") : mode === "allow-all" ? t("chat.approvalAll") : t("chat.approvalReads")
  return t("chat.permissionCycled", { mode: label })
}
