/**
 * P2 Remote soft：边界卡折叠态 local preference。
 * 默认展开；记住折叠，不可永久 dismiss。
 */
export const REMOTE_SOFT_CARD_COLLAPSED_KEY = "enjoy.remoteSoftCardCollapsed"

export function readRemoteSoftCardCollapsed(
  storage: Pick<Storage, "getItem"> | null | undefined = globalThis.localStorage
): boolean {
  try {
    if (!storage) return false
    return storage.getItem(REMOTE_SOFT_CARD_COLLAPSED_KEY) === "1"
  } catch {
    return false
  }
}

export function writeRemoteSoftCardCollapsed(
  collapsed: boolean,
  storage: Pick<Storage, "setItem"> | null | undefined = globalThis.localStorage
): void {
  try {
    if (!storage) return
    storage.setItem(REMOTE_SOFT_CARD_COLLAPSED_KEY, collapsed ? "1" : "0")
  } catch {
    // 存不了就只在本次生效。
  }
}
