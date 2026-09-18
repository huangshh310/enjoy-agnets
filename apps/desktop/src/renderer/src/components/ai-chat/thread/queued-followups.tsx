/**
 * 把当前会话的排队项画在时间线末尾。
 */
import { useEffect, useState } from "react"
import { listFollowups, subscribeFollowups, type FollowupItem } from "@renderer/hooks/followup-queue"
import { useChatStore } from "@renderer/stores/chat-store"
import { QueuedUserTurn } from "./turns/queued-user-turn"

export function QueuedFollowups() {
  const sessionId = useChatStore((state) => state.sessionId)
  const [items, setItems] = useState<FollowupItem[]>(() => listFollowups(sessionId))

  useEffect(() => {
    return subscribeFollowups(() => setItems(listFollowups(sessionId)))
  }, [sessionId])

  if (items.length === 0) return null

  return (
    <div id="queued-followups" className="flex flex-col gap-4">
      {items.map((item, index) => (
        <QueuedUserTurn
          key={item.id}
          item={item}
          canMoveUp={index > 0}
          canMoveDown={index < items.length - 1}
        />
      ))}
    </div>
  )
}
