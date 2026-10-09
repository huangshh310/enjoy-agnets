/**
 * Enjoy 会话级 desktop_act 白名单：进程内 Map，按 sessionId。
 * 不落盘。删除 / 归档 / 显式撤销才清；切焦点、run 结束不清。
 */
import {
  DESKTOP_ACT_ANY_SESSION_KEY,
  DESKTOP_ACT_SESSION_PREFIX,
  desktopActAppKey,
  desktopActSessionKey
} from "./desktop-act-app-key.ts"

const conversationDesktopAllow = new Map<string, Set<string>>()

/** 只认 `desktop_act:<appKey>` 与 `desktop_act:*`。裸 `desktop_act` 与空 key 一律拒绝。 */
export function isConversationDesktopAllowKey(key: string): boolean {
  if (key === DESKTOP_ACT_ANY_SESSION_KEY) return true
  if (!key.startsWith(DESKTOP_ACT_SESSION_PREFIX)) return false
  return key.slice(DESKTOP_ACT_SESSION_PREFIX.length).length > 0
}

/** 复制一份给 ActiveRun。调用方可变副本，不得拿回内部 Set。 */
export function snapshotConversationDesktopAllow(sessionId: string): Set<string> {
  const current = conversationDesktopAllow.get(sessionId.trim())
  return current ? new Set(current) : new Set()
}

export function conversationHasAnyDesktop(sessionId: string): boolean {
  return snapshotConversationDesktopAllow(sessionId).has(DESKTOP_ACT_ANY_SESSION_KEY)
}

/** 写入会话表。非法 key（含裸 desktop_act）返回 false，不改表。 */
export function grantConversationDesktopAllow(sessionId: string, key: string): boolean {
  const sid = sessionId.trim()
  const allowKey = key.trim()
  if (!sid || !isConversationDesktopAllowKey(allowKey)) return false
  const next = conversationDesktopAllow.get(sid) ?? new Set<string>()
  next.add(allowKey)
  conversationDesktopAllow.set(sid, next)
  return true
}

/** 立刻摘掉该 key。没有该会话或没有该 key 也算成功。 */
export function revokeConversationDesktopAllow(sessionId: string, key: string): void {
  const sid = sessionId.trim()
  const allowKey = key.trim()
  const current = conversationDesktopAllow.get(sid)
  if (!current) return
  current.delete(allowKey)
  if (current.size === 0) conversationDesktopAllow.delete(sid)
}

export function setConversationAnyDesktop(sessionId: string, enabled: boolean): boolean {
  if (enabled) return grantConversationDesktopAllow(sessionId, DESKTOP_ACT_ANY_SESSION_KEY)
  revokeConversationDesktopAllow(sessionId, DESKTOP_ACT_ANY_SESSION_KEY)
  return true
}

/** 删除 / 归档该对话时整表丢掉。 */
export function clearConversationDesktopAllow(sessionId: string): void {
  conversationDesktopAllow.delete(sessionId.trim())
}

/** 进程退出时清全部。内存本就会没，测试与 will-quit 显式收口。 */
export function clearAllConversationDesktopAllows(): void {
  conversationDesktopAllow.clear()
}

/**
 * allow_session write-through：会话表 + 本轮 run 副本各写一次。
 * 无 appKey 不写白名单（只当一次允许）。
 */
export function writeThroughDesktopActSessionAllow(
  sessionId: string,
  runApprovedTools: Set<string>,
  args: unknown
): string | null {
  const key = desktopActSessionKey(desktopActAppKey(args))
  if (!key) return null
  if (!grantConversationDesktopAllow(sessionId, key)) return null
  runApprovedTools.add(key)
  return key
}

/** 用会话表覆盖 run 里的 desktop_act:* 键，其它工具白名单不动。 */
export function overlayConversationDesktopAllow(sessionId: string, runApprovedTools: Set<string>): void {
  // 边遍历边 delete，必须先快照一份；去掉展开会漏删剩余键。
  // eslint-disable-next-line unicorn/no-useless-spread
  for (const key of [...runApprovedTools]) {
    if (key === "desktop_act" || key.startsWith(DESKTOP_ACT_SESSION_PREFIX)) {
      runApprovedTools.delete(key)
    }
  }
  for (const key of snapshotConversationDesktopAllow(sessionId)) {
    runApprovedTools.add(key)
  }
}

/** 审批用：run 副本 ∪ 会话表。丢掉裸 desktop_act，不读任何全局偏好。 */
export function mergeConversationDesktopAllow(
  sessionId: string,
  runCopy?: ReadonlySet<string>
): Set<string> {
  const merged = new Set(runCopy)
  for (const key of snapshotConversationDesktopAllow(sessionId)) merged.add(key)
  merged.delete("desktop_act")
  return merged
}

/** 补跑闸：丢掉 desktop_act:*，按应用键留下。 */
export function stripAnyDesktopSessionAllow(tools: ReadonlySet<string>): Set<string> {
  const next = new Set(tools)
  next.delete(DESKTOP_ACT_ANY_SESSION_KEY)
  return next
}
