/**
 * 侧栏会话活动：订阅 Composer running + parks + Attention 槽。
 */
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import { useChatStore } from "@renderer/stores/chat-store"
import { sessionActivity, type SessionActivity } from "./session-activity"

export function useSessionActivity(sessionId: string): SessionActivity {
  const currentId = useChatStore((state) => state.sessionId)
  const running = useChatStore((state) => state.running)
  const parks = useAttentionStore((state) => state.parks)
  const items = useAttentionStore((state) => state.items)
  return sessionActivity({ sessionId, currentId, running, parks, items })
}
