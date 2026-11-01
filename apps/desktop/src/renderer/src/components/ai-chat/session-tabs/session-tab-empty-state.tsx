/**
 * 0 标签空态文案（短锁 E）。主区问候改用此句。
 */
import { useT } from "@renderer/i18n"
import { useSessionTabsStore } from "@renderer/stores/session-tabs-store"
import { useChatStore } from "@renderer/stores/chat-store"

export function useSessionTabsEmptyCopy(): string | null {
  const tabCount = useSessionTabsStore((s) => s.tabIds.length)
  const sessionId = useChatStore((s) => s.sessionId)
  const t = useT()
  if (tabCount === 0 && !sessionId) return t("chat.sessionTabs.empty")
  return null
}
