/**
 * 把当前会话的排队项画在时间线末尾。
 * 有审批卡时（placement="dock"）：消息区只剩一条缝，排在时间线末尾的排队卡会被滚到页头下面、按钮被挡或点偏到审批卡上
 * （pr136-gate3 / pr157-gate-52、53）。这时改画在审批卡正上方、不随消息滚动的紧凑行里，时间线里不再重复画。
 */
import { useEffect, useState } from "react"
import { listFollowups, subscribeFollowups, type FollowupItem } from "@renderer/hooks/followup-queue"
import { useChatStore } from "@renderer/stores/chat-store"
import { QueuedUserTurn } from "./turns/queued-user-turn"

export function QueuedFollowups({ placement = "thread" }: { placement?: "thread" | "dock" }) {
  const sessionId = useChatStore((state) => state.sessionId)
  const approvalPending = useChatStore((state) => state.pendingApproval != null)
  const [items, setItems] = useState<FollowupItem[]>(() => listFollowups(sessionId))

  useEffect(() => {
    setItems(listFollowups(sessionId))
    return subscribeFollowups(() => setItems(listFollowups(sessionId)))
  }, [sessionId])

  if (items.length === 0) return null
  if (shouldDockQueuedFollowups(approvalPending) !== (placement === "dock")) return null

  if (placement === "dock") {
    return (
      <div
        id="queued-followups"
        data-testid="queued-followups-docked"
        // 不随消息滚动、不被审批卡挤掉：shrink-0；多条时自己滚，最多约两行高。
        className="mx-6 flex max-h-[4.75rem] shrink-0 flex-col gap-1 overflow-y-auto py-1 [scrollbar-width:none]"
      >
        {items.map((item, index) => (
          <QueuedUserTurn
            key={item.id}
            item={item}
            canMoveUp={index > 0}
            canMoveDown={index < items.length - 1}
            compact
          />
        ))}
      </div>
    )
  }

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

/** 有审批卡时排队项挂到审批卡上方（不在时间线里）。 */
export function shouldDockQueuedFollowups(approvalPending: boolean): boolean {
  return approvalPending
}
