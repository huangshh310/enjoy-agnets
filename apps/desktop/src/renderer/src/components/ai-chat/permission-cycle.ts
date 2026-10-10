/**
 * Shift+Tab 切审批档的判定：空 Composer 切；有字让出焦点；其它输入框 / 终端不切。
 */
export function shouldCyclePermissionOnShiftTab(input: {
  composerEmpty: boolean
  composerFocus: boolean
  inputFocus: boolean
  terminalFocus: boolean
}): boolean {
  if (input.terminalFocus) return false
  if (input.composerFocus) return input.composerEmpty
  return !input.inputFocus
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
