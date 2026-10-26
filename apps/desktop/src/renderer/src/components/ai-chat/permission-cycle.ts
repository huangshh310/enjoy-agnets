/**
 * chat.permission.cycle 切审批档的判定（默认无快捷键；用户在设置绑定后仍走这里）。
 * 只在焦点在 Composer 且为空时切；有字让出焦点；
 * 焦点不在 Composer（浮层、弹窗、菜单、其它输入框、终端）一律不切，让 Shift+Tab 做焦点后退（luna #154 / #173）。
 */
export function shouldCyclePermissionOnShiftTab(input: {
  /** 焦点就在 [data-testid="composer-input"] 上（不是附件 / Chip / 模型 / 盾牌按钮；leo #154 B2）。 */
  composerFocus: boolean
  /** 文字为空。 */
  composerEmpty: boolean
  /** 草稿里有附件、上下文 / 引用 / 技能 Chip：不算空（leo #154 B2）。 */
  hasExtras?: boolean
  /** 输入法组字中不响应（leo #154 S1）。 */
  composing?: boolean
  terminalFocus: boolean
  inputFocus?: boolean
}): boolean {
  if (input.terminalFocus || input.composing) return false
  if (!input.composerFocus) return false
  return input.composerEmpty && !input.hasExtras
}

/** 焦点元素是不是 Composer 输入框本身。 */
export function isComposerInputElement(el: { getAttribute?: (name: string) => string | null } | null): boolean {
  return el?.getAttribute?.("data-testid") === "composer-input"
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

/** 快捷键切档写入失败的提示（leo #154 B1）。 */
export function permissionCycleFailedMessage(t: (key: "chat.permissionCycleFailed") => string): string {
  return t("chat.permissionCycleFailed")
}

/**
 * 先写入、成功后再提示；失败提示没切成、不改本地状态（leo #154 B1）。
 * 返回值供测试：ok / failed。
 */
export async function runPermissionCycle(
  persist: () => Promise<void>,
  notify: { ok: () => void; failed: () => void }
): Promise<"ok" | "failed"> {
  try {
    await persist()
  } catch {
    notify.failed()
    return "failed"
  }
  notify.ok()
  return "ok"
}
